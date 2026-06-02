import { createApp } from "./app.js";
import { config } from "./config.js";
import { initializeDatabase } from "./database.js";

const database = await initializeDatabase(config.database.path);
const app = createApp({
  database,
  openAIModel: config.openAI.model,
  serveStatic: process.env.NODE_ENV === "production",
  uploadDirectory: config.uploads.directory,
});

const server = app.listen(config.port, config.host, (error?: Error) => {
  if (error) {
    console.error("Server failed to start:", error);
    process.exitCode = 1;
    return;
  }

  console.log(`Server listening on http://${config.host}:${config.port}`);
});

function closeDatabase(): void {
  if (database.open) {
    database.close();
  }
}

server.on("close", closeDatabase);
