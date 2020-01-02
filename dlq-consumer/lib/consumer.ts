import {
  APIGatewayProxyResult,
  Handler,
  SQSEvent,
  SQSRecord
} from "aws-lambda";

export const handler: Handler = async (
  event: SQSEvent
): Promise<APIGatewayProxyResult> => {
  try {
    event.Records.map((record: SQSRecord) => {
      const payload = JSON.parse(record.body);

      // TODO: Send this somewhere
      console.log(payload);
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
