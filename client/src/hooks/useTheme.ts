import { useEffect, useState } from "react";
import { fetchPreferences, updateThemePreference } from "@client/lib/preferencesApi";
import type { ThemeMode } from "@client/types";

type UseThemeResult = {
  themeLabel: string;
  toggleTheme: () => void;
};

function getNextTheme(theme: ThemeMode): ThemeMode {
  return theme === "light" ? "dark" : "light";
}

export function useTheme(): UseThemeResult {
  const [theme, setTheme] = useState<ThemeMode>("light");

  useEffect(() => {
    const abortController = new AbortController();

    fetchPreferences(abortController.signal)
      .then((preferences) => {
        setTheme(preferences.theme);
      })
      .catch(() => undefined);

    return () => {
      abortController.abort();
    };
  }, []);

  useEffect(() => {
    document.documentElement.dataset.theme = theme;
  }, [theme]);

  return {
    themeLabel: theme === "light" ? "Switch to dark mode" : "Switch to light mode",
    toggleTheme: () => {
      setTheme((currentTheme) => {
        const nextTheme = getNextTheme(currentTheme);

        void updateThemePreference(nextTheme).catch(() => undefined);

        return nextTheme;
      });
    },
  };
}
