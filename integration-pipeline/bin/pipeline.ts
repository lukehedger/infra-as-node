#!/usr/bin/env node
import { App } from "@aws-cdk/core";
import { InfrastructureStack } from "../../cloud-infrastructure/lib/infrastructure-stack";
import { PipelineStack } from "../lib/pipeline-stack";

const app = new App();

const infrastructureStack = new InfrastructureStack(
  app,
  `InfrastructureStack-${process.env.GITHUB_PR_NUMBER}`
);

new PipelineStack(app, `PipelineStack-${process.env.GITHUB_PR_NUMBER}`, {
  eventbridgeConsumerLambdaCode:
    infrastructureStack.eventbridgeConsumerLambdaCode,
  eventbridgeProducerLambdaCode:
    infrastructureStack.eventbridgeProducerLambdaCode,
  eventbridgeS3LambdaCode: infrastructureStack.eventbridgeS3LambdaCode,
  slackAlertingLambdaCode: infrastructureStack.slackAlertingLambdaCode
});
