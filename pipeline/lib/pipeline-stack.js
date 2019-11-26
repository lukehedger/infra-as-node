"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const aws_codebuild_1 = require("@aws-cdk/aws-codebuild");
const aws_codepipeline_1 = require("@aws-cdk/aws-codepipeline");
const aws_codepipeline_actions_1 = require("@aws-cdk/aws-codepipeline-actions");
const core_1 = require("@aws-cdk/core");
class PipelineStack extends core_1.Stack {
    constructor(scope, id, props) {
        super(scope, id, props);
        const sourceOutput = new aws_codepipeline_1.Artifact();
        // arn:aws:secretsmanager:eu-west-2:614517326458:secret:dev/Tread/GitHubToken-gFo7Eu
        const sourceOAuth = core_1.SecretValue.secretsManager("dev/Tread/GitHubToken");
        const sourceAction = new aws_codepipeline_actions_1.GitHubSourceAction({
            actionName: "GitHub_Source",
            owner: "lukehedger",
            repo: "infra-as-node",
            oauthToken: sourceOAuth,
            output: sourceOutput,
            branch: "master",
            trigger: aws_codepipeline_actions_1.GitHubTrigger.WEBHOOK
        });
        const cdkBuild = new aws_codebuild_1.PipelineProject(this, "CdkBuild", {
            buildSpec: aws_codebuild_1.BuildSpec.fromObject({
                version: "0.2",
                phases: {
                    install: {
                        commands: "yarn"
                    },
                    build: {
                        commands: ["yarn build", "yarn synth"]
                    }
                },
                artifacts: {
                    "base-directory": "cdk.out",
                    files: ["InfrastructureStack.template.json"]
                }
            }),
            environment: {
                buildImage: aws_codebuild_1.LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
            }
        });
        const cdkBuildOutput = new aws_codepipeline_1.Artifact("CdkBuildOutput");
        const lambdaBuild = new aws_codebuild_1.PipelineProject(this, "LambdaBuild", {
            buildSpec: aws_codebuild_1.BuildSpec.fromObject({
                version: "0.2",
                phases: {
                    install: {
                        commands: ["cd ../lambda", "yarn"]
                    },
                    build: {
                        commands: "yarn build"
                    }
                },
                artifacts: {
                    "base-directory": "../lambda",
                    files: ["lib/ping.js", "node_modules/**/*"]
                }
            }),
            environment: {
                buildImage: aws_codebuild_1.LinuxBuildImage.UBUNTU_14_04_NODEJS_10_14_1
            }
        });
        const lambdaBuildOutput = new aws_codepipeline_1.Artifact("LambdaBuildOutput");
        const parameterOverrides = props
            ? props.lambdaCode.assign(lambdaBuildOutput.s3Location)
            : {};
        new aws_codepipeline_1.Pipeline(this, "Pipeline", {
            stages: [
                {
                    stageName: "Source",
                    actions: [sourceAction]
                },
                {
                    stageName: "Build",
                    actions: [
                        new aws_codepipeline_actions_1.CodeBuildAction({
                            actionName: "Lambda_Build",
                            project: lambdaBuild,
                            input: sourceOutput,
                            outputs: [lambdaBuildOutput]
                        }),
                        new aws_codepipeline_actions_1.CodeBuildAction({
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
                        new aws_codepipeline_actions_1.CloudFormationCreateUpdateStackAction({
                            actionName: "Lambda_CFN_Deploy",
                            templatePath: cdkBuildOutput.atPath("InfrastructureStack.template.json"),
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
exports.PipelineStack = PipelineStack;
//# sourceMappingURL=data:application/json;base64,eyJ2ZXJzaW9uIjozLCJmaWxlIjoicGlwZWxpbmUtc3RhY2suanMiLCJzb3VyY2VSb290IjoiIiwic291cmNlcyI6WyJwaXBlbGluZS1zdGFjay50cyJdLCJuYW1lcyI6W10sIm1hcHBpbmdzIjoiOztBQUFBLDBEQUlnQztBQUNoQyxnRUFBK0Q7QUFDL0QsZ0ZBSzJDO0FBQzNDLHdDQUEwRTtBQU8xRSxNQUFhLGFBQWMsU0FBUSxZQUFLO0lBQ3RDLFlBQVksS0FBZ0IsRUFBRSxFQUFVLEVBQUUsS0FBMEI7UUFDbEUsS0FBSyxDQUFDLEtBQUssRUFBRSxFQUFFLEVBQUUsS0FBSyxDQUFDLENBQUM7UUFFeEIsTUFBTSxZQUFZLEdBQUcsSUFBSSwyQkFBUSxFQUFFLENBQUM7UUFFcEMsb0ZBQW9GO1FBQ3BGLE1BQU0sV0FBVyxHQUFHLGtCQUFXLENBQUMsY0FBYyxDQUFDLHVCQUF1QixDQUFDLENBQUM7UUFFeEUsTUFBTSxZQUFZLEdBQUcsSUFBSSw2Q0FBa0IsQ0FBQztZQUMxQyxVQUFVLEVBQUUsZUFBZTtZQUMzQixLQUFLLEVBQUUsWUFBWTtZQUNuQixJQUFJLEVBQUUsZUFBZTtZQUNyQixVQUFVLEVBQUUsV0FBVztZQUN2QixNQUFNLEVBQUUsWUFBWTtZQUNwQixNQUFNLEVBQUUsUUFBUTtZQUNoQixPQUFPLEVBQUUsd0NBQWEsQ0FBQyxPQUFPO1NBQy9CLENBQUMsQ0FBQztRQUVILE1BQU0sUUFBUSxHQUFHLElBQUksK0JBQWUsQ0FBQyxJQUFJLEVBQUUsVUFBVSxFQUFFO1lBQ3JELFNBQVMsRUFBRSx5QkFBUyxDQUFDLFVBQVUsQ0FBQztnQkFDOUIsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsTUFBTSxFQUFFO29CQUNOLE9BQU8sRUFBRTt3QkFDUCxRQUFRLEVBQUUsTUFBTTtxQkFDakI7b0JBQ0QsS0FBSyxFQUFFO3dCQUNMLFFBQVEsRUFBRSxDQUFDLFlBQVksRUFBRSxZQUFZLENBQUM7cUJBQ3ZDO2lCQUNGO2dCQUNELFNBQVMsRUFBRTtvQkFDVCxnQkFBZ0IsRUFBRSxTQUFTO29CQUMzQixLQUFLLEVBQUUsQ0FBQyxtQ0FBbUMsQ0FBQztpQkFDN0M7YUFDRixDQUFDO1lBQ0YsV0FBVyxFQUFFO2dCQUNYLFVBQVUsRUFBRSwrQkFBZSxDQUFDLDJCQUEyQjthQUN4RDtTQUNGLENBQUMsQ0FBQztRQUVILE1BQU0sY0FBYyxHQUFHLElBQUksMkJBQVEsQ0FBQyxnQkFBZ0IsQ0FBQyxDQUFDO1FBRXRELE1BQU0sV0FBVyxHQUFHLElBQUksK0JBQWUsQ0FBQyxJQUFJLEVBQUUsYUFBYSxFQUFFO1lBQzNELFNBQVMsRUFBRSx5QkFBUyxDQUFDLFVBQVUsQ0FBQztnQkFDOUIsT0FBTyxFQUFFLEtBQUs7Z0JBQ2QsTUFBTSxFQUFFO29CQUNOLE9BQU8sRUFBRTt3QkFDUCxRQUFRLEVBQUUsQ0FBQyxjQUFjLEVBQUUsTUFBTSxDQUFDO3FCQUNuQztvQkFDRCxLQUFLLEVBQUU7d0JBQ0wsUUFBUSxFQUFFLFlBQVk7cUJBQ3ZCO2lCQUNGO2dCQUNELFNBQVMsRUFBRTtvQkFDVCxnQkFBZ0IsRUFBRSxXQUFXO29CQUM3QixLQUFLLEVBQUUsQ0FBQyxhQUFhLEVBQUUsbUJBQW1CLENBQUM7aUJBQzVDO2FBQ0YsQ0FBQztZQUNGLFdBQVcsRUFBRTtnQkFDWCxVQUFVLEVBQUUsK0JBQWUsQ0FBQywyQkFBMkI7YUFDeEQ7U0FDRixDQUFDLENBQUM7UUFFSCxNQUFNLGlCQUFpQixHQUFHLElBQUksMkJBQVEsQ0FBQyxtQkFBbUIsQ0FBQyxDQUFDO1FBRTVELE1BQU0sa0JBQWtCLEdBQUcsS0FBSztZQUM5QixDQUFDLENBQUMsS0FBSyxDQUFDLFVBQVUsQ0FBQyxNQUFNLENBQUMsaUJBQWlCLENBQUMsVUFBVSxDQUFDO1lBQ3ZELENBQUMsQ0FBQyxFQUFFLENBQUM7UUFFUCxJQUFJLDJCQUFRLENBQUMsSUFBSSxFQUFFLFVBQVUsRUFBRTtZQUM3QixNQUFNLEVBQUU7Z0JBQ047b0JBQ0UsU0FBUyxFQUFFLFFBQVE7b0JBQ25CLE9BQU8sRUFBRSxDQUFDLFlBQVksQ0FBQztpQkFDeEI7Z0JBQ0Q7b0JBQ0UsU0FBUyxFQUFFLE9BQU87b0JBQ2xCLE9BQU8sRUFBRTt3QkFDUCxJQUFJLDBDQUFlLENBQUM7NEJBQ2xCLFVBQVUsRUFBRSxjQUFjOzRCQUMxQixPQUFPLEVBQUUsV0FBVzs0QkFDcEIsS0FBSyxFQUFFLFlBQVk7NEJBQ25CLE9BQU8sRUFBRSxDQUFDLGlCQUFpQixDQUFDO3lCQUM3QixDQUFDO3dCQUNGLElBQUksMENBQWUsQ0FBQzs0QkFDbEIsVUFBVSxFQUFFLFdBQVc7NEJBQ3ZCLE9BQU8sRUFBRSxRQUFROzRCQUNqQixLQUFLLEVBQUUsWUFBWTs0QkFDbkIsT0FBTyxFQUFFLENBQUMsY0FBYyxDQUFDO3lCQUMxQixDQUFDO3FCQUNIO2lCQUNGO2dCQUNEO29CQUNFLFNBQVMsRUFBRSxRQUFRO29CQUNuQixPQUFPLEVBQUU7d0JBQ1AsSUFBSSxnRUFBcUMsQ0FBQzs0QkFDeEMsVUFBVSxFQUFFLG1CQUFtQjs0QkFDL0IsWUFBWSxFQUFFLGNBQWMsQ0FBQyxNQUFNLENBQ2pDLG1DQUFtQyxDQUNwQzs0QkFDRCxTQUFTLEVBQUUsK0JBQStCOzRCQUMxQyxnQkFBZ0IsRUFBRSxJQUFJOzRCQUN0QixrQkFBa0IsRUFBRSxrQkFBa0I7NEJBQ3RDLFdBQVcsRUFBRSxDQUFDLGlCQUFpQixDQUFDO3lCQUNqQyxDQUFDO3FCQUNIO2lCQUNGO2FBQ0Y7U0FDRixDQUFDLENBQUM7SUFDTCxDQUFDO0NBQ0Y7QUE5R0Qsc0NBOEdDIiwic291cmNlc0NvbnRlbnQiOlsiaW1wb3J0IHtcbiAgQnVpbGRTcGVjLFxuICBMaW51eEJ1aWxkSW1hZ2UsXG4gIFBpcGVsaW5lUHJvamVjdFxufSBmcm9tIFwiQGF3cy1jZGsvYXdzLWNvZGVidWlsZFwiO1xuaW1wb3J0IHsgQXJ0aWZhY3QsIFBpcGVsaW5lIH0gZnJvbSBcIkBhd3MtY2RrL2F3cy1jb2RlcGlwZWxpbmVcIjtcbmltcG9ydCB7XG4gIENsb3VkRm9ybWF0aW9uQ3JlYXRlVXBkYXRlU3RhY2tBY3Rpb24sXG4gIENvZGVCdWlsZEFjdGlvbixcbiAgR2l0SHViU291cmNlQWN0aW9uLFxuICBHaXRIdWJUcmlnZ2VyXG59IGZyb20gXCJAYXdzLWNkay9hd3MtY29kZXBpcGVsaW5lLWFjdGlvbnNcIjtcbmltcG9ydCB7IENvbnN0cnVjdCwgU2VjcmV0VmFsdWUsIFN0YWNrLCBTdGFja1Byb3BzIH0gZnJvbSBcIkBhd3MtY2RrL2NvcmVcIjtcbmltcG9ydCB7IENmblBhcmFtZXRlcnNDb2RlIH0gZnJvbSBcIkBhd3MtY2RrL2F3cy1sYW1iZGFcIjtcblxuZXhwb3J0IGludGVyZmFjZSBQaXBlbGluZVN0YWNrUHJvcHMgZXh0ZW5kcyBTdGFja1Byb3BzIHtcbiAgcmVhZG9ubHkgbGFtYmRhQ29kZTogQ2ZuUGFyYW1ldGVyc0NvZGU7XG59XG5cbmV4cG9ydCBjbGFzcyBQaXBlbGluZVN0YWNrIGV4dGVuZHMgU3RhY2sge1xuICBjb25zdHJ1Y3RvcihzY29wZTogQ29uc3RydWN0LCBpZDogc3RyaW5nLCBwcm9wcz86IFBpcGVsaW5lU3RhY2tQcm9wcykge1xuICAgIHN1cGVyKHNjb3BlLCBpZCwgcHJvcHMpO1xuXG4gICAgY29uc3Qgc291cmNlT3V0cHV0ID0gbmV3IEFydGlmYWN0KCk7XG5cbiAgICAvLyBhcm46YXdzOnNlY3JldHNtYW5hZ2VyOmV1LXdlc3QtMjo2MTQ1MTczMjY0NTg6c2VjcmV0OmRldi9UcmVhZC9HaXRIdWJUb2tlbi1nRm83RXVcbiAgICBjb25zdCBzb3VyY2VPQXV0aCA9IFNlY3JldFZhbHVlLnNlY3JldHNNYW5hZ2VyKFwiZGV2L1RyZWFkL0dpdEh1YlRva2VuXCIpO1xuXG4gICAgY29uc3Qgc291cmNlQWN0aW9uID0gbmV3IEdpdEh1YlNvdXJjZUFjdGlvbih7XG4gICAgICBhY3Rpb25OYW1lOiBcIkdpdEh1Yl9Tb3VyY2VcIixcbiAgICAgIG93bmVyOiBcImx1a2VoZWRnZXJcIixcbiAgICAgIHJlcG86IFwiaW5mcmEtYXMtbm9kZVwiLFxuICAgICAgb2F1dGhUb2tlbjogc291cmNlT0F1dGgsXG4gICAgICBvdXRwdXQ6IHNvdXJjZU91dHB1dCxcbiAgICAgIGJyYW5jaDogXCJtYXN0ZXJcIixcbiAgICAgIHRyaWdnZXI6IEdpdEh1YlRyaWdnZXIuV0VCSE9PS1xuICAgIH0pO1xuXG4gICAgY29uc3QgY2RrQnVpbGQgPSBuZXcgUGlwZWxpbmVQcm9qZWN0KHRoaXMsIFwiQ2RrQnVpbGRcIiwge1xuICAgICAgYnVpbGRTcGVjOiBCdWlsZFNwZWMuZnJvbU9iamVjdCh7XG4gICAgICAgIHZlcnNpb246IFwiMC4yXCIsXG4gICAgICAgIHBoYXNlczoge1xuICAgICAgICAgIGluc3RhbGw6IHtcbiAgICAgICAgICAgIGNvbW1hbmRzOiBcInlhcm5cIlxuICAgICAgICAgIH0sXG4gICAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICAgIGNvbW1hbmRzOiBbXCJ5YXJuIGJ1aWxkXCIsIFwieWFybiBzeW50aFwiXVxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgYXJ0aWZhY3RzOiB7XG4gICAgICAgICAgXCJiYXNlLWRpcmVjdG9yeVwiOiBcImNkay5vdXRcIixcbiAgICAgICAgICBmaWxlczogW1wiSW5mcmFzdHJ1Y3R1cmVTdGFjay50ZW1wbGF0ZS5qc29uXCJdXG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgYnVpbGRJbWFnZTogTGludXhCdWlsZEltYWdlLlVCVU5UVV8xNF8wNF9OT0RFSlNfMTBfMTRfMVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgY2RrQnVpbGRPdXRwdXQgPSBuZXcgQXJ0aWZhY3QoXCJDZGtCdWlsZE91dHB1dFwiKTtcblxuICAgIGNvbnN0IGxhbWJkYUJ1aWxkID0gbmV3IFBpcGVsaW5lUHJvamVjdCh0aGlzLCBcIkxhbWJkYUJ1aWxkXCIsIHtcbiAgICAgIGJ1aWxkU3BlYzogQnVpbGRTcGVjLmZyb21PYmplY3Qoe1xuICAgICAgICB2ZXJzaW9uOiBcIjAuMlwiLFxuICAgICAgICBwaGFzZXM6IHtcbiAgICAgICAgICBpbnN0YWxsOiB7XG4gICAgICAgICAgICBjb21tYW5kczogW1wiY2QgLi4vbGFtYmRhXCIsIFwieWFyblwiXVxuICAgICAgICAgIH0sXG4gICAgICAgICAgYnVpbGQ6IHtcbiAgICAgICAgICAgIGNvbW1hbmRzOiBcInlhcm4gYnVpbGRcIlxuICAgICAgICAgIH1cbiAgICAgICAgfSxcbiAgICAgICAgYXJ0aWZhY3RzOiB7XG4gICAgICAgICAgXCJiYXNlLWRpcmVjdG9yeVwiOiBcIi4uL2xhbWJkYVwiLFxuICAgICAgICAgIGZpbGVzOiBbXCJsaWIvcGluZy5qc1wiLCBcIm5vZGVfbW9kdWxlcy8qKi8qXCJdXG4gICAgICAgIH1cbiAgICAgIH0pLFxuICAgICAgZW52aXJvbm1lbnQ6IHtcbiAgICAgICAgYnVpbGRJbWFnZTogTGludXhCdWlsZEltYWdlLlVCVU5UVV8xNF8wNF9OT0RFSlNfMTBfMTRfMVxuICAgICAgfVxuICAgIH0pO1xuXG4gICAgY29uc3QgbGFtYmRhQnVpbGRPdXRwdXQgPSBuZXcgQXJ0aWZhY3QoXCJMYW1iZGFCdWlsZE91dHB1dFwiKTtcblxuICAgIGNvbnN0IHBhcmFtZXRlck92ZXJyaWRlcyA9IHByb3BzXG4gICAgICA/IHByb3BzLmxhbWJkYUNvZGUuYXNzaWduKGxhbWJkYUJ1aWxkT3V0cHV0LnMzTG9jYXRpb24pXG4gICAgICA6IHt9O1xuXG4gICAgbmV3IFBpcGVsaW5lKHRoaXMsIFwiUGlwZWxpbmVcIiwge1xuICAgICAgc3RhZ2VzOiBbXG4gICAgICAgIHtcbiAgICAgICAgICBzdGFnZU5hbWU6IFwiU291cmNlXCIsXG4gICAgICAgICAgYWN0aW9uczogW3NvdXJjZUFjdGlvbl1cbiAgICAgICAgfSxcbiAgICAgICAge1xuICAgICAgICAgIHN0YWdlTmFtZTogXCJCdWlsZFwiLFxuICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgIG5ldyBDb2RlQnVpbGRBY3Rpb24oe1xuICAgICAgICAgICAgICBhY3Rpb25OYW1lOiBcIkxhbWJkYV9CdWlsZFwiLFxuICAgICAgICAgICAgICBwcm9qZWN0OiBsYW1iZGFCdWlsZCxcbiAgICAgICAgICAgICAgaW5wdXQ6IHNvdXJjZU91dHB1dCxcbiAgICAgICAgICAgICAgb3V0cHV0czogW2xhbWJkYUJ1aWxkT3V0cHV0XVxuICAgICAgICAgICAgfSksXG4gICAgICAgICAgICBuZXcgQ29kZUJ1aWxkQWN0aW9uKHtcbiAgICAgICAgICAgICAgYWN0aW9uTmFtZTogXCJDREtfQnVpbGRcIixcbiAgICAgICAgICAgICAgcHJvamVjdDogY2RrQnVpbGQsXG4gICAgICAgICAgICAgIGlucHV0OiBzb3VyY2VPdXRwdXQsXG4gICAgICAgICAgICAgIG91dHB1dHM6IFtjZGtCdWlsZE91dHB1dF1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgXVxuICAgICAgICB9LFxuICAgICAgICB7XG4gICAgICAgICAgc3RhZ2VOYW1lOiBcIkRlcGxveVwiLFxuICAgICAgICAgIGFjdGlvbnM6IFtcbiAgICAgICAgICAgIG5ldyBDbG91ZEZvcm1hdGlvbkNyZWF0ZVVwZGF0ZVN0YWNrQWN0aW9uKHtcbiAgICAgICAgICAgICAgYWN0aW9uTmFtZTogXCJMYW1iZGFfQ0ZOX0RlcGxveVwiLFxuICAgICAgICAgICAgICB0ZW1wbGF0ZVBhdGg6IGNka0J1aWxkT3V0cHV0LmF0UGF0aChcbiAgICAgICAgICAgICAgICBcIkluZnJhc3RydWN0dXJlU3RhY2sudGVtcGxhdGUuanNvblwiXG4gICAgICAgICAgICAgICksXG4gICAgICAgICAgICAgIHN0YWNrTmFtZTogXCJJbmZyYXN0cnVjdHVyZURlcGxveW1lbnRTdGFja1wiLFxuICAgICAgICAgICAgICBhZG1pblBlcm1pc3Npb25zOiB0cnVlLFxuICAgICAgICAgICAgICBwYXJhbWV0ZXJPdmVycmlkZXM6IHBhcmFtZXRlck92ZXJyaWRlcyxcbiAgICAgICAgICAgICAgZXh0cmFJbnB1dHM6IFtsYW1iZGFCdWlsZE91dHB1dF1cbiAgICAgICAgICAgIH0pXG4gICAgICAgICAgXVxuICAgICAgICB9XG4gICAgICBdXG4gICAgfSk7XG4gIH1cbn1cbiJdfQ==