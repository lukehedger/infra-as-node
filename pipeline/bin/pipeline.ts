#!/usr/bin/env node
import { App } from "@aws-cdk/core";
import { InfrastructureStack } from "../../infrastructure/lib/infrastructure-stack";
import { PipelineStack } from "../lib/pipeline-stack";

const app = new App();

const infrastructureStack = new InfrastructureStack(app, "InfrastructureStack");

new PipelineStack(app, "PipelineStack", {
  kinesisConsumerLambdaCode: infrastructureStack.kinesisConsumerLambdaCode,
  kinesisConsumerFailureLambdaCode:
    infrastructureStack.kinesisConsumerFailureLambdaCode,
  kinesisConsumerSuccessLambdaCode:
    infrastructureStack.kinesisConsumerSuccessLambdaCode,
  kinesisProducerLambdaCode: infrastructureStack.kinesisProducerLambdaCode
});
