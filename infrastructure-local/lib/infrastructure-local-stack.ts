import { LambdaRestApi } from "@aws-cdk/aws-apigateway";
import { Stream, StreamEncryption } from "@aws-cdk/aws-kinesis";
import {
  Code,
  Function,
  Runtime,
  StartingPosition,
  Tracing
} from "@aws-cdk/aws-lambda";
import {
  KinesisEventSource,
  SqsEventSource
} from "@aws-cdk/aws-lambda-event-sources";
import { Queue, QueueEncryption } from "@aws-cdk/aws-sqs";
import { Construct, Duration, Stack, StackProps } from "@aws-cdk/core";

export class InfrastructureStack extends Stack {
  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    const kinesisStream = new Stream(this, "KinesisStream", {
      encryption: StreamEncryption.KMS
    });

    const kinesisConsumerDLQ = new Queue(this, "KinesisConsumerDLQ", {
      encryption: QueueEncryption.KMS_MANAGED,
      visibilityTimeout: Duration.seconds(30),
      receiveMessageWaitTime: Duration.seconds(20)
    });

    const dlqConsumerLambda = new Function(this, "DLQConsumerHandler", {
      code: Code.fromAsset("../dlq-consumer/lib"),
      handler: "consumer.handler",
      runtime: Runtime.NODEJS_10_X,
      tracing: Tracing.ACTIVE
    });

    dlqConsumerLambda.addEventSource(
      new SqsEventSource(kinesisConsumerDLQ, {
        batchSize: 10
      })
    );

    const kinesisConsumerLambda = new Function(this, "KinesisConsumerHandler", {
      code: Code.fromAsset("../kinesis-consumer/lib"),
      deadLetterQueue: kinesisConsumerDLQ,
      handler: "consumer.handler",
      runtime: Runtime.NODEJS_10_X,
      tracing: Tracing.ACTIVE
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
      runtime: Runtime.NODEJS_10_X,
      tracing: Tracing.ACTIVE
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
