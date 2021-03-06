#!/bin/sh

# Install NPM dependencies to local directory
npm install --no-package-lock --prefix pipeline-status --production

# Copy node_modules to Lambda Layer directory
cp -r pipeline-status/node_modules/ pipeline-layer/nodejs/node_modules

# Remove symlinks from Lambda Layer node_modules
rm -rf pipeline-layer/nodejs/node_modules/.bin
