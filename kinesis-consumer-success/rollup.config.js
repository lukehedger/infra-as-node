import nodeResolve from "rollup-plugin-node-resolve";
import { terser } from "rollup-plugin-terser";
import typescript from "rollup-plugin-typescript";

export default {
  input: "lib/success.ts",
  output: [
    {
      file: "lib/success.js",
      format: "cjs"
    }
  ],
  plugins: [nodeResolve({ preferBuiltins: true }), typescript(), terser()],
  watch: {
    clearScreen: false
  }
};
