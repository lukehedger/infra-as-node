import commonjs from "rollup-plugin-commonjs";
import nodeResolve from "rollup-plugin-node-resolve";
import { terser } from "rollup-plugin-terser";
import typescript from "rollup-plugin-typescript";

export default {
  input: "lib/producer.ts",
  output: [
    {
      file: "lib/producer.js",
      format: "cjs"
    }
  ],
  plugins: [
    nodeResolve({ preferBuiltins: true }),
    commonjs({
      namedExports: {
        "@aws-sdk/client-eventbridge-node": [
          "EventBridgeClient",
          "PutEventsCommand"
        ]
      }
    }),
    typescript(),
    terser()
  ],
  watch: {
    clearScreen: false
  }
};
