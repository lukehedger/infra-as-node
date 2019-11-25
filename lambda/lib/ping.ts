import { APIGatewayProxyResult, Handler } from "aws-lambda";
import fetch from "node-fetch";

export const handler: Handler = async (): Promise<APIGatewayProxyResult> => {
  try {
    const BRAINTREE_GRAPHQL_API =
      "https://payments.sandbox.braintree-api.com/graphql";
    const BRAINTREE_PUBLIC_KEY = "PUBLIC_KEY";
    const BRAINTREE_PRIVATE_KEY = "PRIVATE_KEY";

    const authToken = Buffer.from(
      `${BRAINTREE_PUBLIC_KEY}:${BRAINTREE_PRIVATE_KEY}`
    ).toString("base64");

    const response = await fetch(BRAINTREE_GRAPHQL_API, {
      body: `{"query": "query { ping }", "variables": {} }`,
      headers: {
        Authorization: `Basic ${authToken}`,
        "Braintree-Version": "2019-11-01",
        "Content-Type": "application/json"
      },
      method: "POST"
    });

    const json = await response.json();

    if (json.errors) {
      throw json;
    }

    return {
      body: JSON.stringify(json),
      headers: { "Content-Type": "application/json" },
      statusCode: 200
    };
  } catch (error) {
    return {
      body: JSON.stringify(error),
      headers: { "Content-Type": "application/json" },
      statusCode: 500
    };
  }
};
