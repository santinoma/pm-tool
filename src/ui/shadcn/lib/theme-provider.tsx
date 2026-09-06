"use client";

import { createContext, useCallback, useContext, useEffect, useState } from "react";

import { Toaster } from "@/ui/shadcn/components/sonner";

type Theme = "light" | "dark";

const STORAGE_KEY = "se-theme";

const ThemeContext = createContext<{ theme: Theme; toggleTheme: () => void } | null>(null);

export function useTheme() {
  const context = useContext(ThemeContext);
  if (!context) {
    throw new Error("useTheme must be used within a ThemeProvider.");
  }
  return context;
}

export function ThemeProvider({ children, className }: { children: React.ReactNode; className?: string }) {
  // The server (and the client's first paint, before hydration) always renders
  // "light" — there's no `window` on the server to read localStorage from.
  // Resolving the stored theme in a mount effect keeps that first render
  // identical on both sides; the effect then applies the real theme as an
  // ordinary post-hydration update, which is not a hydration mismatch. Reading
  // localStorage synchronously in a lazy initializer instead (the previous
  // approach) mismatches on every element that depends on `theme`.
  const [theme, setTheme] = useState<Theme>("light");

  useEffect(() => {
    // Deferred to a microtask so this isn't a *synchronous* setState call
    // within the effect body (react-hooks/set-state-in-effect) — it still
    // resolves before the next paint.
    queueMicrotask(() => {
      const stored = window.localStorage.getItem(STORAGE_KEY);
      if (stored === "dark") setTheme("dark");
    });
  }, []);

  // The `.dark` class (and the design tokens it flips, see tokens.css) live
  // on <html>, not on a wrapper div here — Radix portals (dropdown/dialog/
  // popover/select/sheet/tooltip) render into `document.body`, a sibling of
  // any wrapper div, so a div-scoped class would leave every portaled
  // surface without the tokens or the dark-mode class it needs.
  useEffect(() => {
    document.documentElement.classList.toggle("dark", theme === "dark");
  }, [theme]);

  const toggleTheme = useCallback(() => {
    setTheme((current) => {
      const next = current === "light" ? "dark" : "light";
      window.localStorage.setItem(STORAGE_KEY, next);
      return next;
    });
  }, []);

  return (
    <ThemeContext.Provider value={{ theme, toggleTheme }}>
      <div className={className}>{children}</div>
      <Toaster />
    </ThemeContext.Provider>
  );
}
