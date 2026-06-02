import { act, renderHook, waitFor } from "@testing-library/react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { useTheme } from "@client/hooks/useTheme";
import { fetchPreferences, updateThemePreference } from "@client/lib/preferencesApi";

vi.mock("@client/lib/preferencesApi", () => ({
  fetchPreferences: vi.fn(),
  updateThemePreference: vi.fn(),
}));

const fetchPreferencesMock = vi.mocked(fetchPreferences);
const updateThemePreferenceMock = vi.mocked(updateThemePreference);

beforeEach(() => {
  fetchPreferencesMock.mockResolvedValue({ theme: "light" });
  updateThemePreferenceMock.mockResolvedValue({ theme: "dark" });
});

describe("useTheme", () => {
  it("loads the saved theme and toggles it", async () => {
    fetchPreferencesMock.mockResolvedValue({ theme: "dark" });

    const { result } = renderHook(() => useTheme());

    await waitFor(() => {
      expect(result.current.themeLabel).toBe("Switch to light mode");
    });
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.themeLabel).toBe("Switch to dark mode");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(updateThemePreferenceMock).toHaveBeenCalledWith("light");
  });
});
