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
import { PolicyStatement } from "@aws-cdk/aws-iam";
import { BlockPublicAccess, Bucket, BucketEncryption } from "@aws-cdk/aws-s3";
import {
  Construct,
  RemovalPolicy,
  SecretValue,
  Stack,
  StackProps,
} from "@aws-cdk/core";
import { CfnParametersCode } from "@aws-cdk/aws-lambda";

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
      branch: "master",
      trigger: GitHubTrigger.WEBHOOK,
    });

    const infrastructureBuild = new PipelineProject(
      this,
      "InfrastructureBuild",
      {
        buildSpec: BuildSpec.fromObject({
          version: "0.2",
          artifacts: {
            "secondary-artifacts": {
              InfrastructureBuildOutput: {
                "base-directory": "./cloud-infrastructure/cdk.out",
                files: ["InfrastructureStack.template.json"],
              },
              DepsLayer: {
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
                `GITHUB_SHA=${process.env.GITHUB_SHA} yarn --cwd cloud-infrastructure synth`,
                "yarn layer:dependency",
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

    const dependencyLayerBuildOutput = new Artifact("DepsLayer");

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
            ECLBO: {
              "base-directory": "./eventbridge-consumer/bin",
              files: ["consumer.js"],
            },
            EPLBO: {
              "base-directory": "./eventbridge-producer/bin",
              files: ["producer.js"],
            },
            ESLBO: {
              "base-directory": "./eventbridge-s3/bin",
              files: ["consumer.js"],
            },
            SALBO: {
              "base-directory": "./slack-alerting/bin",
              files: ["alerting.js"],
            },
          },
        },
        phases: {
          install: {
            commands: ["npm install --global yarn", "yarn install"],
          },
          build: {
            commands: ["yarn build"],
          },
        },
      }),
      environment: {
        buildImage: LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1,
      },
    });

    const eventbridgeConsumerLambdaBuildOutput = new Artifact("ECLBO");

    const eventbridgeProducerLambdaBuildOutput = new Artifact("EPLBO");

    const eventbridgeS3LambdaBuildOutput = new Artifact("ESLBO");

    const slackAlertingLambdaBuildOutput = new Artifact("SALBO");

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
              commands: `GITHUB_SHA=${process.env.GITHUB_SHA} yarn test`,
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
          `arn:aws:lambda:eu-west-2:614517326458:function:EventBridgeConsumer-Production`,
          `arn:aws:lambda:eu-west-2:614517326458:function:EventBridgeProducer-Production`,
          `arn:aws:lambda:eu-west-2:614517326458:function:EventBridgeS3-Production`,
          `arn:aws:lambda:eu-west-2:614517326458:function:SlackAlerting-Production`,
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
          "InfrastructureStack.template.json"
        ),
        stackName: "InfrastructureStack",
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
        replaceOnFailure: true,
      }
    );

    const deployStaticAppAction = new S3DeployAction({
      actionName: "Static_App_Deploy",
      bucket: Bucket.fromBucketName(
        this,
        "StaticAppSource",
        "static-app-production"
      ),
      input: staticAppBuildOutput,
      runOrder: 2,
    });

    const pipelineName = "DeploymentPipeline-Production";

    const deploymentPipelineArtifactBucket = new Bucket(this, pipelineName, {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      bucketName: pipelineName.toLowerCase(),
      encryption: BucketEncryption.KMS_MANAGED,
      removalPolicy: RemovalPolicy.DESTROY,
    });

    new Pipeline(this, "ProductionDeploymentPipeline", {
      artifactBucket: deploymentPipelineArtifactBucket,
      pipelineName: pipelineName,
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
    });
  }
}
