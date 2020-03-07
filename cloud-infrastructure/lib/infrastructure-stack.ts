import { LambdaRestApi } from "@aws-cdk/aws-apigateway";
import { EventBus, Rule } from "@aws-cdk/aws-events";
import { LambdaFunction } from "@aws-cdk/aws-events-targets";
import {
  CfnParametersCode,
  Code,
  Function,
  Runtime,
  Tracing
} from "@aws-cdk/aws-lambda";
import { SnsDestination } from "@aws-cdk/aws-lambda-destinations";
import { Bucket } from "@aws-cdk/aws-s3";
import { Topic } from "@aws-cdk/aws-sns";
import { Construct, Stack, StackProps } from "@aws-cdk/core";

export class InfrastructureStack extends Stack {
  public readonly eventbridgeConsumerLambdaCode: CfnParametersCode;
  public readonly eventbridgeProducerLambdaCode: CfnParametersCode;
  public readonly eventbridgeS3LambdaCode: CfnParametersCode;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.eventbridgeConsumerLambdaCode = Code.cfnParameters();
    this.eventbridgeProducerLambdaCode = Code.cfnParameters();
    this.eventbridgeS3LambdaCode = Code.cfnParameters();

    const eventBridgeConsumerSuccessTopic = new Topic(
      this,
      "EventBridgeConsumerSuccessTopic"
    );

    const eventbridgeConsumerRule = new Rule(this, "EventBridgeConsumerRule", {
      eventPattern: {
        detail: {
          status: ["active"]
        },
        source: ["com.ian"]
      }
    });

    const eventbridgeConsumerLambda = new Function(
      this,
      "EventBridgeConsumerHandler",
      {
        code: this.eventbridgeConsumerLambdaCode,
        handler: "consumer.handler",
        onSuccess: new SnsDestination(eventBridgeConsumerSuccessTopic),
        runtime: Runtime.NODEJS_12_X,
        tracing: Tracing.ACTIVE
      }
    );

    eventbridgeConsumerRule.addTarget(
      new LambdaFunction(eventbridgeConsumerLambda)
    );

    const eventLogBucket = new Bucket(this, "EventLog");

    const eventbridgeS3Lambda = new Function(this, "EventBridgeS3Handler", {
      code: this.eventbridgeS3LambdaCode,
      environment: {
        BUCKET_NAME: eventLogBucket.bucketName
      },
      handler: "consumer.handler",
      runtime: Runtime.NODEJS_12_X,
      tracing: Tracing.ACTIVE
    });

    eventbridgeConsumerRule.addTarget(new LambdaFunction(eventbridgeS3Lambda));

    eventLogBucket.grantPut(eventbridgeS3Lambda);

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

    EventBus.grantPutEvents(eventbridgeProducerLambda);

    const apiName = process.env.GITHUB_PR_NUMBER
      ? `EventBridgeProducerEndpoint-Integration-${process.env.GITHUB_PR_NUMBER}`
      : "EventBridgeProducerEndpoint-Production";

    const stageName = process.env.GITHUB_PR_NUMBER
      ? `integration-${process.env.GITHUB_PR_NUMBER}`
      : "prod";

    const api = new LambdaRestApi(this, apiName, {
      deployOptions: {
        stageName: stageName
      },
      endpointExportName: apiName,
      handler: eventbridgeProducerLambda,
      proxy: false,
      restApiName: apiName
    });

    const eventbridgeProducerResource = api.root.addResource(
      "eventbridge-producer"
    );

    eventbridgeProducerResource.addMethod("POST");
  }
}
