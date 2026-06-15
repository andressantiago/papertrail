import type express from "express";
import { getTheme, setTheme, type ThemeMode } from "../dataStore.js";
import type { PapertrailDatabase } from "../database.js";
import type { ErrorResponse } from "./responses.js";

type PreferencesResponse = {
  theme: ThemeMode;
};

type ThemeRequestBody = {
  theme?: unknown;
};

function readTheme(body: ThemeRequestBody): ThemeMode | null {
  return body.theme === "light" || body.theme === "dark" ? body.theme : null;
}

export function registerPreferenceRoutes(app: express.Express, database: PapertrailDatabase): void {
  app.get<never, PreferencesResponse>("/api/preferences", (_req, res) => {
    res.json({ theme: getTheme(database) });
  });
  app.put<never, PreferencesResponse | ErrorResponse, ThemeRequestBody>(
    "/api/preferences/theme",
    (req, res) => {
      const theme = readTheme(req.body);

      if (!theme) {
        return res.status(400).json({ error: "Theme must be light or dark." });
      }

      setTheme(database, theme);
      return res.json({ theme });
    },
  );
}
