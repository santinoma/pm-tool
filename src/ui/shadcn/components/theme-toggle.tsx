"use client";

import { Moon, Sun } from "lucide-react";
import { useRef, useSyncExternalStore } from "react";

import { Switch } from "@/ui/shadcn/components/switch";
import { useTheme } from "@/ui/shadcn/lib/theme-provider";
import { cn } from "@/ui/shadcn/lib/utils";

interface ThemeToggleProps {
  variant?: "default" | "titled";
  title?: string;
}

export function ThemeToggle({ variant = "default", title = "Design" }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const switchRef = useRef<HTMLDivElement>(null);

  // Matches the server's always-"light" first render (see ThemeProvider) so
  // this never causes a hydration mismatch — same guard pattern as the
  // original template's ThemeToggle.
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false,
  );

  const isDark = mounted && theme === "dark";

  if (!mounted) {
    return (
      <div className={cn(variant === "titled" ? "flex h-9 w-full items-center justify-between px-2" : "flex h-9 w-11 items-center justify-center")}>
        <div className="h-6 w-11 animate-pulse rounded-full bg-muted/20" />
      </div>
    );
  }

  const switchComponent = (
    <div ref={switchRef} className="inline-flex">
      <Switch
        checked={isDark}
        onCheckedChange={() => toggleTheme()}
        size="lg"
        className="data-[state=checked]:bg-primary data-[state=unchecked]:bg-muted-foreground/20 dark:data-[state=unchecked]:bg-muted-foreground/25"
        checkedIcon={<Moon className="h-3 w-3 animate-in text-primary duration-300 fade-in zoom-in" />}
        uncheckedIcon={<Sun className="h-3 w-3 animate-in text-amber-500 duration-300 fade-in zoom-in" />}
        aria-label="Design umschalten"
      />
    </div>
  );

  if (variant === "titled") {
    return (
      <div
        onClick={() => toggleTheme()}
        className="group flex w-full flex-1 cursor-pointer items-center justify-between rounded-md border-0 bg-transparent px-2 py-1 text-start transition-all hover:bg-accent/60"
        role="button"
        tabIndex={0}
        onKeyDown={(e) => {
          if (e.key === "Enter" || e.key === " ") {
            e.preventDefault();
            toggleTheme();
          }
        }}
      >
        <span className="truncate text-[11px] font-medium text-muted-foreground transition-colors group-hover:text-foreground">{title}</span>
        <span className="flex h-9 items-center justify-center" onClick={(e) => e.stopPropagation()}>
          {switchComponent}
        </span>
      </div>
    );
  }

  return <div className="flex items-center justify-center p-1">{switchComponent}</div>;
}
