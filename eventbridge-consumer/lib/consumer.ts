import { Handler } from "aws-lambda";
import { createLogger, format, transports } from "winston";

const logger = createLogger({
  format: format.combine(
    format.timestamp({
      format: "YYYY-MM-DD HH:mm:ss"
    }),
    format.errors({ stack: true }),
    format.splat(),
    format.json()
  ),
  defaultMeta: { service: "eventbridge-consumer" },
  transports: [new transports.Console()]
});

export const handler: Handler = async event => {
  try {
    logger.info("Processed event", event);

    return;
  } catch (error) {
    logger.error(error);

    return;
  }
};
