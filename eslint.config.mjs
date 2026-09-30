import js from "@eslint/js";
import { defineConfig } from "eslint/config";
import jest from "eslint-plugin-jest";
import jsdoc from "eslint-plugin-jsdoc";
import n from "eslint-plugin-n";
import prettierRecommended from "eslint-plugin-prettier/recommended";
import globals from "globals";
import tseslint from "typescript-eslint";

export default defineConfig(
  { ignores: ["coverage", "dist", "tsbuild"] },
  {
    files: ["**/*.ts"],
    extends: [
      js.configs.recommended,
      tseslint.configs.recommendedTypeChecked,
      n.configs["flat/recommended-module"],
      jsdoc.configs["flat/recommended"],
    ],
    languageOptions: {
      globals: globals.node,
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    settings: {
      jsdoc: { mode: "typescript" },
      n: { tryExtensions: [".js", ".ts"] },
    },
    rules: {
      "dot-notation": ["error"],
      "n/no-unsupported-features/es-syntax": ["error", { ignores: ["modules"] }],
      "@typescript-eslint/no-unused-vars": [
        "warn",
        {
          vars: "all",
          args: "all",
          argsIgnorePattern: "^_",
        },
      ],
    },
  },
  {
    files: ["test/**/*.ts"],
    extends: [jest.configs["flat/recommended"]],
  },
  {
    files: ["**/*.mjs"],
    extends: [js.configs.recommended],
    languageOptions: { globals: globals.node },
  },
  prettierRecommended,
);
