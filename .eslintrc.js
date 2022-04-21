module.exports = {
  root: true,
  env: { node: true, es2020: true },
  parser: "@typescript-eslint/parser",
  parserOptions: {
    ecmaVersion: 2020,
    project: ["./tsconfig.json"],
    sourceType: "module",
    tsConfigRootDir: __dirname,
  },
  extends: [
    "eslint:recommended",
    "plugin:@typescript-eslint/recommended",
    "plugin:@typescript-eslint/recommended-requiring-type-checking",
    "plugin:prettier/recommended",
    "plugin:node/recommended",
    "plugin:jsdoc/recommended",
    "plugin:jest/recommended",
  ],
  plugins: ["@typescript-eslint", "node", "jsdoc", "jest"],
  ignorePatterns: [],
  rules: {
    "comma-dangle": ["error", "always-multiline"],
    "dot-notation": ["error"],
    "@typescript-eslint/ban-types": "error",
    "node/no-unsupported-features/es-syntax": ["error", { version: ">=14.0.0", ignores: ["modules"] }],
    "@typescript-eslint/no-unused-vars": [
      "warn",
      {
        vars: "all",
        args: "all",
        argsIgnorePattern: "^_",
      },
    ],
  },
  settings: {
    jsdoc: { mode: "typescript" },
    node: { tryExtensions: [".js", ".ts"] },
  },
  ignorePatterns: ["coverage", "dist", ".eslintrc.js"],
};
