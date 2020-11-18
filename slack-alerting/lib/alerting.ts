import { Handler, SNSEvent, SNSEventRecord } from "aws-lambda";
import {
  GetSecretValueCommand,
  SecretsManagerClient,
} from "@aws-sdk/client-secrets-manager-node";
import got from "got";

const secretsManager = new SecretsManagerClient({
  region: "eu-west-2",
});

export const handler: Handler = async (event: SNSEvent) => {
  try {
    const { AWS_SECRETS_SLACK } = process.env;

    if (!AWS_SECRETS_SLACK) {
      throw new Error("AWS_SECRETS_SLACK is undefined");
    }

    const getSecretValueCommand = new GetSecretValueCommand({
      SecretId: AWS_SECRETS_SLACK,
    });

    const secretValue = await secretsManager.send(getSecretValueCommand);

    const slackSecret = secretValue.SecretString
      ? secretValue.SecretString
      : secretValue.SecretBinary?.toString();

    if (!slackSecret) {
      throw new Error(
        "Could not retrieve Slack API secrets from AWS Secrets Manager"
      );
    }

    const { SLACK_WEBHOOK_URL } = JSON.parse(slackSecret);

    await Promise.all(
      event.Records.map(async (record: SNSEventRecord) => {
        try {
          await got.post(SLACK_WEBHOOK_URL, {
            body: JSON.stringify({ text: record.Sns.Message }),
            headers: {
              "Content-Type": "application/json",
            },
          });

          console.info(
            JSON.stringify({
              event: record,
              level: "INFO",
              message: "Processed notification record",
              meta: {
                service: "slack-alerting",
              },
            })
          );
        } catch (error) {
          throw error;
        }
      })
    );

    console.info(
      JSON.stringify({
        event: event,
        level: "INFO",
        message: "Processed notification",
        meta: {
          service: "slack-alerting",
        },
      })
    );

    return;
  } catch (error) {
    console.error(
      JSON.stringify({
        error: error,
        event: event,
        level: "ERROR",
        message: error.message,
        meta: {
          service: "slack-alerting",
        },
        stack: error.stack,
      })
    );

    return;
  }
};
