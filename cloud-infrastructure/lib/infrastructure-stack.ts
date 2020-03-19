import { LambdaRestApi } from "@aws-cdk/aws-apigateway";
import { CloudFrontWebDistribution } from "@aws-cdk/aws-cloudfront";
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
import { Construct, RemovalPolicy, Stack, StackProps } from "@aws-cdk/core";

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
        functionName: process.env.GITHUB_PR_NUMBER
          ? `EventBridgeConsumer-Integration-${process.env.GITHUB_PR_NUMBER}`
          : "EventBridgeConsumer-Production",
        handler: "consumer.handler",
        onSuccess: new SnsDestination(eventBridgeConsumerSuccessTopic),
        runtime: Runtime.NODEJS_12_X,
        tracing: Tracing.ACTIVE
      }
    );

    eventbridgeConsumerRule.addTarget(
      new LambdaFunction(eventbridgeConsumerLambda)
    );

    const eventLogBucketName = process.env.GITHUB_PR_NUMBER
      ? `eventlog-integration-${process.env.GITHUB_PR_NUMBER}`
      : "eventlog-production";

    const eventLogBucket = new Bucket(this, eventLogBucketName);

    const eventbridgeS3Lambda = new Function(this, "EventBridgeS3Handler", {
      code: this.eventbridgeS3LambdaCode,
      environment: {
        BUCKET_NAME: eventLogBucket.bucketName
      },
      functionName: process.env.GITHUB_PR_NUMBER
        ? `EventBridgeS3-Integration-${process.env.GITHUB_PR_NUMBER}`
        : "EventBridgeS3-Production",
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
        functionName: process.env.GITHUB_PR_NUMBER
          ? `EventBridgeProducer-Integration-${process.env.GITHUB_PR_NUMBER}`
          : "EventBridgeProducer-Production",
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

    const staticAppBucketName = process.env.GITHUB_PR_NUMBER
      ? `static-app-${process.env.GITHUB_PR_NUMBER}`
      : "static-app-production";

    const staticAppBucket = new Bucket(this, "StaticAppSource", {
      bucketName: staticAppBucketName,
      publicReadAccess: true,
      removalPolicy: RemovalPolicy.DESTROY,
      websiteIndexDocument: "index.html"
    });

    new CloudFrontWebDistribution(this, "StaticAppDistribution", {
      originConfigs: [
        {
          behaviors: [{ isDefaultBehavior: true }],
          s3OriginSource: { s3BucketSource: staticAppBucket }
        }
      ]
    });
  }
}
