import { CodePipelineCloudWatchEvent, Handler } from "aws-lambda";
import {
  CodePipelineClient,
  GetPipelineExecutionCommand
} from "@aws-sdk/client-codepipeline-node";
import {
  GetSecretValueCommand,
  SecretsManagerClient
} from "@aws-sdk/client-secrets-manager-node";
import { Octokit } from "@octokit/rest";

const secretsManager = new SecretsManagerClient({
  region: "eu-west-2"
});

export const handler: Handler = async (event: CodePipelineCloudWatchEvent) => {
  try {
    const {
      AWS_SECRETS_GITHUB,
      GITHUB_HEAD_REF,
      GITHUB_PR_NUMBER
    } = process.env;

    if (!AWS_SECRETS_GITHUB) {
      throw new Error("AWS_SECRETS_GITHUB is undefined");
    }

    if (!GITHUB_HEAD_REF) {
      throw new Error("GITHUB_HEAD_REF is undefined");
    }

    if (!GITHUB_PR_NUMBER) {
      throw new Error("GITHUB_PR_NUMBER is undefined");
    }

    const getSecretValueCommand = new GetSecretValueCommand({
      SecretId: AWS_SECRETS_GITHUB
    });

    const secretValue = await secretsManager.send(getSecretValueCommand);

    const githubAccessToken = secretValue.SecretString
      ? secretValue.SecretString
      : secretValue.SecretBinary?.toString();

    if (!githubAccessToken) {
      throw new Error(
        "Could not retrieve GitHub access token from AWS Secrets Manager"
      );
    }

    const octokit = new Octokit({ auth: githubAccessToken });

    const eventRegion = event.region;

    const codePipeline = new CodePipelineClient({ region: eventRegion });

    const pipelineExecutionID = event.detail["execution-id"];

    const pipelineName = event.detail.pipeline;

    const getPipelineExecutionCommand = new GetPipelineExecutionCommand({
      pipelineExecutionId: pipelineExecutionID,
      pipelineName: pipelineName
    });

    const codePipelineExecution = await codePipeline.send(
      getPipelineExecutionCommand
    );

    if (!codePipelineExecution.pipelineExecution) {
      throw new Error("Failed to fetch CodePipeline execution");
    }

    if (
      !codePipelineExecution.pipelineExecution.artifactRevisions ||
      codePipelineExecution.pipelineExecution.artifactRevisions.length === 0
    ) {
      throw new Error("No revision info found in CodePipeline execution");
    }

    const [
      { revisionId, revisionUrl }
    ] = codePipelineExecution.pipelineExecution.artifactRevisions;

    if (!revisionId) {
      throw new Error("No GitHub revision ID found in CodePipeline execution");
    }

    if (!revisionUrl) {
      throw new Error("No GitHub revision URL found in CodePipeline execution");
    }

    const revisionUrlMatches = revisionUrl.match(
      /^https:\/\/github\.com\/([^/]+)\/([^/]+).*/
    );

    if (revisionUrlMatches === null) {
      throw new Error(`Not a GitHub revision URL: ${revisionUrl}`);
    }

    const [, owner, repo] = revisionUrlMatches;

    const pipelineExecutionStatus =
      codePipelineExecution.pipelineExecution.status;

    const state = ((
      status: string | undefined
    ): "error" | "failure" | "pending" | "success" => {
      switch (status) {
        case "InProgress":
          return "pending";
        case "Failed":
          return "failure";
        case "Succeeded":
          return "success";
        default:
          return "error";
      }
    })(pipelineExecutionStatus);

    /* eslint-disable @typescript-eslint/camelcase */
    await octokit.repos.createStatus({
      context: `Integration Infrastructure / CodePipeline`,
      description: `${pipelineExecutionStatus}: Execution ${pipelineExecutionID}`,
      owner: owner,
      repo: repo,
      sha: revisionId,
      state: state,
      target_url: `https://${eventRegion}.console.aws.amazon.com/codesuite/codepipeline/pipelines/${pipelineName}/executions/${pipelineExecutionID}/visualization?region=${eventRegion}`
    });
    /* eslint-enable @typescript-eslint/camelcase */

    return;
  } catch (error) {
    console.error(error);

    return;
  }
};
