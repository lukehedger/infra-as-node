import { LambdaRestApi } from "@aws-cdk/aws-apigateway";
import { Code, Function, Runtime } from "@aws-cdk/aws-lambda";
import { Construct, Stack, StackProps } from "@aws-cdk/core";

export class InfrastructureStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    new Function(this, "EventBridgeConsumerHandler", {
      code: Code.fromAsset("../eventbridge-consumer/lib"),
      handler: "consumer.handler",
      runtime: Runtime.NODEJS_12_X
    });

    const eventbridgeProducerLambda = new Function(
      this,
      "EventBridgeProducerHandler",
      {
        code: Code.fromAsset("../eventbridge-producer/lib"),
        handler: "producer.handler",
        runtime: Runtime.NODEJS_12_X
      }
    );

    const api = new LambdaRestApi(this, "EventBridgeProducerEndpoint", {
      handler: eventbridgeProducerLambda,
      proxy: false
    });

    const eventbridgeProducerResource = api.root.addResource(
      "eventbridge-producer"
    );

    eventbridgeProducerResource.addMethod("POST");
  }
}
