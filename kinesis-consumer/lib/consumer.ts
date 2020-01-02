import {
  APIGatewayProxyResult,
  Handler,
  KinesisStreamEvent,
  KinesisStreamRecord
} from "aws-lambda";

export const handler: Handler = async (
  event: KinesisStreamEvent
): Promise<APIGatewayProxyResult> => {
  try {
    event.Records.map((record: KinesisStreamRecord) => {
      const payload = JSON.parse(
        Buffer.from(record.kinesis.data, "base64").toString("ascii")
      );

      if (payload.forceRetry) {
        throw new Error("Lambda forced to retry");
      }
    });

    return {
      body: JSON.stringify({ recordsProcessed: event.Records.length }),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Content-Type": "application/json"
      },
      statusCode: 200
    };
  } catch (error) {
    return {
      body: JSON.stringify(error),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Content-Type": "application/json"
      },
      statusCode: 500
    };
  }
};
