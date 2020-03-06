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
import { LambdaFunction } from "@aws-cdk/aws-events-targets";
import { PolicyStatement } from "@aws-cdk/aws-iam";
import {
  CfnParametersCode,
  Code,
  Function,
  Runtime
} from "@aws-cdk/aws-lambda";
import { Secret } from "@aws-cdk/aws-secretsmanager";
import { Construct, SecretValue, Stack, StackProps } from "@aws-cdk/core";

export interface PipelineStackProps extends StackProps {
  readonly eventbridgeConsumerLambdaCode: CfnParametersCode;
  readonly eventbridgeProducerLambdaCode: CfnParametersCode;
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
      trigger: GitHubTrigger.WEBHOOK
    });

    const infrastructureStackName = `InfrastructureStack-${process.env.GITHUB_PR_NUMBER}`;

    const workspaceBuild = new PipelineProject(this, "WorkspaceBuild", {
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        artifacts: {
          "secondary-artifacts": {
            InfrastructureBuildOutput: {
              "base-directory": "./cloud-infrastructure/cdk.out",
              files: [`${infrastructureStackName}.template.json`]
            },
            ECLBO: {
              "base-directory": "./eventbridge-consumer/lib",
              files: ["consumer.js"]
            },
            EPLBO: {
              "base-directory": "./eventbridge-producer/lib",
              files: ["producer.js"]
            }
          }
        },
        phases: {
          install: { commands: ["npm install --global yarn", "yarn install"] },
          build: {
            commands: [
              "yarn build",
              `GITHUB_PR_NUMBER=${process.env.GITHUB_PR_NUMBER} yarn --cwd cloud-infrastructure synth`
            ]
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

    const buildAction = new CodeBuildAction({
      actionName: "Workspace_Build",
      input: sourceOutput,
      outputs: [
        infrastructureBuildOutput,
        eventbridgeConsumerLambdaBuildOutput,
        eventbridgeProducerLambdaBuildOutput
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
        )
      },
      extraInputs: [
        eventbridgeConsumerLambdaBuildOutput,
        eventbridgeProducerLambdaBuildOutput
      ]
    });

    const deploymentPipeline = new Pipeline(this, "Pipeline", {
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

    const pipelineStatusLambda = new Function(this, "PipelineStatusLambda", {
      code: Code.fromAsset("../pipeline-status/lib"),
      environment: {
        AWS_SECRETS_GITHUB: "dev/Tread/GitHubToken",
        GITHUB_HEAD_REF: process.env.GITHUB_HEAD_REF || "",
        GITHUB_PR_NUMBER: process.env.GITHUB_PR_NUMBER || ""
      },
      functionName: `PipelineStatus-Integration-${process.env.GITHUB_PR_NUMBER}`,
      handler: "status.handler",
      runtime: Runtime.NODEJS_12_X
    });

    pipelineStatusLambda.addToRolePolicy(
      new PolicyStatement({
        resources: [deploymentPipeline.pipelineArn],
        actions: ["codepipeline:GetPipelineExecution"]
      })
    );

    const githubSecret = Secret.fromSecretArn(
      this,
      "GitHubTokenSecret",
      "arn:aws:secretsmanager:eu-west-2:614517326458:secret:dev/Tread/GitHubToken*"
    );

    githubSecret.grantRead(pipelineStatusLambda);

    deploymentPipeline.onStateChange("DeploymentPipelineStateChangeHandler", {
      target: new LambdaFunction(pipelineStatusLambda)
    });
  }
}
