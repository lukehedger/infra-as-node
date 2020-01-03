import { LambdaRestApi } from "@aws-cdk/aws-apigateway";
import { Stream, StreamEncryption } from "@aws-cdk/aws-kinesis";
import {
  CfnParametersCode,
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
  public readonly dlqConsumerLambdaCode: CfnParametersCode;
  public readonly kinesisConsumerLambdaCode: CfnParametersCode;
  public readonly kinesisProducerLambdaCode: CfnParametersCode;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.dlqConsumerLambdaCode = Code.cfnParameters();
    this.kinesisConsumerLambdaCode = Code.cfnParameters();
    this.kinesisProducerLambdaCode = Code.cfnParameters();

    const kinesisStreamName = "KinesisStream";

    const kinesisStream = new Stream(this, kinesisStreamName, {
      encryption: StreamEncryption.KMS
    });

    const kinesisConsumerDLQ = new Queue(this, "KinesisConsumerDLQ", {
      encryption: QueueEncryption.KMS_MANAGED,
      visibilityTimeout: Duration.seconds(30),
      receiveMessageWaitTime: Duration.seconds(20)
    });

    const dlqConsumerLambda = new Function(this, "DLQConsumerHandler", {
      code: this.dlqConsumerLambdaCode,
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
      code: this.kinesisConsumerLambdaCode,
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
      code: this.kinesisProducerLambdaCode,
      environment: {
        KINESIS_STREAM_NAME: kinesisStreamName
      },
      handler: "producer.handler",
      runtime: Runtime.NODEJS_10_X,
      tracing: Tracing.ACTIVE
    });

    const api = new LambdaRestApi(this, "KinesisProducerEndpoint", {
      handler: kinesisProducerLambda,
      proxy: false
    });

    const kinesisProducerResource = api.root.addResource("kinesis-producer");

    kinesisProducerResource.addMethod("POST");
  }
}
