import commonjs from "rollup-plugin-commonjs";
import json from "@rollup/plugin-json";
import nodeResolve from "rollup-plugin-node-resolve";
import typescript from "rollup-plugin-typescript";

export default {
  external: [
    "child_process",
    "crypto",
    "fs",
    "http",
    "https",
    "os",
    "path",
    "process",
    "stream",
    "url",
    "zlib"
  ],
  input: "lib/status.ts",
  output: [
    {
      file: "lib/status.js",
      format: "cjs"
    }
  ],
  plugins: [
    nodeResolve({ mainFields: ["main"], preferBuiltins: true }),
    commonjs({
      include: "../node_modules/**",
      namedExports: {
        "@aws-sdk/client-codepipeline-node": [
          "CodePipelineClient",
          "GetPipelineExecutionCommand"
        ],
        "@aws-sdk/client-secrets-manager-node": [
          "GetSecretValueCommand",
          "SecretsManagerClient"
        ],
        "@octokit/rest": ["Octokit"]
      }
    }),
    typescript(),
    json()
  ],
  watch: {
    clearScreen: false
  }
};
