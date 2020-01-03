import { PutRecordCommand, KinesisClient } from "@aws-sdk/client-kinesis-node";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler
} from "aws-lambda";

const kinesis = new KinesisClient({
  region: "eu-west-2"
});

export const handler: Handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (event.body) {
      const { KINESIS_STREAM_NAME } = process.env;

      if (!KINESIS_STREAM_NAME) {
        throw new Error("Kinesis stream name undefined");
      }

      const putRecordCommand = new PutRecordCommand({
        Data: JSON.stringify(event.body),
        PartitionKey: "1",
        StreamName: KINESIS_STREAM_NAME
      });

      const putRecord = await kinesis.send(putRecordCommand);

      return {
        body: JSON.stringify({
          sequenceNumber: putRecord.SequenceNumber,
          shardId: putRecord.ShardId
        }),
        headers: {
          "Access-Control-Allow-Origin": "*",
          "Access-Control-Allow-Methods": "POST",
          "Content-Type": "application/json"
        },
        statusCode: 200
      };
    } else {
      throw new Error("Request body is empty");
    }
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
