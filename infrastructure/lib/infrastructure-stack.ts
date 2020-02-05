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
import { KinesisEventSource } from "@aws-cdk/aws-lambda-event-sources";
import { Construct, Stack, StackProps } from "@aws-cdk/core";

export class InfrastructureStack extends Stack {
  public readonly kinesisConsumerLambdaCode: CfnParametersCode;
  public readonly kinesisProducerLambdaCode: CfnParametersCode;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.kinesisConsumerLambdaCode = Code.cfnParameters();
    this.kinesisProducerLambdaCode = Code.cfnParameters();

    const kinesisStream = new Stream(this, "KinesisStream", {
      encryption: StreamEncryption.KMS
    });

    const kinesisConsumerLambda = new Function(this, "KinesisConsumerHandler", {
      code: this.kinesisConsumerLambdaCode,
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
