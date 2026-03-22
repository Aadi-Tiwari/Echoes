"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type Theme = "dark" | "sepia";

const ThemeContext = createContext<{ theme: Theme; toggle: () => void }>({
  theme: "dark",
  toggle: () => {},
});

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setTheme] = useState<Theme>("dark");

  useEffect(() => {
    const stored = localStorage.getItem("echoes-theme") as Theme | null;
    if (stored === "sepia") {
      setTheme("sepia");
      document.documentElement.setAttribute("data-theme", "sepia");
    }
  }, []);

  function toggle() {
    setTheme((prev) => {
      const next: Theme = prev === "dark" ? "sepia" : "dark";
      localStorage.setItem("echoes-theme", next);
      if (next === "sepia") {
        document.documentElement.setAttribute("data-theme", "sepia");
      } else {
        document.documentElement.removeAttribute("data-theme");
      }
      return next;
    });
  }

  return (
    <ThemeContext.Provider value={{ theme, toggle }}>
      {children}
    </ThemeContext.Provider>
  );
}

export function useTheme() {
  return useContext(ThemeContext);
}
