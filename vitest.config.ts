import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

const workspaceRoot = fileURLToPath(new URL(".", import.meta.url));

export default defineConfig({
  plugins: [react(), tsconfigPaths({ root: workspaceRoot, projects: ["tsconfig.paths.json"] })],
  test: {
    coverage: {
      provider: "v8",
      reportsDirectory: "coverage",
    },
    projects: [
      {
        extends: true,
        test: {
          name: "client",
          environment: "jsdom",
          include: ["tests/client/**/*.test.{ts,tsx}"],
          setupFiles: ["./tests/setup/client.ts"],
        },
      },
      {
        extends: true,
        test: {
          name: "node",
          environment: "node",
          include: ["tests/server/**/*.test.ts", "tests/shared/**/*.test.ts"],
          setupFiles: ["./tests/setup/node.ts"],
        },
      },
    ],
  },
});
