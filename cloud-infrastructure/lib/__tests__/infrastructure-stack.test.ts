import "@aws-cdk/assert/jest";
import { App } from "@aws-cdk/core";
import { InfrastructureStack } from "../infrastructure-stack";

let stack: InfrastructureStack;

beforeAll(() => {
  const app = new App();

  stack = new InfrastructureStack(app, "InfrastructureStack");
});

test("Stack has API Gateway EventBridge producer REST API resource", () => {
  expect(stack).toHaveResource("AWS::ApiGateway::RestApi", {
    Name: "EventBridgeProducerEndpoint-Production"
  });
});

test("Stack has API Gateway EventBridge producer endpoint resource", () => {
  expect(stack).toHaveResource("AWS::ApiGateway::Resource", {
    PathPart: "eventbridge-producer"
  });
});

test("Stack has API Gateway EventBridge producer Proxy POST method resource", () => {
  expect(stack).toHaveResourceLike("AWS::ApiGateway::Method", {
    AuthorizationType: "NONE",
    HttpMethod: "POST",
    Integration: {
      IntegrationHttpMethod: "POST",
      Type: "AWS_PROXY"
    }
  });
});

test("Stack has API Gateway EventBridge producer deployment stage resource", () => {
  const stageName = process.env.GITHUB_PR_NUMBER
    ? `integration-${process.env.GITHUB_PR_NUMBER}`
    : "prod";

  expect(stack).toHaveResourceLike("AWS::ApiGateway::Stage", {
    StageName: stageName
  });
});

test("Stack has CloudFront static app Distribution resource", () => {
  expect(stack).toHaveResourceLike("AWS::CloudFront::Distribution", {
    DistributionConfig: {
      DefaultCacheBehavior: {
        AllowedMethods: ["GET", "HEAD"],
        CachedMethods: ["GET", "HEAD"],
        Compress: true,
        ForwardedValues: {
          Cookies: {
            Forward: "none"
          },
          QueryString: false
        },
        TargetOriginId: "origin1",
        ViewerProtocolPolicy: "redirect-to-https"
      },
      DefaultRootObject: "index.html",
      Enabled: true,
      HttpVersion: "http2",
      IPV6Enabled: true,
      PriceClass: "PriceClass_100",
      ViewerCertificate: {
        CloudFrontDefaultCertificate: true
      }
    }
  });
});

test("Stack has CloudWatch EventBridge consumer Lambda errors Alarm resource", () => {
  const alarmName = process.env.GITHUB_PR_NUMBER
    ? `EventBridgeConsumerLambdaErrorsAlarm-Integration-${process.env.GITHUB_PR_NUMBER}`
    : "EventBridgeConsumerLambdaErrorsAlarm-Production";

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    ComparisonOperator: "GreaterThanOrEqualToThreshold",
    EvaluationPeriods: 2,
    AlarmName: alarmName,
    MetricName: "Errors",
    Namespace: "AWS/Lambda",
    Period: 300,
    Statistic: "Sum",
    Threshold: 10
  });
});

test("Stack has CloudWatch EventBridge consumer Lambda throttles Alarm resource", () => {
  const alarmName = process.env.GITHUB_PR_NUMBER
    ? `EventBridgeConsumerLambdaThrottlesAlarm-Integration-${process.env.GITHUB_PR_NUMBER}`
    : "EventBridgeConsumerLambdaThrottlesAlarm-Production";

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    ComparisonOperator: "GreaterThanOrEqualToThreshold",
    EvaluationPeriods: 2,
    AlarmName: alarmName,
    MetricName: "Throttles",
    Namespace: "AWS/Lambda",
    Period: 300,
    Statistic: "Sum",
    Threshold: 10
  });
});

test("Stack has CloudWatch EventBridge producer Lambda errors Alarm resource", () => {
  const alarmName = process.env.GITHUB_PR_NUMBER
    ? `EventBridgeProducerLambdaErrorsAlarm-Integration-${process.env.GITHUB_PR_NUMBER}`
    : "EventBridgeProducerLambdaErrorsAlarm-Production";

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    ComparisonOperator: "GreaterThanOrEqualToThreshold",
    EvaluationPeriods: 2,
    AlarmName: alarmName,
    MetricName: "Errors",
    Namespace: "AWS/Lambda",
    Period: 300,
    Statistic: "Sum",
    Threshold: 10
  });
});

test("Stack has CloudWatch EventBridge producer Lambda throttles Alarm resource", () => {
  const alarmName = process.env.GITHUB_PR_NUMBER
    ? `EventBridgeProducerLambdaThrottlesAlarm-Integration-${process.env.GITHUB_PR_NUMBER}`
    : "EventBridgeProducerLambdaThrottlesAlarm-Production";

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    ComparisonOperator: "GreaterThanOrEqualToThreshold",
    EvaluationPeriods: 2,
    AlarmName: alarmName,
    MetricName: "Throttles",
    Namespace: "AWS/Lambda",
    Period: 300,
    Statistic: "Sum",
    Threshold: 10
  });
});

test("Stack has CloudWatch EventBridge S3 Lambda errors Alarm resource", () => {
  const alarmName = process.env.GITHUB_PR_NUMBER
    ? `EventBridgeS3LambdaErrorsAlarm-Integration-${process.env.GITHUB_PR_NUMBER}`
    : "EventBridgeS3LambdaErrorsAlarm-Production";

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    ComparisonOperator: "GreaterThanOrEqualToThreshold",
    EvaluationPeriods: 2,
    AlarmName: alarmName,
    MetricName: "Errors",
    Namespace: "AWS/Lambda",
    Period: 300,
    Statistic: "Sum",
    Threshold: 10
  });
});

test("Stack has CloudWatch EventBridge S3 Lambda throttles Alarm resource", () => {
  const alarmName = process.env.GITHUB_PR_NUMBER
    ? `EventBridgeS3LambdaThrottlesAlarm-Integration-${process.env.GITHUB_PR_NUMBER}`
    : "EventBridgeS3LambdaThrottlesAlarm-Production";

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Alarm", {
    ComparisonOperator: "GreaterThanOrEqualToThreshold",
    EvaluationPeriods: 2,
    AlarmName: alarmName,
    MetricName: "Throttles",
    Namespace: "AWS/Lambda",
    Period: 300,
    Statistic: "Sum",
    Threshold: 10
  });
});

test("Stack has CloudWatch god mode Dashboard resource", () => {
  const dashboardName = process.env.GITHUB_PR_NUMBER
    ? `Dashboard-Integration-${process.env.GITHUB_PR_NUMBER}`
    : "Dashboard-Production";

  expect(stack).toHaveResourceLike("AWS::CloudWatch::Dashboard", {
    DashboardName: dashboardName
  });
});

test("Stack has EventBridge consumer Rule resource", () => {
  expect(stack).toHaveResource("AWS::Events::Rule", {
    EventPattern: {
      detail: {
        status: ["active"]
      },
      source: ["com.ian"]
    },
    State: "ENABLED"
  });
});

test("Stack has EventBridge consumer Lambda resource", () => {
  const functionName = process.env.GITHUB_PR_NUMBER
    ? `EventBridgeConsumer-Integration-${process.env.GITHUB_PR_NUMBER}`
    : "EventBridgeConsumer-Production";

  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Code: {
      S3Bucket: {
        Ref: stack.resolve(stack.eventbridgeConsumerLambdaCode.bucketNameParam)
      },
      S3Key: {
        Ref: stack.resolve(stack.eventbridgeConsumerLambdaCode.objectKeyParam)
      }
    },
    FunctionName: functionName,
    Handler: "consumer.handler",
    Runtime: "nodejs12.x",
    TracingConfig: {
      Mode: "Active"
    }
  });
});

test("Stack has EventBridge producer Lambda resource", () => {
  const functionName = process.env.GITHUB_PR_NUMBER
    ? `EventBridgeProducer-Integration-${process.env.GITHUB_PR_NUMBER}`
    : "EventBridgeProducer-Production";

  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Code: {
      S3Bucket: {
        Ref: stack.resolve(stack.eventbridgeProducerLambdaCode.bucketNameParam)
      },
      S3Key: {
        Ref: stack.resolve(stack.eventbridgeProducerLambdaCode.objectKeyParam)
      }
    },
    FunctionName: functionName,
    Handler: "producer.handler",
    Runtime: "nodejs12.x",
    TracingConfig: {
      Mode: "Active"
    }
  });
});

test("Stack has EventBridge S3 Lambda resource", () => {
  const functionName = process.env.GITHUB_PR_NUMBER
    ? `EventBridgeS3-Integration-${process.env.GITHUB_PR_NUMBER}`
    : "EventBridgeS3-Production";

  expect(stack).toHaveResourceLike("AWS::Lambda::Function", {
    Code: {
      S3Bucket: {
        Ref: stack.resolve(stack.eventbridgeS3LambdaCode.bucketNameParam)
      },
      S3Key: {
        Ref: stack.resolve(stack.eventbridgeS3LambdaCode.objectKeyParam)
      }
    },
    Environment: {
      Variables: {
        BUCKET_NAME: {}
      }
    },
    FunctionName: functionName,
    Handler: "consumer.handler",
    Runtime: "nodejs12.x",
    TracingConfig: {
      Mode: "Active"
    }
  });
});

test("Stack has Slack alerting Lambda resource", () => {
  const functionName = process.env.GITHUB_PR_NUMBER
    ? `SlackAlerting-Integration-${process.env.GITHUB_PR_NUMBER}`
    : "SlackAlerting-Production";

  expect(stack).toHaveResource("AWS::Lambda::Function", {
    Code: {
      S3Bucket: {
        Ref: stack.resolve(stack.slackAlertingLambdaCode.bucketNameParam)
      },
      S3Key: {
        Ref: stack.resolve(stack.slackAlertingLambdaCode.objectKeyParam)
      }
    },
    Environment: {
      Variables: {
        AWS_SECRETS_SLACK: "dev/Tread/SlackAPI"
      }
    },
    FunctionName: functionName,
    Handler: "alerting.handler",
    Runtime: "nodejs12.x",
    TracingConfig: {
      Mode: "Active"
    }
  });
});

test("Stack has S3 event log Bucket resource", () => {
  const bucketName = process.env.GITHUB_PR_NUMBER
    ? `eventlog-integration-${process.env.GITHUB_PR_NUMBER}`
    : "eventlog-production";

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    BucketName: bucketName
  });
});

test("Stack has S3 static app Bucket resource", () => {
  const bucketName = process.env.GITHUB_PR_NUMBER
    ? `static-app-${process.env.GITHUB_PR_NUMBER}`
    : "static-app-production";

  expect(stack).toHaveResource("AWS::S3::Bucket", {
    BucketName: bucketName,
    WebsiteConfiguration: {
      ErrorDocument: "index.html",
      IndexDocument: "index.html"
    }
  });
});
