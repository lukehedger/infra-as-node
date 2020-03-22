import commonjs from "rollup-plugin-commonjs";
import nodeResolve from "rollup-plugin-node-resolve";
import typescript from "rollup-plugin-typescript";

export default {
  external: [
    "child_process",
    "crypto",
    "dns",
    "events",
    "fs",
    "http",
    "https",
    "net",
    "os",
    "path",
    "process",
    "stream",
    "tls",
    "url",
    "util",
    "zlib"
  ],
  input: "lib/alerting.ts",
  output: [
    {
      file: "lib/alerting.js",
      format: "cjs"
    }
  ],
  plugins: [
    nodeResolve({ preferBuiltins: true }),
    commonjs({
      include: "../node_modules/**",
      namedExports: {
        "@aws-sdk/client-secrets-manager-node": [
          "GetSecretValueCommand",
          "SecretsManagerClient"
        ]
      }
    }),
    typescript()
  ],
  watch: {
    clearScreen: false
  }
};
