import { useEffect, ReactNode } from "react";

interface ThemeProviderProps {
  children: ReactNode;
}

export function ThemeProvider({ children }: ThemeProviderProps) {
  useEffect(() => {
    // Apply theme immediately on mount to prevent flash
    const storedTheme = localStorage.getItem("theme") || "system";
    const root = window.document.documentElement;
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)");
    
    let resolved: "light" | "dark" = "light";
    
    if (storedTheme === "system") {
      resolved = mediaQuery.matches ? "dark" : "light";
    } else if (storedTheme === "dark" || storedTheme === "light") {
      resolved = storedTheme;
    }
    
    root.classList.remove("light", "dark");
    root.classList.add(resolved);
  }, []);

  return <>{children}</>;
}
