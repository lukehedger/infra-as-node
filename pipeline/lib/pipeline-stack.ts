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

class CloudFormationCreateUpdateStackActionFix extends CloudFormationCreateUpdateStackAction {
  bound(scope: any, stage: any, options: any): any {
    const result = super.bound(scope, stage, options);
    options.bucket.grantRead((this as any)._deploymentRole);
    return result;
  }
}

export interface PipelineStackProps extends StackProps {
  readonly pingLambdaCode: CfnParametersCode;
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

    const infrastructureBuild = new PipelineProject(
      this,
      "InfrastructureBuild",
      {
        buildSpec: BuildSpec.fromObject({
          version: "0.2",
          phases: {
            install: { commands: "npm install --prefix infrastructure" },
            build: {
              commands: [
                "npm run build --prefix infrastructure",
                "npm run synth --prefix infrastructure"
              ]
            }
          },
          artifacts: {
            "base-directory": "./infrastructure",
            files: ["cdk.out/InfrastructureStack.template.json"]
          }
        }),
        environment: {
          buildImage: LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
        }
      }
    );

    const infrastructureBuildOutput = new Artifact("infrastructureBuildOutput");

    const infrastructureBuildAction = new CodeBuildAction({
      actionName: "Infrastructure_Build",
      project: infrastructureBuild,
      input: sourceOutput,
      outputs: [infrastructureBuildOutput]
    });

    const pingLambdaBuild = new PipelineProject(this, "PingLambdaBuild", {
      buildSpec: BuildSpec.fromObject({
        version: "0.2",
        phases: {
          install: { commands: "npm install --prefix ping" },
          build: { commands: "npm run build --prefix ping" }
        },
        artifacts: {
          "base-directory": "./ping/lib",
          files: ["ping.js"]
        }
      }),
      environment: {
        buildImage: LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
      }
    });

    const pingLambdaBuildOutput = new Artifact("PingLambdaBuildOutput");

    const pingLambdaBuildAction = new CodeBuildAction({
      actionName: "Ping_Lambda_Build",
      project: pingLambdaBuild,
      input: sourceOutput,
      outputs: [pingLambdaBuildOutput]
    });

    const deployAction = new CloudFormationCreateUpdateStackActionFix({
      actionName: "Infrastructure_CFN_Deploy",
      templatePath: infrastructureBuildOutput.atPath(
        "cdk.out/InfrastructureStack.template.json"
      ),
      stackName: "InfrastructureStack",
      adminPermissions: true,
      parameterOverrides: {
        ...props?.pingLambdaCode.assign(pingLambdaBuildOutput.s3Location)
      },
      extraInputs: [pingLambdaBuildOutput]
    });

    new Pipeline(this, "Pipeline", {
      stages: [
        {
          stageName: "Source",
          actions: [sourceAction]
        },
        {
          stageName: "Build",
          actions: [pingLambdaBuildAction, infrastructureBuildAction]
        },
        {
          stageName: "Deploy",
          actions: [deployAction]
        }
      ]
    });
  }
}
