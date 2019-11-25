#!/usr/bin/env node
import { App } from "@aws-cdk/core";
import { PipelineStack } from "../lib/pipeline-stack";

const app = new App();

new PipelineStack(app, "PipelineStack");
