import {
  BuildSpec,
  LinuxBuildImage,
  PipelineProject
} from "@aws-cdk/aws-codebuild";
import { Artifact, Pipeline } from "@aws-cdk/aws-codepipeline";
import {
  CloudFormationCreateUpdateStackAction,
  CodeBuildAction,
  CodeBuildActionType,
  GitHubSourceAction,
  GitHubTrigger,
  S3DeployAction
} from "@aws-cdk/aws-codepipeline-actions";
import { Bucket, BucketEncryption } from "@aws-cdk/aws-s3";
import { Construct, SecretValue, Stack, StackProps } from "@aws-cdk/core";
import { CfnParametersCode } from "@aws-cdk/aws-lambda";

export interface PipelineStackProps extends StackProps {
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
      trigger: GitHubTrigger.WEBHOOK
    });

    const microserviceBuild = new PipelineProject(this, "MicroserviceBuild", {
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        artifacts: {
          "secondary-artifacts": {
            InfrastructureBuildOutput: {
              "base-directory": "./cloud-infrastructure/cdk.out",
              files: ["InfrastructureStack.template.json"]
            },
            ECLBO: {
              "base-directory": "./eventbridge-consumer/lib",
              files: ["consumer.js"]
            },
            EPLBO: {
              "base-directory": "./eventbridge-producer/lib",
              files: ["producer.js"]
            },
            ESLBO: {
              "base-directory": "./eventbridge-s3/lib",
              files: ["consumer.js"]
            },
            SALBO: {
              "base-directory": "./slack-alerting/lib",
              files: ["alerting.js"]
            }
          }
        },
        phases: {
          install: {
            commands: ["npm install --global yarn", "yarn install"]
          },
          build: {
            commands: ["yarn build", "yarn --cwd cloud-infrastructure synth"]
          }
        }
      }),
      environment: {
        buildImage: LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
      }
    });

    const infrastructureBuildOutput = new Artifact("InfrastructureBuildOutput");

    const eventbridgeConsumerLambdaBuildOutput = new Artifact("ECLBO");

    const eventbridgeProducerLambdaBuildOutput = new Artifact("EPLBO");

    const eventbridgeS3LambdaBuildOutput = new Artifact("ESLBO");

    const slackAlertingLambdaBuildOutput = new Artifact("SALBO");

    const microserviceBuildAction = new CodeBuildAction({
      actionName: "Microservice_Build",
      input: sourceOutput,
      outputs: [
        infrastructureBuildOutput,
        eventbridgeConsumerLambdaBuildOutput,
        eventbridgeProducerLambdaBuildOutput,
        eventbridgeS3LambdaBuildOutput,
        slackAlertingLambdaBuildOutput
      ],
      project: microserviceBuild
    });

    const staticAppBuild = new PipelineProject(this, "StaticAppBuild", {
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        artifacts: {
          "secondary-artifacts": {
            StaticAppBucket: {
              "base-directory": "./static-app/build",
              files: ["**/*"]
            }
          }
        },
        phases: {
          install: { commands: ["npm install --global yarn", "yarn install"] },
          build: {
            commands: ["yarn --cwd static-app build"]
          }
        }
      }),
      environment: {
        buildImage: LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
      }
    });

    const staticAppBuildOutput = new Artifact("StaticAppBucket");

    const staticAppBuildAction = new CodeBuildAction({
      actionName: "StaticApp_Build",
      input: sourceOutput,
      outputs: [staticAppBuildOutput],
      project: staticAppBuild
    });

    const workspaceTest = new PipelineProject(this, "WorkspaceTest", {
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: { commands: ["npm install --global yarn", "yarn install"] },
          build: { commands: "yarn test" }
        }
      }),
      environment: {
        buildImage: LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
      }
    });

    const testAction = new CodeBuildAction({
      actionName: "Workspace_Test",
      project: workspaceTest,
      input: sourceOutput,
      type: CodeBuildActionType.TEST
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
          )
        },
        extraInputs: [
          eventbridgeConsumerLambdaBuildOutput,
          eventbridgeProducerLambdaBuildOutput,
          eventbridgeS3LambdaBuildOutput,
          slackAlertingLambdaBuildOutput
        ]
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
      runOrder: 2
    });

    const pipelineName = "DeploymentPipeline-Production";

    const deploymentPipelineArtifactBucket = new Bucket(this, pipelineName, {
      bucketName: pipelineName.toLowerCase(),
      encryption: BucketEncryption.KMS_MANAGED
    });

    new Pipeline(this, "ProductionDeploymentPipeline", {
      artifactBucket: deploymentPipelineArtifactBucket,
      pipelineName: pipelineName,
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction]
        },
        {
          stageName: "Build",
          actions: [microserviceBuildAction, staticAppBuildAction]
        },
        {
          stageName: "Test",
          actions: [testAction]
        },
        {
          stageName: "Deploy",
          actions: [deployInfrastructureAction, deployStaticAppAction]
        }
      ]
    });
  }
}
