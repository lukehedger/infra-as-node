import { expect as expectCDK, haveResource } from "@aws-cdk/assert";
import { App } from "@aws-cdk/core";
import { PipelineStack } from "../pipeline-stack";

let stack: PipelineStack;

beforeAll(() => {
  const app = new App();

  stack = new PipelineStack(app, "PipelineStack");
});

test("Stack has CodePipeline pipeline resource", () => {
  expectCDK(stack).to(
    haveResource("AWS::CodePipeline::Pipeline", {
      Stages: [
        {
          Actions: [
            {
              ActionTypeId: {
                Category: "Source",
                Owner: "ThirdParty",
                Provider: "GitHub",
                Version: "1"
              },
              Configuration: {
                Owner: "lukehedger",
                Repo: "infra-as-node",
                Branch: "master",
                OAuthToken:
                  "{{resolve:secretsmanager:dev/Tread/GitHubToken:SecretString:::}}",
                PollForSourceChanges: false
              },
              Name: "GitHub_Source",
              OutputArtifacts: [
                {
                  Name: "Artifact_Source_GitHub_Source"
                }
              ],
              RunOrder: 1
            }
          ],
          Name: "Source"
        },
        {
          Actions: [
            {
              ActionTypeId: {
                Category: "Build",
                Owner: "AWS",
                Provider: "CodeBuild",
                Version: "1"
              },
              Configuration: {
                ProjectName: {
                  Ref: "WorkspaceBuildF1E1759B"
                }
              },
              InputArtifacts: [
                {
                  Name: "Artifact_Source_GitHub_Source"
                }
              ],
              Name: "Workspace_Build",
              OutputArtifacts: [
                {
                  Name: "InfrastructureBuildOutput"
                },
                {
                  Name: "PingLambdaBuildOutput"
                }
              ],
              RoleArn: {
                "Fn::GetAtt": [
                  "PipelineBuildWorkspaceBuildCodePipelineActionRole3B2F594C",
                  "Arn"
                ]
              },
              RunOrder: 1
            }
          ],
          Name: "Build"
        },
        {
          Actions: [
            {
              ActionTypeId: {
                Category: "Test",
                Owner: "AWS",
                Provider: "CodeBuild",
                Version: "1"
              },
              Configuration: {
                ProjectName: {
                  Ref: "WorkspaceTest3C00C8EC"
                }
              },
              InputArtifacts: [
                {
                  Name: "Artifact_Source_GitHub_Source"
                }
              ],
              Name: "Workspace_Test",
              RoleArn: {
                "Fn::GetAtt": [
                  "PipelineTestWorkspaceTestCodePipelineActionRole2A51DFFC",
                  "Arn"
                ]
              },
              RunOrder: 1
            }
          ],
          Name: "Test"
        },
        {
          Actions: [
            {
              ActionTypeId: {
                Category: "Deploy",
                Owner: "AWS",
                Provider: "CloudFormation",
                Version: "1"
              },
              Configuration: {
                StackName: "InfrastructureStack",
                Capabilities: "CAPABILITY_NAMED_IAM",
                RoleArn: {
                  "Fn::GetAtt": [
                    "PipelineDeployInfrastructureDeployRole7CD91CDA",
                    "Arn"
                  ]
                },
                ParameterOverrides: "{}",
                ActionMode: "CREATE_UPDATE",
                TemplatePath:
                  "InfrastructureBuildOutput::cdk.out/InfrastructureStack.template.json"
              },
              InputArtifacts: [
                {
                  Name: "PingLambdaBuildOutput"
                },
                {
                  Name: "InfrastructureBuildOutput"
                }
              ],
              Name: "Infrastructure_Deploy",
              RoleArn: {
                "Fn::GetAtt": [
                  "PipelineDeployInfrastructureDeployCodePipelineActionRoleE6380BCC",
                  "Arn"
                ]
              },
              RunOrder: 1
            }
          ],
          Name: "Deploy"
        }
      ]
    })
  );
});

test("Stack has CodePipeline GitHub webhook resource", () => {
  expectCDK(stack).to(
    haveResource("AWS::CodePipeline::Webhook", {
      AuthenticationConfiguration: {
        SecretToken:
          "{{resolve:secretsmanager:dev/Tread/GitHubToken:SecretString:::}}"
      }
    })
  );
});
