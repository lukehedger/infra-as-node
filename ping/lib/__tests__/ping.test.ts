import {
  APIGatewayProxyEvent,
  APIGatewayProxyCallback,
  Context
} from "aws-lambda";
import * as nock from "nock";
import { handler } from "../ping";

beforeAll(() => {
  nock("https://payments.sandbox.braintree-api.com")
    .post("/graphql", { query: "query { ping }", variables: {} })
    .reply(200, { data: { ping: "pong" } });
});

test("Should send ping query to Braintree GraphQL API", async () => {
  const callback: APIGatewayProxyCallback = {} as APIGatewayProxyCallback;
  const context: Context = {} as Context;
  const event: APIGatewayProxyEvent = {} as APIGatewayProxyEvent;

  expect.assertions(7);

  const res = await handler(event, context, callback);

  expect(res.body).toBeTruthy();

  const body = JSON.parse(res.body);

  expect(body.data).toBeTruthy();

  expect(body.data.ping).toEqual("pong");

  expect(res.headers["Access-Control-Allow-Origin"]).toEqual("*");

  expect(res.headers["Access-Control-Allow-Methods"]).toEqual("POST");

  expect(res.headers["Content-Type"]).toEqual("application/json");

  expect(res.statusCode).toEqual(200);
});
