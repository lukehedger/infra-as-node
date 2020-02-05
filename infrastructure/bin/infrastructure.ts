#!/usr/bin/env node
import { App } from "@aws-cdk/core";
import { InfrastructureStack } from "../lib/infrastructure-stack";

const app = new App();

const stackName = process.env.GITHUB_PR_NUMBER
  ? `InfrastructureStack-${process.env.GITHUB_PR_NUMBER}`
  : "InfrastructureStack";

new InfrastructureStack(app, stackName);
