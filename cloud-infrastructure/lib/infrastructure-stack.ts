import { LambdaRestApi } from "@aws-cdk/aws-apigateway";
import { Rule } from "@aws-cdk/aws-events";
import { LambdaFunction } from "@aws-cdk/aws-events-targets";
import {
  CfnParametersCode,
  Code,
  Function,
  Runtime,
  Tracing
} from "@aws-cdk/aws-lambda";
import { Construct, Stack, StackProps } from "@aws-cdk/core";

export class InfrastructureStack extends Stack {
  public readonly eventbridgeConsumerLambdaCode: CfnParametersCode;
  public readonly eventbridgeProducerLambdaCode: CfnParametersCode;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.eventbridgeConsumerLambdaCode = Code.cfnParameters();
    this.eventbridgeProducerLambdaCode = Code.cfnParameters();

    const eventbridgeConsumerLambda = new Function(
      this,
      "EventBridgeConsumerHandler",
      {
        code: this.eventbridgeConsumerLambdaCode,
        handler: "consumer.handler",
        runtime: Runtime.NODEJS_12_X,
        tracing: Tracing.ACTIVE
      }
    );

    const eventbridgeConsumerRule = new Rule(this, "EventBridgeConsumerRule", {
      eventPattern: {
        detail: {
          status: ["active"]
        },
        source: ["aws.lambda"]
      }
    });

    eventbridgeConsumerRule.addTarget(
      new LambdaFunction(eventbridgeConsumerLambda)
    );

    const eventbridgeProducerLambda = new Function(
      this,
      "EventBridgeProducerHandler",
      {
        code: this.eventbridgeProducerLambdaCode,
        handler: "producer.handler",
        runtime: Runtime.NODEJS_12_X,
        tracing: Tracing.ACTIVE
      }
    );

    const stageName = process.env.GITHUB_PR_NUMBER
      ? `integration-${process.env.GITHUB_PR_NUMBER}`
      : "prod";

    const api = new LambdaRestApi(this, "EventBridgeProducerEndpoint", {
      handler: eventbridgeProducerLambda,
      proxy: false,
      deployOptions: {
        stageName: stageName
      }
    });

    const eventbridgeProducerResource = api.root.addResource(
      "eventbridge-producer"
    );

    eventbridgeProducerResource.addMethod("POST");
  }
}
