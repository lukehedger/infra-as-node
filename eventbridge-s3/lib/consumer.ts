import { PutObjectCommand, S3Client } from "@aws-sdk/client-s3-node";
import { Handler } from "aws-lambda";

const s3 = new S3Client({
  region: "eu-west-2"
});

export const handler: Handler = async event => {
  try {
    const { BUCKET_NAME } = process.env;

    if (!BUCKET_NAME) {
      throw new Error("BUCKET_NAME is undefined");
    }

    console.log(
      JSON.stringify({
        correlationID: event.detail.correlationID
      })
    );

    const putObjectCommand = new PutObjectCommand({
      ACL: "public-read",
      Body: JSON.stringify(event),
      Bucket: BUCKET_NAME,
      ContentType: "application/json",
      Key: event.detail.correlationID
    });

    await s3.send(putObjectCommand);

    console.info(
      JSON.stringify({
        event: event,
        level: "INFO",
        message: "Processed event",
        meta: {
          service: "eventbridge-s3"
        }
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
          service: "eventbridge-s3"
        },
        stack: error.stack
      })
    );

    return;
  }
};
