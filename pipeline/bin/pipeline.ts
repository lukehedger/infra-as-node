#!/usr/bin/env node
import { App } from "@aws-cdk/core";
import { InfrastructureStack } from "../../infrastructure/lib/infrastructure-stack";
import { PipelineStack } from "../lib/pipeline-stack";

const app = new App();

const infrastructureStack = new InfrastructureStack(
  app,
  "InfrastructureDeploymentStack2"
);

new PipelineStack(app, "PipelineStack", {
  pingLambdaCode: infrastructureStack.pingLambdaCode
});
