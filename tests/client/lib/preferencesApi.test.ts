import { describe, expect, it, vi } from "vitest";
import { fetchPreferences, updateThemePreference } from "@client/lib/preferencesApi";

function jsonResponse(payload: unknown, init: ResponseInit = {}): Response {
  return new Response(JSON.stringify(payload), {
    headers: { "Content-Type": "application/json" },
    ...init,
  });
}

describe("preferencesApi", () => {
  it("fetches preferences", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ theme: "dark" }));
    const signal = new AbortController().signal;
    vi.stubGlobal("fetch", fetchMock);

    await expect(fetchPreferences(signal)).resolves.toEqual({ theme: "dark" });
    expect(fetchMock).toHaveBeenCalledWith("/api/preferences", { signal });
  });

  it("updates the theme preference", async () => {
    const fetchMock = vi.fn().mockResolvedValue(jsonResponse({ theme: "light" }));
    vi.stubGlobal("fetch", fetchMock);

    await expect(updateThemePreference("light")).resolves.toEqual({ theme: "light" });
    expect(fetchMock).toHaveBeenCalledWith("/api/preferences/theme", {
      method: "PUT",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ theme: "light" }),
    });
  });

  it("uses fallback errors when the response body cannot be read", async () => {
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue(new Response("not-json", { status: 500 })));

    await expect(updateThemePreference("dark")).rejects.toThrow("Unable to update theme.");
  });
});
