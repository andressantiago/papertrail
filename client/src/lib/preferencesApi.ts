import { readJson } from "@client/lib/apiResponse";
import type { ThemeMode } from "@client/types";

type PreferencesResponse = {
  theme: ThemeMode;
};

const PREFERENCES_ENDPOINT = "/api/preferences";
const THEME_ENDPOINT = `${PREFERENCES_ENDPOINT}/theme`;

export async function fetchPreferences(signal?: AbortSignal): Promise<PreferencesResponse> {
  const response = await fetch(PREFERENCES_ENDPOINT, { signal });

  return readJson<PreferencesResponse>(response, "Unable to load preferences.");
}

export async function updateThemePreference(theme: ThemeMode): Promise<PreferencesResponse> {
  const response = await fetch(THEME_ENDPOINT, {
    method: "PUT",
    headers: {
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ theme }),
  });

  return readJson<PreferencesResponse>(response, "Unable to update theme.");
}
