import { APIGatewayProxyResult, Handler } from "aws-lambda";

export const handler: Handler = async (
  event
): Promise<APIGatewayProxyResult> => {
  try {
    console.log(event);

    return {
      body: JSON.stringify({ event: event }),
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
