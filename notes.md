- App with Snowpack + TypeScript (email address input) - force S3 bucket teardown in Actions
- Add S3 website bucket CloudFront distro to CDK app
- Pushstate API support for static S3/CloudFront site
  https://sanderknape.com/2020/02/building-a-static-serverless-website-using-s3-cloudfront/
- CSP for AWS S3/CloudFront website
  https://www.savjee.be/2018/05/Content-security-policy-and-aws-s3-cloudfront/
- WAF between API Gateway and S3
- API Gateway IAM authorizer
  https://docs.aws.amazon.com/cdk/api/latest/docs/aws-apigateway-readme.html#authorizers

---

- Deployment rollout (API Gateway, Lambda, CloudFront, other?) + rollback (on test fail)
- Add Thundra tracer to Lambdas
  https://github.com/thundra-io/thundra-lambda-agent-nodejs
- Add Lumigo tracer to Lambdas
  https://github.com/lumigo-io/lumigo-node

---

- DynamoDB EventBridge consumer in CDK
- SES EventBridge consumer in CDK
- HTTP API Gateway (rather than REST) - currently in beta
