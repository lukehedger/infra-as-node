import { expect as expectCDK, haveResource } from "@aws-cdk/assert";
import { App } from "@aws-cdk/core";
import { InfrastructureStack } from "../infrastructure-stack";

let stack: InfrastructureStack;

beforeAll(() => {
  const app = new App();

  stack = new InfrastructureStack(app, "InfrastructureStack");
});

test("Stack has Braintree GraphQL Ping Lambda resource", () => {
  expectCDK(stack).to(
    haveResource("AWS::Lambda::Function", {
      Handler: "ping.handler",
      Runtime: "nodejs10.x"
    })
  );
});

test("Stack has Braintree GraphQL Ping API Gateway REST API resource", () => {
  expectCDK(stack).to(
    haveResource("AWS::ApiGateway::RestApi", {
      Name: "PingEndpoint"
    })
  );
});

test("Stack has Braintree GraphQL Ping API Gateway /ping endpoint resource", () => {
  expectCDK(stack).to(
    haveResource("AWS::ApiGateway::Resource", {
      PathPart: "ping"
    })
  );
});

test("Stack has Braintree GraphQL Ping API Gateway OPTIONS method", () => {
  expectCDK(stack).to(
    haveResource("AWS::ApiGateway::Method", {
      HttpMethod: "OPTIONS",
      Integration: {
        IntegrationResponses: [
          {
            ResponseParameters: {
              "method.response.header.Access-Control-Allow-Headers": "'*'",
              "method.response.header.Access-Control-Allow-Origin": "'*'",
              "method.response.header.Access-Control-Allow-Methods": "'*'",
              "method.response.header.Access-Control-Allow-Credentials":
                "'true'"
            },
            StatusCode: "204"
          }
        ],
        RequestTemplates: {
          "application/json": "{ statusCode: 200 }"
        },
        Type: "MOCK"
      }
    })
  );
});

test("Stack has Braintree GraphQL Ping API Gateway GET method", () => {
  expectCDK(stack).to(
    haveResource("AWS::ApiGateway::Method", {
      HttpMethod: "GET"
    })
  );
});
