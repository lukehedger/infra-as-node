import nodeResolve from "rollup-plugin-node-resolve";
import { terser } from "rollup-plugin-terser";
import typescript from "rollup-plugin-typescript";

export default {
  external: ["http", "https", "stream", "url", "zlib"],
  input: "lib/ping.ts",
  output: [
    {
      file: "lib/ping.js",
      format: "cjs"
    }
  ],
  plugins: [nodeResolve({ preferBuiltins: true }), typescript(), terser()],
  watch: {
    clearScreen: false
  }
};
