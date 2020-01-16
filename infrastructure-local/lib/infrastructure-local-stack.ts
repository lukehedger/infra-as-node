import { LambdaRestApi } from "@aws-cdk/aws-apigateway";
import { Stream, StreamEncryption } from "@aws-cdk/aws-kinesis";
import { Code, Function, Runtime, StartingPosition } from "@aws-cdk/aws-lambda";
import { LambdaDestination } from "@aws-cdk/aws-lambda-destinations";
import { KinesisEventSource } from "@aws-cdk/aws-lambda-event-sources";
import { Construct, Stack, StackProps } from "@aws-cdk/core";

export class InfrastructureStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const kinesisStream = new Stream(this, "KinesisStream", {
      encryption: StreamEncryption.KMS
    });

    const kinesisConsumerFailureLambda = new Function(
      this,
      "KinesisConsumerFailureHandler",
      {
        code: Code.fromAsset("../kinesis-consumer-failure/lib"),
        handler: "failure.handler",
        runtime: Runtime.NODEJS_10_X
      }
    );

    const kinesisConsumerSuccessLambda = new Function(
      this,
      "KinesisConsumerSuccessHandler",
      {
        code: Code.fromAsset("../kinesis-consumer-success/lib"),
        handler: "success.handler",
        runtime: Runtime.NODEJS_10_X
      }
    );

    const kinesisConsumerLambda = new Function(this, "KinesisConsumerHandler", {
      code: Code.fromAsset("../kinesis-consumer/lib"),
      handler: "consumer.handler",
      onFailure: new LambdaDestination(kinesisConsumerFailureLambda),
      onSuccess: new LambdaDestination(kinesisConsumerSuccessLambda),
      runtime: Runtime.NODEJS_10_X
    });

    kinesisConsumerLambda.addEventSource(
      new KinesisEventSource(kinesisStream, {
        batchSize: 100,
        startingPosition: StartingPosition.TRIM_HORIZON
      })
    );

    const kinesisProducerLambda = new Function(this, "KinesisProducerHandler", {
      code: Code.fromAsset("../kinesis-producer/lib"),
      environment: {
        KINESIS_STREAM_NAME: kinesisStream.streamName
      },
      handler: "producer.handler",
      runtime: Runtime.NODEJS_10_X
    });

    kinesisStream.grantWrite(kinesisProducerLambda);

    const api = new LambdaRestApi(this, "KinesisProducerEndpoint", {
      handler: kinesisProducerLambda,
      proxy: false
    });

    const kinesisProducerResource = api.root.addResource("kinesis-producer");

    kinesisProducerResource.addMethod("POST");
  }
}
