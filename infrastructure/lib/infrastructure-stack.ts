import { LambdaRestApi } from "@aws-cdk/aws-apigateway";
import {
  CfnParametersCode,
  Code,
  Function,
  Runtime
} from "@aws-cdk/aws-lambda";
import { Construct, Stack, StackProps } from "@aws-cdk/core";

export class InfrastructureStack extends Stack {
  public readonly lambdaCode: CfnParametersCode;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.lambdaCode = Code.cfnParameters();

    const ping = new Function(this, "PingHandler", {
      code: this.lambdaCode,
      handler: "ping.handler",
      runtime: Runtime.NODEJS_10_X
    });

    new LambdaRestApi(this, "PingEndpoint", {
      handler: ping
    });
  }
}
