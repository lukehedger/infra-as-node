#!/bin/sh

# Install Yarn workspace dependencies to Lambda Layer directory
yarn install --modules-folder dependency-layer/nodejs/node_modules --no-progresss --non-interactive --production --silent

# Remove workspace directories from Lambda Layer node_modules
# to prevent circular references
rm -rf \
  dependency-layer/nodejs/node_modules/cloud-infrastructure \
  dependency-layer/nodejs/node_modules/eventbridge-consumer \
  dependency-layer/nodejs/node_modules/eventbridge-producer \
  dependency-layer/nodejs/node_modules/eventbridge-s3 \
  dependency-layer/nodejs/node_modules/integration-pipeline \
  dependency-layer/nodejs/node_modules/pipeline-status \
  dependency-layer/nodejs/node_modules/production-pipeline \
  dependency-layer/nodejs/node_modules/slack-alerting \
  dependency-layer/nodejs/node_modules/static-app
