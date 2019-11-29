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
                  "PipelineBuildWorkspaceTestCodePipelineActionRole4D5824AC",
                  "Arn"
                ]
              },
              RunOrder: 1
            },
            {
              ActionTypeId: {
                Category: "Build",
                Owner: "AWS",
                Provider: "CodeBuild",
                Version: "1"
              },
              Configuration: {
                ProjectName: {
                  Ref: "PingLambdaBuild6E058FF7"
                }
              },
              InputArtifacts: [
                {
                  Name: "Artifact_Source_GitHub_Source"
                }
              ],
              Name: "Ping_Lambda_Build",
              OutputArtifacts: [
                {
                  Name: "PingLambdaBuildOutput"
                }
              ],
              RoleArn: {
                "Fn::GetAtt": [
                  "PipelineBuildPingLambdaBuildCodePipelineActionRole4FA0DB91",
                  "Arn"
                ]
              },
              RunOrder: 1
            },
            {
              ActionTypeId: {
                Category: "Build",
                Owner: "AWS",
                Provider: "CodeBuild",
                Version: "1"
              },
              Configuration: {
                ProjectName: {
                  Ref: "InfrastructureBuildE80150C6"
                }
              },
              InputArtifacts: [
                {
                  Name: "Artifact_Source_GitHub_Source"
                }
              ],
              Name: "Infrastructure_Build",
              OutputArtifacts: [
                {
                  Name: "InfrastructureBuildOutput"
                }
              ],
              RoleArn: {
                "Fn::GetAtt": [
                  "PipelineBuildInfrastructureBuildCodePipelineActionRole2A7FDF4E",
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
                    "PipelineDeployInfrastructureCFNDeployRoleAC34BA2B",
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
              Name: "Infrastructure_CFN_Deploy",
              RoleArn: {
                "Fn::GetAtt": [
                  "PipelineDeployInfrastructureCFNDeployCodePipelineActionRoleCF9820AE",
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
