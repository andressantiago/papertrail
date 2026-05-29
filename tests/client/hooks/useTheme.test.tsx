import { act, renderHook } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { useTheme } from "../../../client/src/hooks/useTheme";
import { storageKeys } from "../../../client/src/lib/storage";

describe("useTheme", () => {
  it("loads the saved theme and toggles it", () => {
    localStorage.setItem(storageKeys.theme, "dark");

    const { result } = renderHook(() => useTheme());

    expect(result.current.themeLabel).toBe("Switch to light mode");
    expect(document.documentElement).toHaveAttribute("data-theme", "dark");

    act(() => {
      result.current.toggleTheme();
    });

    expect(result.current.themeLabel).toBe("Switch to dark mode");
    expect(document.documentElement).toHaveAttribute("data-theme", "light");
    expect(localStorage.getItem(storageKeys.theme)).toBe("light");
  });
});
