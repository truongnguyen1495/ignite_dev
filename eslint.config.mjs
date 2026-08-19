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
    // Vendored third-party bundles copied in verbatim from pdfjs-dist — not
    // ours to fix, and linting them buried the project's own 25 real errors
    // under 1850 warnings from a single minified worker file.
    "public/pdf.worker.min.mjs",
    "public/pdfjs-wasm/**",
  ]),
]);

export default eslintConfig;
