import "@aws-cdk/assert/jest";
import { App } from "@aws-cdk/core";
import { PipelineStack } from "../pipeline-stack";

let stack: PipelineStack;

beforeAll(() => {
  const app = new App();

  stack = new PipelineStack(app, "PipelineStack");
});

test("Stack has CodePipeline pipeline resource", () => {
  const branch = process.env.GITHUB_HEAD_REF
    ? process.env.GITHUB_HEAD_REF
    : "master";

  const stackName = `InfrastructureStack-${process.env.GITHUB_PR_NUMBER}`;

  expect(stack).toHaveResourceLike("AWS::CodePipeline::Pipeline", {
    Stages: [
      {
        Actions: [
          {
            ActionTypeId: {
              Category: "Source",
              Owner: "ThirdParty",
              Provider: "GitHub",
            },
            Configuration: {
              Owner: "lukehedger",
              Repo: "infra-as-node",
              Branch: branch,
              OAuthToken:
                "{{resolve:secretsmanager:dev/Tread/GitHubToken:SecretString:::}}",
              PollForSourceChanges: false,
            },
            Name: "GitHub_Source",
            OutputArtifacts: [
              {
                Name: "Artifact_Source_GitHub_Source",
              },
            ],
          },
        ],
        Name: "Source",
      },
      {
        Actions: [
          {
            ActionTypeId: {
              Category: "Build",
              Owner: "AWS",
              Provider: "CodeBuild",
            },
            InputArtifacts: [
              {
                Name: "Artifact_Source_GitHub_Source",
              },
            ],
            Name: "Microservice_Build",
            OutputArtifacts: [
              {
                Name: "InfrastructureBuildOutput",
              },
              {
                Name: "ECLBO",
              },
              {
                Name: "EPLBO",
              },
              {
                Name: "ESLBO",
              },
              {
                Name: "SALBO",
              },
            ],
          },
          {
            ActionTypeId: {
              Category: "Build",
              Owner: "AWS",
              Provider: "CodeBuild",
            },
            InputArtifacts: [
              {
                Name: "Artifact_Source_GitHub_Source",
              },
            ],
            Name: "StaticApp_Build",
            OutputArtifacts: [
              {
                Name: "StaticAppBucket",
              },
            ],
            RunOrder: 1,
          },
        ],
        Name: "Build",
      },
      {
        Actions: [
          {
            ActionTypeId: {
              Category: "Deploy",
              Owner: "AWS",
              Provider: "CloudFormation",
            },
            Configuration: {
              StackName: stackName,
              Capabilities: "CAPABILITY_NAMED_IAM",
              ParameterOverrides: "{}",
              ActionMode: "CREATE_UPDATE",
              TemplatePath: `InfrastructureBuildOutput::${stackName}.template.json`,
            },
            InputArtifacts: [
              {
                Name: "ECLBO",
              },
              {
                Name: "EPLBO",
              },
              {
                Name: "ESLBO",
              },
              {
                Name: "SALBO",
              },
              {
                Name: "InfrastructureBuildOutput",
              },
            ],
            Name: "Infrastructure_Deploy",
            RunOrder: 1,
          },
          {
            ActionTypeId: {
              Category: "Deploy",
              Owner: "AWS",
              Provider: "S3",
            },
            Configuration: {
              BucketName: `static-app-${process.env.GITHUB_PR_NUMBER}`,
              Extract: "true",
            },
            InputArtifacts: [
              {
                Name: "StaticAppBucket",
              },
            ],
            Name: "Static_App_Deploy",
            RunOrder: 2,
          },
        ],
        Name: "Deploy",
      },
      {
        Actions: [
          {
            ActionTypeId: {
              Category: "Test",
              Owner: "AWS",
              Provider: "CodeBuild",
            },
            InputArtifacts: [
              {
                Name: "Artifact_Source_GitHub_Source",
              },
            ],
            Name: "Workspace_Integration_Test",
          },
        ],
        Name: "Test",
      },
    ],
    ArtifactStore: {
      Type: "S3",
    },
    Name: `DeploymentPipeline-Integration-${process.env.GITHUB_PR_NUMBER}`,
  });
});

test("Stack has CodePipeline GitHub webhook resource", () => {
  expect(stack).toHaveResource("AWS::CodePipeline::Webhook", {
    AuthenticationConfiguration: {
      SecretToken:
        "{{resolve:secretsmanager:dev/Tread/GitHubToken:SecretString:::}}",
    },
  });
});
