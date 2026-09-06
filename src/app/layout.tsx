import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";
// Next-Elite design foundation (Tailwind + shadcn tokens), imported once here so
// it's a shared chunk everywhere. Design tokens live on `:root`/`:root.dark` (see
// tokens.css) — not scoped to a wrapper div — so they also reach Radix portals
// (dropdown/dialog/popover/select/sheet/tooltip), which render into
// `document.body`. `ThemeProvider` toggles the `.dark` class on <html>; see
// NEXTELITE-MIGRATION-CAPABILITY-MAP.md.
import "@/ui/shadcn/tailwind.css";

const archivo = Archivo({
  variable: "--font-archivo",
  subsets: ["latin"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-jetbrains-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "PM Tool",
  description: "Project management, built for clarity.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="de" className={`${archivo.variable} ${jetbrainsMono.variable}`}>
      <body>
        {/*
          THESIS: The app reads like a native macOS/iPadOS panel, not a generic web
          dashboard — translucent chrome and restraint replace card-grid clutter.
          OWN-WORLD: Apple-HIG — SF Pro system font stack, one system-blue accent,
          translucent blurred topbar with a pill-shaped segmented nav (no sidebar),
          soft ambient shadows, generous corner radii up to full pill shape.
          STORY: The team feels like they're using a well-crafted native app —
          chrome recedes, content and hierarchy lead.
          FIRST VIEWPORT: Translucent blurred topbar (pill nav + search) sticky above
          a centered content column of softly-shadowed cards.
          FORM: Apple-HIG direction — migrated app-wide from the original Field Atlas
          system (see git history, "Migrate the Apple-HIG design ... to the whole app").
          FINISH: unreviewed and undocumented is unfinished; this build ends with
          the finish review, the verdict, and DESIGN.md.
        */}
        {children}
      </body>
    </html>
  );
}
