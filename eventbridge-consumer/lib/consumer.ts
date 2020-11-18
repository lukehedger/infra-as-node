import { Handler } from "aws-lambda";

export const handler: Handler = async (event) => {
  try {
    console.info(
      JSON.stringify({
        event: event,
        level: "INFO",
        message: "Processed event",
        meta: {
          service: "eventbridge-consumer",
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
          service: "eventbridge-consumer",
        },
        stack: error.stack,
      })
    );

    return;
  }
};
