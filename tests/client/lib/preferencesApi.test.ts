import { describe, expect, it } from "vitest";
import { fetchPreferences, updateThemePreference } from "@client/lib/preferencesApi";
import { createJsonResponse, stubFetchResponse } from "@tests/client/lib/apiTestUtils";

describe("preferencesApi", () => {
  it("fetches preferences", async () => {
    const fetchMock = stubFetchResponse(createJsonResponse({ theme: "dark" }));
    const signal = new AbortController().signal;

    await expect(fetchPreferences(signal)).resolves.toEqual({ theme: "dark" });
    expect(fetchMock).toHaveBeenCalledWith("/api/preferences", { signal });
  });

  it("updates the theme preference", async () => {
    const fetchMock = stubFetchResponse(createJsonResponse({ theme: "light" }));

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
    stubFetchResponse(new Response("not-json", { status: 500 }));

    await expect(updateThemePreference("dark")).rejects.toThrow("Unable to update theme.");
  });
});
