import { LambdaRestApi } from "@aws-cdk/aws-apigateway";
import {
  CfnParametersCode,
  Code,
  Function,
  Runtime,
  Tracing
} from "@aws-cdk/aws-lambda";
import { Construct, Stack, StackProps } from "@aws-cdk/core";

export class InfrastructureStack extends Stack {
  public readonly pingLambdaCode: CfnParametersCode;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.pingLambdaCode = Code.cfnParameters();

    const ping = new Function(this, "PingHandler", {
      code: this.pingLambdaCode,
      handler: "ping.handler",
      runtime: Runtime.NODEJS_10_X,
      tracing: Tracing.ACTIVE
    });

    const api = new LambdaRestApi(this, "PingEndpoint", {
      handler: ping,
      proxy: false
    });

    const pingResource = api.root.addResource("ping");

    pingResource.addMethod("POST");
  }
}
