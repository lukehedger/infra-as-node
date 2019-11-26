import {
  BuildSpec,
  LinuxBuildImage,
  PipelineProject
} from "@aws-cdk/aws-codebuild";
import { Artifact, Pipeline } from "@aws-cdk/aws-codepipeline";
import {
  CloudFormationCreateUpdateStackAction,
  CodeBuildAction,
  GitHubSourceAction,
  GitHubTrigger
} from "@aws-cdk/aws-codepipeline-actions";
import { Construct, SecretValue, Stack, StackProps } from "@aws-cdk/core";
import { CfnParametersCode } from "@aws-cdk/aws-lambda";

export interface PipelineStackProps extends StackProps {
  readonly lambdaCode: CfnParametersCode;
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

    const cdkBuild = new PipelineProject(this, "CdkBuild", {
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            commands: "npm install --prefix pipeline"
          },
          build: {
            commands: [
              "npm run build --prefix pipeline",
              "npm run synth --prefix pipeline"
            ]
          }
        },
        artifacts: {
          "base-directory": "cdk.out",
          files: ["InfrastructureStack.template.json"]
        }
      }),
      environment: {
        buildImage: LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
      }
    });

    const cdkBuildOutput = new Artifact("CdkBuildOutput");

    const lambdaBuild = new PipelineProject(this, "LambdaBuild", {
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: {
            commands: "npm install --prefix lambda"
          },
          build: {
            commands: "npm run build --prefix lambda"
          }
        },
        artifacts: {
          "base-directory": "./lambda",
          files: ["lib/ping.js", "node_modules/**/*"]
        }
      }),
      environment: {
        buildImage: LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
      }
    });

    const lambdaBuildOutput = new Artifact("LambdaBuildOutput");

    const parameterOverrides = props
      ? props.lambdaCode.assign(lambdaBuildOutput.s3Location)
      : {};

    new Pipeline(this, "Pipeline", {
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction]
        },
        {
          stageName: "Build",
          actions: [
            new CodeBuildAction({
              actionName: "Lambda_Build",
              project: lambdaBuild,
              input: sourceOutput,
              outputs: [lambdaBuildOutput]
            }),
            new CodeBuildAction({
              actionName: "CDK_Build",
              project: cdkBuild,
              input: sourceOutput,
              outputs: [cdkBuildOutput]
            })
          ]
        },
        {
          stageName: "Deploy",
          actions: [
            new CloudFormationCreateUpdateStackAction({
              actionName: "Lambda_CFN_Deploy",
              templatePath: cdkBuildOutput.atPath(
                "InfrastructureStack.template.json"
              ),
              stackName: "InfrastructureDeploymentStack",
              adminPermissions: true,
              parameterOverrides: parameterOverrides,
              extraInputs: [lambdaBuildOutput]
            })
          ]
        }
      ]
    });
  }
}
