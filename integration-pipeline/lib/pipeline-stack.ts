import {
  BuildSpec,
  LinuxBuildImage,
  PipelineProject,
} from "@aws-cdk/aws-codebuild";
import { Artifact, Pipeline } from "@aws-cdk/aws-codepipeline";
import {
  CloudFormationCreateUpdateStackAction,
  CodeBuildAction,
  CodeBuildActionType,
  GitHubSourceAction,
  GitHubTrigger,
  S3DeployAction,
} from "@aws-cdk/aws-codepipeline-actions";
import { LambdaFunction } from "@aws-cdk/aws-events-targets";
import { PolicyStatement } from "@aws-cdk/aws-iam";
import {
  CfnParametersCode,
  Code,
  Function,
  Runtime,
} from "@aws-cdk/aws-lambda";
import { BlockPublicAccess, Bucket, BucketEncryption } from "@aws-cdk/aws-s3";
import { Secret } from "@aws-cdk/aws-secretsmanager";
import {
  Construct,
  RemovalPolicy,
  SecretValue,
  Stack,
  StackProps,
} from "@aws-cdk/core";

export interface PipelineStackProps extends StackProps {
  readonly dependencyLayerLambdaCode: CfnParametersCode;
  readonly eventbridgeConsumerLambdaCode: CfnParametersCode;
  readonly eventbridgeProducerLambdaCode: CfnParametersCode;
  readonly eventbridgeS3LambdaCode: CfnParametersCode;
  readonly slackAlertingLambdaCode: CfnParametersCode;
}

export class PipelineStack extends Stack {
  constructor(scope: Construct, id: string, props?: PipelineStackProps) {
    super(scope, id, props);

    const sourceOutput = new Artifact();

    const sourceOAuth = SecretValue.secretsManager("dev/Tread/GitHubToken");

    const sourceAction = new GitHubSourceAction({
      actionName: "GitHub_Source",
      owner: "lukehedger",
      repo: "infra-as-node",
      oauthToken: sourceOAuth,
      output: sourceOutput,
      branch: process.env.GITHUB_HEAD_REF,
      trigger: GitHubTrigger.WEBHOOK,
    });

    const infrastructureStackName = `InfrastructureStack-${process.env.GITHUB_PR_NUMBER}`;

    const infrastructureBuild = new PipelineProject(
      this,
      "InfrastructureeBuild",
      {
        buildSpec: BuildSpec.fromObject({
          version: "0.2",
          artifacts: {
            "secondary-artifacts": {
              InfrastructureBuildOutput: {
                "base-directory": "./cloud-infrastructure/cdk.out",
                files: [`${infrastructureStackName}.template.json`],
              },
              DL: {
                "base-directory": "./dependency-layer",
                files: ["**/*"],
              },
            },
          },
          phases: {
            install: {
              commands: ["npm install --global yarn", "yarn install"],
            },
            build: {
              commands: [
                "yarn --cwd cloud-infrastructure build",
                `GITHUB_PR_NUMBER=${process.env.GITHUB_PR_NUMBER} yarn --cwd cloud-infrastructure synth`,
                "yarn layer",
              ],
            },
          },
        }),
        environment: {
          buildImage: LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1,
        },
      }
    );

    const infrastructureBuildOutput = new Artifact("InfrastructureBuildOutput");

    const dependencyLayerBuildOutput = new Artifact("DL");

    const infrastructureBuildAction = new CodeBuildAction({
      actionName: "Infrastructure_Build",
      input: sourceOutput,
      outputs: [infrastructureBuildOutput, dependencyLayerBuildOutput],
      project: infrastructureBuild,
    });

    const microserviceBuild = new PipelineProject(this, "MicroserviceBuild", {
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        artifacts: {
          "secondary-artifacts": {
            EC: {
              "base-directory": "./eventbridge-consumer/bin",
              files: ["consumer.js"],
            },
            EP: {
              "base-directory": "./eventbridge-producer/bin",
              files: ["producer.js"],
            },
            ES: {
              "base-directory": "./eventbridge-s3/bin",
              files: ["consumer.js"],
            },
            SA: {
              "base-directory": "./slack-alerting/bin",
              files: ["alerting.js"],
            },
          },
        },
        phases: {
          install: { commands: ["npm install --global yarn", "yarn install"] },
          build: {
            commands: ["yarn build"],
          },
        },
      }),
      environment: {
        buildImage: LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1,
      },
    });

    const eventbridgeConsumerLambdaBuildOutput = new Artifact("EC");

    const eventbridgeProducerLambdaBuildOutput = new Artifact("EP");

    const eventbridgeS3LambdaBuildOutput = new Artifact("ES");

    const slackAlertingLambdaBuildOutput = new Artifact("SA");

    const microserviceBuildAction = new CodeBuildAction({
      actionName: "Microservice_Build",
      input: sourceOutput,
      outputs: [
        eventbridgeConsumerLambdaBuildOutput,
        eventbridgeProducerLambdaBuildOutput,
        eventbridgeS3LambdaBuildOutput,
        slackAlertingLambdaBuildOutput,
      ],
      project: microserviceBuild,
    });

    const staticAppBuild = new PipelineProject(this, "StaticAppBuild", {
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        artifacts: {
          "base-directory": "./static-app/build",
          files: ["**/*"],
          name: "StaticAppBucket",
        },
        phases: {
          install: { commands: ["npm install --global yarn", "yarn install"] },
          build: {
            commands: ["yarn --cwd static-app build"],
          },
        },
      }),
      environment: {
        buildImage: LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1,
      },
    });

    const staticAppBuildOutput = new Artifact("StaticAppBucket");

    const staticAppBuildAction = new CodeBuildAction({
      actionName: "StaticApp_Build",
      input: sourceOutput,
      outputs: [staticAppBuildOutput],
      project: staticAppBuild,
    });

    const workspaceIntegrationTest = new PipelineProject(
      this,
      "WorkspaceIntegrationTest",
      {
        buildSpec: BuildSpec.fromObject({
          version: "0.2",
          phases: {
            install: {
              commands: ["npm install --global yarn", "yarn install"],
            },
            build: {
              commands: `GITHUB_HEAD_REF=${process.env.GITHUB_HEAD_REF} GITHUB_PR_NUMBER=${process.env.GITHUB_PR_NUMBER} yarn test`,
            },
          },
        }),
        environment: {
          buildImage: LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1,
        },
      }
    );

    workspaceIntegrationTest.addToRolePolicy(
      new PolicyStatement({
        resources: [
          `arn:aws:lambda:eu-west-2:614517326458:function:EventBridgeConsumer-Integration-${process.env.GITHUB_PR_NUMBER}`,
          `arn:aws:lambda:eu-west-2:614517326458:function:EventBridgeProducer-Integration-${process.env.GITHUB_PR_NUMBER}`,
          `arn:aws:lambda:eu-west-2:614517326458:function:EventBridgeS3-Integration-${process.env.GITHUB_PR_NUMBER}`,
          `arn:aws:lambda:eu-west-2:614517326458:function:SlackAlerting-Integration-${process.env.GITHUB_PR_NUMBER}`,
        ],
        actions: ["lambda:InvokeFunction"],
      })
    );

    const integrationTestAction = new CodeBuildAction({
      actionName: "Workspace_Integration_Test",
      project: workspaceIntegrationTest,
      input: sourceOutput,
      type: CodeBuildActionType.TEST,
    });

    const deployInfrastructureAction = new CloudFormationCreateUpdateStackAction(
      {
        actionName: "Infrastructure_Deploy",
        templatePath: infrastructureBuildOutput.atPath(
          `${infrastructureStackName}.template.json`
        ),
        stackName: infrastructureStackName,
        adminPermissions: true,
        parameterOverrides: {
          ...props?.eventbridgeConsumerLambdaCode.assign(
            eventbridgeConsumerLambdaBuildOutput.s3Location
          ),
          ...props?.eventbridgeProducerLambdaCode.assign(
            eventbridgeProducerLambdaBuildOutput.s3Location
          ),
          ...props?.eventbridgeS3LambdaCode.assign(
            eventbridgeS3LambdaBuildOutput.s3Location
          ),
          ...props?.slackAlertingLambdaCode.assign(
            slackAlertingLambdaBuildOutput.s3Location
          ),
          ...props?.dependencyLayerLambdaCode.assign(
            dependencyLayerBuildOutput.s3Location
          ),
        },
        extraInputs: [
          eventbridgeConsumerLambdaBuildOutput,
          eventbridgeProducerLambdaBuildOutput,
          eventbridgeS3LambdaBuildOutput,
          slackAlertingLambdaBuildOutput,
          dependencyLayerBuildOutput,
        ],
      }
    );

    const deployStaticAppAction = new S3DeployAction({
      actionName: "Static_App_Deploy",
      bucket: Bucket.fromBucketName(
        this,
        "StaticAppSource",
        `static-app-${process.env.GITHUB_PR_NUMBER}`
      ),
      input: staticAppBuildOutput,
      runOrder: 2,
    });

    const pipelineName = `DeploymentPipeline-Integration-${process.env.GITHUB_PR_NUMBER}`;

    const deploymentPipelineArtifactBucket = new Bucket(this, pipelineName, {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      bucketName: pipelineName.toLowerCase(),
      encryption: BucketEncryption.KMS_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    const deploymentPipeline = new Pipeline(
      this,
      "IntegrationDeploymentPipeline",
      {
        pipelineName: pipelineName,
        artifactBucket: deploymentPipelineArtifactBucket,
        stages: [
          {
            stageName: "Source",
            actions: [sourceAction],
          },
          {
            stageName: "Build",
            actions: [
              infrastructureBuildAction,
              microserviceBuildAction,
              staticAppBuildAction,
            ],
          },
          {
            stageName: "Deploy",
            actions: [deployInfrastructureAction, deployStaticAppAction],
          },
          {
            stageName: "Test",
            actions: [integrationTestAction],
          },
        ],
      }
    );

    const pipelineStatusLambda = new Function(this, "PipelineStatusLambda", {
      code: Code.fromAsset("../pipeline-status/bin"),
      environment: {
        AWS_SECRETS_GITHUB: "dev/Tread/GitHubToken",
        GITHUB_HEAD_REF: process.env.GITHUB_HEAD_REF || "",
        GITHUB_PR_NUMBER: process.env.GITHUB_PR_NUMBER || "",
      },
      functionName: `PipelineStatus-Integration-${process.env.GITHUB_PR_NUMBER}`,
      handler: "status.handler",
      runtime: Runtime.NODEJS_12_X,
    });

    pipelineStatusLambda.addToRolePolicy(
      new PolicyStatement({
        resources: [deploymentPipeline.pipelineArn],
        actions: ["codepipeline:GetPipelineExecution"],
      })
    );

    const githubSecret = Secret.fromSecretArn(
      this,
      "GitHubTokenSecret",
      "arn:aws:secretsmanager:eu-west-2:614517326458:secret:dev/Tread/GitHubToken*"
    );

    githubSecret.grantRead(pipelineStatusLambda);

    deploymentPipeline.onStateChange("DeploymentPipelineStateChangeHandler", {
      target: new LambdaFunction(pipelineStatusLambda),
    });
  }
}
