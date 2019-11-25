import { LambdaRestApi } from "@aws-cdk/aws-apigateway";
import { Code, Function, Runtime } from "@aws-cdk/aws-lambda";
import { Construct, Stack, StackProps } from "@aws-cdk/core";

export class InfrastructureStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const ping = new Function(this, "PingHandler", {
      runtime: Runtime.NODEJS_10_X,
      code: Code.fromAsset("../lambda/lib"),
      handler: "ping.handler"
    });

    new LambdaRestApi(this, "PingEndpoint", {
      handler: ping
    });
  }
}
