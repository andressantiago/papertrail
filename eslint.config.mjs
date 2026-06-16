import js from "@eslint/js";
import reactHooks from "eslint-plugin-react-hooks";
import reactRefresh from "eslint-plugin-react-refresh";
import globals from "globals";
import tseslint from "typescript-eslint";

const clientRuntimeRestrictedImports = [
  {
    group: ["@server/*", "@tests/*", "server/*", "tests/*", "**/server/*", "**/tests/*"],
    message: "Client runtime code must not import server or test modules.",
  },
];

const serverRuntimeRestrictedImports = [
  {
    group: ["@client/*", "@tests/*", "client/*", "tests/*", "**/client/*", "**/tests/*"],
    message: "Server runtime code must not import client or test modules.",
  },
];

const sharedRuntimeRestrictedImports = [
  {
    group: [
      "@client/*",
      "@server/*",
      "@tests/*",
      "client/*",
      "server/*",
      "tests/*",
      "**/client/*",
      "**/server/*",
      "**/tests/*",
    ],
    message: "Shared code must not import client, server, or test modules.",
  },
];

export default tseslint.config(
  {
    ignores: ["dist/**", "client/dist/**", "node_modules/**"],
  },
  js.configs.recommended,
  ...tseslint.configs.recommended,
  {
    files: ["**/*.{ts,tsx}"],
    rules: {
      complexity: ["error", { max: 10 }],
      "max-depth": ["error", 3],
      "max-lines-per-function": [
        "error",
        {
          max: 80,
          skipBlankLines: true,
          skipComments: true,
        },
      ],
      "max-params": ["error", 4],
      "max-statements": ["error", 30],
      "no-undef": "off",
      "@typescript-eslint/consistent-type-imports": "error",
    },
  },
  {
    files: ["client/src/**/*.{ts,tsx}"],
    languageOptions: {
      globals: {
        ...globals.browser,
      },
    },
    plugins: {
      "react-hooks": reactHooks,
      "react-refresh": reactRefresh,
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      "react-refresh/only-export-components": ["warn", { allowConstantExport: true }],
      "no-restricted-imports": [
        "error",
        {
          patterns: clientRuntimeRestrictedImports,
        },
      ],
    },
  },
  {
    files: ["server/**/*.ts", "client/vite.config.ts"],
    languageOptions: {
      globals: {
        ...globals.node,
      },
    },
  },
  {
    files: ["server/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: serverRuntimeRestrictedImports,
        },
      ],
    },
  },
  {
    files: ["shared/**/*.ts"],
    rules: {
      "no-restricted-imports": [
        "error",
        {
          patterns: sharedRuntimeRestrictedImports,
        },
      ],
    },
  },
);
