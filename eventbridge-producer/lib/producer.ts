import {
  PutEventsCommand,
  EventBridgeClient
} from "@aws-sdk/client-eventbridge-node";
import {
  APIGatewayProxyEvent,
  APIGatewayProxyResult,
  Handler
} from "aws-lambda";
import cuid from "cuid";

const eventbridge = new EventBridgeClient({
  region: "eu-west-2"
});

export const handler: Handler = async (
  event: APIGatewayProxyEvent
): Promise<APIGatewayProxyResult> => {
  try {
    if (event.body) {
      const body = JSON.parse(event.body);

      const putEventsCommand = new PutEventsCommand({
        Entries: [
          {
            Detail: JSON.stringify({
              correlationID: cuid(),
              status: body.status
            }),
            DetailType: "AWS Lambda event",
            Source: "com.ian",
            Time: new Date()
          }
        ]
      });

      const putEvents = await eventbridge.send(putEventsCommand);

      console.info(
        JSON.stringify({
          event: event,
          level: "INFO",
          message: "Put event",
          meta: {
            service: "eventbridge-producer"
          }
        })
      );

      return {
        body: JSON.stringify({
          entries: putEvents.Entries,
          failedEntryCount: putEvents.FailedEntryCount
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
    console.error(
      JSON.stringify({
        error: error,
        event: event,
        level: "ERROR",
        message: error.message,
        meta: {
          service: "eventbridge-producer"
        },
        stack: error.stack
      })
    );

    return {
      body: JSON.stringify(error, Object.getOwnPropertyNames(error)),
      headers: {
        "Access-Control-Allow-Origin": "*",
        "Access-Control-Allow-Methods": "POST",
        "Content-Type": "application/json"
      },
      statusCode: 500
    };
  }
};
