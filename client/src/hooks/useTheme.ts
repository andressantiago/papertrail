import { useEffect, useState } from "react";
import { loadStoredTheme, storageKeys } from "../lib/storage";
import type { ThemeMode } from "../types";

type UseThemeResult = {
  themeLabel: string;
  toggleTheme: () => void;
};

function getNextTheme(theme: ThemeMode): ThemeMode {
  return theme === "light" ? "dark" : "light";
}

export function useTheme(): UseThemeResult {
  const [theme, setTheme] = useState<ThemeMode>(loadStoredTheme);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
    localStorage.setItem(storageKeys.theme, theme);
  }, [theme]);

  return {
    themeLabel: theme === "light" ? "Switch to dark mode" : "Switch to light mode",
    toggleTheme: () => setTheme(getNextTheme),
  };
}
