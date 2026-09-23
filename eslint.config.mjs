import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

const eslintConfig = defineConfig([
  ...nextVitals,
  ...nextTs,
  // Override default ignores of eslint-config-next.
  globalIgnores([
    // Default ignores of eslint-config-next:
    ".next/**",
    "out/**",
    "build/**",
    "next-env.d.ts",
    // Not part of the Next app. worker/ runs on Cloudflare's runtime,
    // whose entry point is required to be an anonymous default export
    // with a fixed handler signature — both of which this config would
    // otherwise flag. Different runtime, different rules.
    "worker/**",
  ]),
]);

export default eslintConfig;
