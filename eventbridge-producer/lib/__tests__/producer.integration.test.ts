import { InvokeCommand, LambdaClient } from "@aws-sdk/client-lambda";

const lambda = new LambdaClient({ region: "eu-west-2" });

test("EventBridge Producer Lambda puts EventBridge event", async () => {
  try {
    expect.assertions(3);

    const functionName = process.env.GITHUB_PR_NUMBER
      ? `EventBridgeProducer-Integration-${process.env.GITHUB_PR_NUMBER}`
      : "EventBridgeProducer-Production";

    const invokeCommand = new InvokeCommand({
      FunctionName: functionName,
      Payload: Buffer.from(
        JSON.stringify({ body: JSON.stringify({ status: "active" }) })
      ),
    });

    const invokeCommandResponse = await lambda.send(invokeCommand);

    if (invokeCommandResponse.Payload) {
      const payload = JSON.parse(
        Buffer.from(invokeCommandResponse.Payload).toString()
      );

      if (payload.errorMessage) {
        throw new Error(payload.errorMessage);
      }

      if (payload.statusCode !== 200) {
        throw new Error("Unexpected status code");
      }

      if (typeof payload.body === "undefined") {
        throw new Error("No payload body");
      }

      const { entries, failedEntryCount } = JSON.parse(payload.body);

      if (
        typeof entries === "undefined" ||
        typeof failedEntryCount === "undefined"
      ) {
        throw new Error("Unexpected response payload");
      }

      expect(entries.length).toBe(1);

      expect(failedEntryCount).toBe(0);

      expect(payload.statusCode).toBe(200);
    } else {
      throw new Error("No response payload");
    }
  } catch (error) {
    console.error(error);

    throw new Error(error);
  }
});
