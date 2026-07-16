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
  ]),
  {
    // Vanilla DOM interactivity script relocated verbatim out of a raw
    // <script dangerouslySetInnerHTML> string (see src/app/(marketing)/page.tsx
    // history) into a useEffect so it runs after hydration instead of racing
    // it. It was never type-checked/linted as TypeScript before (it lived as
    // an opaque string); kept untyped here rather than rewritten so the move
    // stays a pure timing fix, not a rewrite.
    files: ["src/app/(marketing)/InteractivityScript.tsx"],
    rules: {
      "@typescript-eslint/ban-ts-comment": "off",
      "no-var": "off",
      "@typescript-eslint/no-unused-vars": "off",
    },
  },
]);

export default eslintConfig;
