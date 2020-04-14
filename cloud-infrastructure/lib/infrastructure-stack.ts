import { LambdaRestApi } from "@aws-cdk/aws-apigateway";
import { Certificate } from "@aws-cdk/aws-certificatemanager";
import {
  CloudFrontWebDistribution,
  ViewerCertificate,
} from "@aws-cdk/aws-cloudfront";
import { Dashboard, GraphWidget, Row } from "@aws-cdk/aws-cloudwatch";
import { SnsAction } from "@aws-cdk/aws-cloudwatch-actions";
import { EventBus, Rule } from "@aws-cdk/aws-events";
import { LambdaFunction } from "@aws-cdk/aws-events-targets";
import {
  CfnParametersCode,
  Code,
  Function,
  LayerVersion,
  Runtime,
  Tracing,
} from "@aws-cdk/aws-lambda";
import {
  SnsDestination,
  SqsDestination,
} from "@aws-cdk/aws-lambda-destinations";
import { SnsEventSource } from "@aws-cdk/aws-lambda-event-sources";
// import { ARecord, HostedZone, RecordTarget } from "@aws-cdk/aws-route53";
// import { ApiGateway, CloudFrontTarget } from "@aws-cdk/aws-route53-targets";
import { BlockPublicAccess, Bucket } from "@aws-cdk/aws-s3";
import { Secret } from "@aws-cdk/aws-secretsmanager";
import { Topic } from "@aws-cdk/aws-sns";
import { Queue, QueueEncryption } from "@aws-cdk/aws-sqs";
import {
  CfnParameter,
  Construct,
  RemovalPolicy,
  Stack,
  StackProps,
} from "@aws-cdk/core";

export class InfrastructureStack extends Stack {
  public readonly dependencyLayerLambdaCode: CfnParametersCode;
  public readonly eventbridgeConsumerLambdaCode: CfnParametersCode;
  public readonly eventbridgeProducerLambdaCode: CfnParametersCode;
  public readonly eventbridgeS3LambdaCode: CfnParametersCode;
  public readonly slackAlertingLambdaCode: CfnParametersCode;

  constructor(scope: Construct, id: string, props?: StackProps) {
    super(scope, id, props);

    this.dependencyLayerLambdaCode = Code.cfnParameters({
      bucketNameParam: new CfnParameter(this, "BA"),
      objectKeyParam: new CfnParameter(this, "OA"),
    });

    this.eventbridgeConsumerLambdaCode = Code.cfnParameters({
      bucketNameParam: new CfnParameter(this, "BB"),
      objectKeyParam: new CfnParameter(this, "OB"),
    });

    this.eventbridgeProducerLambdaCode = Code.cfnParameters({
      bucketNameParam: new CfnParameter(this, "BC"),
      objectKeyParam: new CfnParameter(this, "OC"),
    });

    this.eventbridgeS3LambdaCode = Code.cfnParameters({
      bucketNameParam: new CfnParameter(this, "BD"),
      objectKeyParam: new CfnParameter(this, "OD"),
    });

    this.slackAlertingLambdaCode = Code.cfnParameters({
      bucketNameParam: new CfnParameter(this, "BE"),
      objectKeyParam: new CfnParameter(this, "OE"),
    });

    const SlackAPISecret = Secret.fromSecretArn(
      this,
      "SlackAPISecret",
      "arn:aws:secretsmanager:eu-west-2:614517326458:secret:dev/Tread/SlackAPI*"
    );

    const dependencyLayer = new LayerVersion(this, "DependencyLayer", {
      code: this.dependencyLayerLambdaCode,
      compatibleRuntimes: [Runtime.NODEJS_12_X],
    });

    const eventbridgeConsumerRule = new Rule(this, "EventBridgeConsumerRule", {
      eventPattern: {
        detail: {
          status: ["active"],
        },
        source: ["com.ian"],
      },
    });

    const eventBridgeConsumerSuccessTopic = new Topic(
      this,
      "EventBridgeConsumerSuccessTopic"
    );

    const eventBridgeConsumerFailureQueue = new Queue(
      this,
      "EventBridgeConsumerFailureQueue",
      {
        encryption: QueueEncryption.KMS_MANAGED,
      }
    );

    const eventbridgeConsumerLambda = new Function(
      this,
      "EventBridgeConsumerHandler",
      {
        code: this.eventbridgeConsumerLambdaCode,
        functionName: process.env.GITHUB_PR_NUMBER
          ? `EventBridgeConsumer-Integration-${process.env.GITHUB_PR_NUMBER}`
          : "EventBridgeConsumer-Production",
        handler: "consumer.handler",
        layers: [dependencyLayer],
        onFailure: new SqsDestination(eventBridgeConsumerFailureQueue),
        onSuccess: new SnsDestination(eventBridgeConsumerSuccessTopic),
        runtime: Runtime.NODEJS_12_X,
        tracing: Tracing.ACTIVE,
      }
    );

    eventbridgeConsumerRule.addTarget(
      new LambdaFunction(eventbridgeConsumerLambda)
    );

    const eventLogBucketName = process.env.GITHUB_PR_NUMBER
      ? `EventLog-Integration-${process.env.GITHUB_PR_NUMBER}`
      : "EventLog-Production";

    const eventLogBucket = new Bucket(this, eventLogBucketName, {
      blockPublicAccess: BlockPublicAccess.BLOCK_ALL,
      bucketName: eventLogBucketName.toLowerCase(),
      removalPolicy: RemovalPolicy.RETAIN,
    });

    const eventLogFailureQueue = new Queue(this, "EventLogFailureQueue", {
      encryption: QueueEncryption.KMS_MANAGED,
    });

    const eventbridgeS3Lambda = new Function(this, "EventBridgeS3Handler", {
      code: this.eventbridgeS3LambdaCode,
      environment: {
        BUCKET_NAME: eventLogBucket.bucketName,
      },
      functionName: process.env.GITHUB_PR_NUMBER
        ? `EventBridgeS3-Integration-${process.env.GITHUB_PR_NUMBER}`
        : "EventBridgeS3-Production",
      handler: "consumer.handler",
      layers: [dependencyLayer],
      onFailure: new SqsDestination(eventLogFailureQueue),
      runtime: Runtime.NODEJS_12_X,
      tracing: Tracing.ACTIVE,
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
        layers: [dependencyLayer],
        runtime: Runtime.NODEJS_12_X,
        tracing: Tracing.ACTIVE,
      }
    );

    EventBus.grantPutEvents(eventbridgeProducerLambda);

    const slackAlertingLambda = new Function(this, "SlackAlertingLambda", {
      code: this.slackAlertingLambdaCode,
      environment: {
        AWS_SECRETS_SLACK: "dev/Tread/SlackAPI",
      },
      functionName: process.env.GITHUB_PR_NUMBER
        ? `SlackAlerting-Integration-${process.env.GITHUB_PR_NUMBER}`
        : "SlackAlerting-Production",
      handler: "alerting.handler",
      layers: [dependencyLayer],
      runtime: Runtime.NODEJS_12_X,
      tracing: Tracing.ACTIVE,
    });

    SlackAPISecret.grantRead(slackAlertingLambda);

    const apiName = process.env.GITHUB_PR_NUMBER
      ? `EventBridgeProducerEndpoint-Integration-${process.env.GITHUB_PR_NUMBER}`
      : "EventBridgeProducerEndpoint-Production";

    const stageName = process.env.GITHUB_PR_NUMBER
      ? `integration-${process.env.GITHUB_PR_NUMBER}`
      : "prod";

    const apiDomainName = "api.ian.level-out.com";

    const apiCertificate = Certificate.fromCertificateArn(
      this,
      "APICertificate",
      "arn:aws:acm:eu-west-2:614517326458:certificate/e92d37e5-9eaa-4a66-a340-a8e136786250"
    );

    const api = new LambdaRestApi(this, apiName, {
      deployOptions: {
        stageName: stageName,
      },
      domainName: {
        certificate: apiCertificate,
        domainName: apiDomainName,
      },
      endpointExportName: apiName,
      handler: eventbridgeProducerLambda,
      proxy: false,
      restApiName: apiName,
    });

    // const hostedZone = HostedZone.fromHostedZoneAttributes(this, "HostedZone", {
    //   hostedZoneId: "Z0598212RUKTJD8647W3",
    //   zoneName: "ian.level-out.com",
    // });

    // new ARecord(this, "APIGatewayAliasRecord", {
    //   target: RecordTarget.fromAlias(new ApiGateway(api)),
    //   zone: hostedZone,
    // });

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
      websiteErrorDocument: "index.html",
      websiteIndexDocument: "index.html",
    });

    const staticAppCertificate = Certificate.fromCertificateArn(
      this,
      "StaticAppCertificate",
      "arn:aws:acm:us-east-1:614517326458:certificate/31aaf78e-2abb-47af-bffd-e29b987a9d5e"
    );

    const staticAppDistributionName = process.env.GITHUB_PR_NUMBER
      ? `StaticAppDistribution-Integration-${process.env.GITHUB_PR_NUMBER}`
      : "StaticAppDistribution-Production";

    const staticAppDistribution = new CloudFrontWebDistribution(
      this,
      staticAppDistributionName,
      {
        errorConfigurations: [
          {
            errorCachingMinTtl: 0,
            errorCode: 403,
            responseCode: 200,
            responsePagePath: "/index.html",
          },
          {
            errorCachingMinTtl: 0,
            errorCode: 404,
            responseCode: 200,
            responsePagePath: "/index.html",
          },
        ],
        originConfigs: [
          {
            behaviors: [{ isDefaultBehavior: true }],
            originHeaders: {
              "Content-Security-Policy":
                "default-src https: 'unsafe-inline'; img-src https: data: blob:; object-src 'none'; frame-ancestors 'self';",
              "Strict-Transport-Security":
                "max-age=63072000; includeSubDomains; preload",
              "X-Frame-Options": "SAMEORIGIN",
              "Referrer-Policy": "strict-origin-when-cross-origin",
              "X-Content-Type-Options": "nosniff",
              "X-XSS-Protection": "1; mode=block",
            },
            s3OriginSource: { s3BucketSource: staticAppBucket },
          },
        ],
        viewerCertificate: ViewerCertificate.fromAcmCertificate(
          staticAppCertificate
        ),
      }
    );

    // new ARecord(this, "StaticAppDistributionAliasRecord", {
    //   target: RecordTarget.fromAlias(
    //     new CloudFrontTarget(staticAppDistribution)
    //   ),
    //   zone: hostedZone,
    // });

    const godModeDashboardName = process.env.GITHUB_PR_NUMBER
      ? `Dashboard-Integration-${process.env.GITHUB_PR_NUMBER}`
      : "Dashboard-Production";

    const godModeDashboard = new Dashboard(this, "GodModeDashboard", {
      dashboardName: godModeDashboardName,
    });

    godModeDashboard.addWidgets(
      new Row(
        new GraphWidget({
          left: [
            eventbridgeConsumerLambda.metricInvocations(),
            eventbridgeProducerLambda.metricInvocations(),
            eventbridgeS3Lambda.metricInvocations(),
          ],
          title: "Lambda Invocations",
        }),
        new GraphWidget({
          left: [
            eventbridgeConsumerLambda.metricDuration(),
            eventbridgeProducerLambda.metricDuration(),
            eventbridgeS3Lambda.metricDuration(),
          ],
          title: "Lambda Duration",
        }),
        new GraphWidget({
          left: [
            eventbridgeConsumerLambda.metricErrors(),
            eventbridgeProducerLambda.metricErrors(),
            eventbridgeS3Lambda.metricErrors(),
          ],
          title: "Lambda Errors",
        }),
        new GraphWidget({
          left: [
            eventbridgeConsumerLambda.metricThrottles(),
            eventbridgeProducerLambda.metricThrottles(),
            eventbridgeS3Lambda.metricThrottles(),
          ],
          title: "Lambda Throttles",
        })
      )
    );

    const applicationAlertsTopic = new Topic(this, "ApplicationAlertsTopic", {
      topicName: process.env.GITHUB_PR_NUMBER
        ? `ApplicationAlertsTopic-Integration-${process.env.GITHUB_PR_NUMBER}`
        : "ApplicationAlertsTopic-Production",
    });

    slackAlertingLambda.addEventSource(
      new SnsEventSource(applicationAlertsTopic)
    );

    const eventbridgeConsumerLambdaErrorsAlarm = eventbridgeConsumerLambda
      .metricErrors()
      .createAlarm(this, "EventBridgeConsumerLambdaErrorsAlarm", {
        alarmName: process.env.GITHUB_PR_NUMBER
          ? `EventBridgeConsumerLambdaErrorsAlarm-Integration-${process.env.GITHUB_PR_NUMBER}`
          : "EventBridgeConsumerLambdaErrorsAlarm-Production",
        evaluationPeriods: 2,
        threshold: 10,
      });

    eventbridgeConsumerLambdaErrorsAlarm.addAlarmAction(
      new SnsAction(applicationAlertsTopic)
    );

    const eventbridgeConsumerLambdaThrottlesAlarm = eventbridgeConsumerLambda
      .metricThrottles()
      .createAlarm(this, "EventBridgeConsumerLambdaThrottlesAlarm", {
        alarmName: process.env.GITHUB_PR_NUMBER
          ? `EventBridgeConsumerLambdaThrottlesAlarm-Integration-${process.env.GITHUB_PR_NUMBER}`
          : "EventBridgeConsumerLambdaThrottlesAlarm-Production",
        evaluationPeriods: 2,
        threshold: 10,
      });

    eventbridgeConsumerLambdaThrottlesAlarm.addAlarmAction(
      new SnsAction(applicationAlertsTopic)
    );

    const eventbridgeProducerLambdaErrorsAlarm = eventbridgeProducerLambda
      .metricErrors()
      .createAlarm(this, "EventBridgeProducerLambdaErrorsAlarm", {
        alarmName: process.env.GITHUB_PR_NUMBER
          ? `EventBridgeProducerLambdaErrorsAlarm-Integration-${process.env.GITHUB_PR_NUMBER}`
          : "EventBridgeProducerLambdaErrorsAlarm-Production",
        evaluationPeriods: 2,
        threshold: 10,
      });

    eventbridgeProducerLambdaErrorsAlarm.addAlarmAction(
      new SnsAction(applicationAlertsTopic)
    );

    const eventbridgeProducerLambdaThrottlesAlarm = eventbridgeProducerLambda
      .metricThrottles()
      .createAlarm(this, "EventBridgeProducerLambdaThrottlesAlarm", {
        alarmName: process.env.GITHUB_PR_NUMBER
          ? `EventBridgeProducerLambdaThrottlesAlarm-Integration-${process.env.GITHUB_PR_NUMBER}`
          : "EventBridgeProducerLambdaThrottlesAlarm-Production",
        evaluationPeriods: 2,
        threshold: 10,
      });

    eventbridgeProducerLambdaThrottlesAlarm.addAlarmAction(
      new SnsAction(applicationAlertsTopic)
    );

    const eventbridgeS3LambdaErrorsAlarm = eventbridgeS3Lambda
      .metricErrors()
      .createAlarm(this, "EventBridgeS3LambdaErrorsAlarm", {
        alarmName: process.env.GITHUB_PR_NUMBER
          ? `EventBridgeS3LambdaErrorsAlarm-Integration-${process.env.GITHUB_PR_NUMBER}`
          : "EventBridgeS3LambdaErrorsAlarm-Production",
        evaluationPeriods: 2,
        threshold: 10,
      });

    eventbridgeS3LambdaErrorsAlarm.addAlarmAction(
      new SnsAction(applicationAlertsTopic)
    );

    const eventbridgeS3LambdaThrottlesAlarm = eventbridgeS3Lambda
      .metricThrottles()
      .createAlarm(this, "EventBridgeS3LambdaThrottlesAlarm", {
        alarmName: process.env.GITHUB_PR_NUMBER
          ? `EventBridgeS3LambdaThrottlesAlarm-Integration-${process.env.GITHUB_PR_NUMBER}`
          : "EventBridgeS3LambdaThrottlesAlarm-Production",
        evaluationPeriods: 2,
        threshold: 10,
      });

    eventbridgeS3LambdaThrottlesAlarm.addAlarmAction(
      new SnsAction(applicationAlertsTopic)
    );
  }
}
