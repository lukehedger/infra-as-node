#!/usr/bin/env node
import { App } from "@aws-cdk/core";
import { InfrastructureStack } from "../../infrastructure/lib/infrastructure-stack";
import { PipelineStack } from "../lib/pipeline-stack";

const app = new App();

const infrastructureStack = new InfrastructureStack(
  app,
  `InfrastructureStack-${process.env.GITHUB_PR_NUMBER}`
);

new PipelineStack(app, `PipelineStack-${process.env.GITHUB_PR_NUMBER}`, {
  kinesisConsumerLambdaCode: infrastructureStack.kinesisConsumerLambdaCode,
  kinesisProducerLambdaCode: infrastructureStack.kinesisProducerLambdaCode
});
