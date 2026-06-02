import path from "node:path";
import express from "express";
import type { PapertrailDatabase } from "./database.js";
import { registerChatRoutes } from "./routes/chatRoutes.js";
import { registerFileRoutes } from "./routes/fileRoutes.js";
import { registerOpenAIRoutes } from "./routes/openaiRoutes.js";
import { registerPreferenceRoutes } from "./routes/preferencesRoutes.js";

type CreateAppOptions = {
  clientDistPath?: string;
  database: PapertrailDatabase;
  openAIModel: string;
  serveStatic?: boolean;
  uploadDirectory: string;
};

function registerStaticRoutes(
  app: express.Express,
  clientDistPath: string,
  serveStatic: boolean | undefined,
): void {
  if (serveStatic) {
    app.use(express.static(clientDistPath));
    app.get(/^\/(?!api(?:\/|$)).*/, (_req, res) => {
      res.sendFile(path.join(clientDistPath, "index.html"));
    });
  } else {
    app.get("/", (_req, res) => {
      res.send("Hello from Express");
    });
  }
}

export function createApp(options: CreateAppOptions): express.Express {
  const app = express();
  const { database, openAIModel, serveStatic, uploadDirectory } = options;
  const clientDistPath = options.clientDistPath || path.resolve(process.cwd(), "client", "dist");

  app.use(express.json());
  registerPreferenceRoutes(app, database);
  registerChatRoutes(app, database);
  registerFileRoutes(app, database, uploadDirectory);
  registerOpenAIRoutes(app, database, openAIModel);
  registerStaticRoutes(app, clientDistPath, serveStatic);

  return app;
}
