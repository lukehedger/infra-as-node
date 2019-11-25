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

test("Stack has Braintree GraphQL Ping API Gateway endpoint resource", () => {
  expectCDK(stack).to(
    haveResource("AWS::ApiGateway::RestApi", {
      Name: "PingEndpoint"
    })
  );
});
