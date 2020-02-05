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
  GitHubTrigger
} from "@aws-cdk/aws-codepipeline-actions";
import { Construct, SecretValue, Stack, StackProps } from "@aws-cdk/core";
import { CfnParametersCode } from "@aws-cdk/aws-lambda";

export interface PipelineStackProps extends StackProps {
  readonly kinesisConsumerLambdaCode: CfnParametersCode;
  readonly kinesisProducerLambdaCode: CfnParametersCode;
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

    const workspaceBuild = new PipelineProject(this, "WorkspaceBuild", {
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        artifacts: {
          "secondary-artifacts": {
            InfrastructureBuildOutput: {
              "base-directory": "./infrastructure",
              files: ["cdk.out/InfrastructureStack.template.json"]
            },
            KCLBO: {
              "base-directory": "./kinesis-consumer/lib",
              files: ["consumer.js"]
            },
            KPLBO: {
              "base-directory": "./kinesis-producer/lib",
              files: ["producer.js"]
            }
          }
        },
        phases: {
          install: { commands: ["npm install --global yarn", "yarn install"] },
          build: { commands: "yarn build-infra" }
        }
      }),
      environment: {
        buildImage: LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
      }
    });

    const infrastructureBuildOutput = new Artifact("InfrastructureBuildOutput");

    const kinesisConsumerLambdaBuildOutput = new Artifact("KCLBO");

    const kinesisProducerLambdaBuildOutput = new Artifact("KPLBO");

    const buildAction = new CodeBuildAction({
      actionName: "Workspace_Build",
      input: sourceOutput,
      outputs: [
        infrastructureBuildOutput,
        kinesisConsumerLambdaBuildOutput,
        kinesisProducerLambdaBuildOutput
      ],
      project: workspaceBuild
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

    const deployAction = new CloudFormationCreateUpdateStackAction({
      actionName: "Infrastructure_Deploy",
      templatePath: infrastructureBuildOutput.atPath(
        "cdk.out/InfrastructureStack.template.json"
      ),
      stackName: "InfrastructureStack",
      adminPermissions: true,
      parameterOverrides: {
        ...props?.kinesisConsumerLambdaCode.assign(
          kinesisConsumerLambdaBuildOutput.s3Location
        ),
        ...props?.kinesisProducerLambdaCode.assign(
          kinesisProducerLambdaBuildOutput.s3Location
        )
      },
      extraInputs: [
        kinesisConsumerLambdaBuildOutput,
        kinesisProducerLambdaBuildOutput
      ]
    });

    new Pipeline(this, "Pipeline", {
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction]
        },
        {
          stageName: "Build",
          actions: [buildAction]
        },
        {
          stageName: "Test",
          actions: [testAction]
        },
        {
          stageName: "Deploy",
          actions: [deployAction]
        }
      ]
    });
  }
}
