import { fileURLToPath } from "node:url";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";
import tsconfigPaths from "vite-tsconfig-paths";

const workspaceRoot = fileURLToPath(new URL("..", import.meta.url));

export default defineConfig({
  root: "client",
  plugins: [react(), tsconfigPaths({ root: workspaceRoot, projects: ["tsconfig.paths.json"] })],
  server: {
    host: "127.0.0.1",
    port: 5173,
    proxy: {
      "/api": {
        target: "http://127.0.0.1:3000",
        changeOrigin: true,
      },
    },
  },
});
