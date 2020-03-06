import commonjs from "rollup-plugin-commonjs";
import nodeResolve from "rollup-plugin-node-resolve";
import { terser } from "rollup-plugin-terser";
import typescript from "rollup-plugin-typescript";

export default {
  input: "lib/consumer.ts",
  output: [
    {
      file: "lib/consumer.js",
      format: "cjs"
    }
  ],
  plugins: [
    nodeResolve({ preferBuiltins: true }),
    commonjs({
      namedExports: {
        "@aws-sdk/client-eventbridge-s3": ["PutObjectCommand", "S3Client"]
      }
    }),
    typescript(),
    terser()
  ],
  watch: {
    clearScreen: false
  }
};
