import type { Metadata } from "next";
import { Archivo, JetBrains_Mono } from "next/font/google";
import "./globals.css";

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
          THESIS: Status lives in a legend, not a scattered rainbow of pills; every
          view reads like a chart, not a card grid.
          OWN-WORLD: Field Atlas — graphite/paper neutrals, one hydrographic-teal
          accent, Archivo + JetBrains Mono, hairline rules, monospace coordinate IDs.
          STORY: The team sees where every project and task "is," at a glance,
          without hunting through color-coded chaos.
          FIRST VIEWPORT: Sidebar as gazetteer index, topbar search as index lookup,
          content as a ruled chart of the current view.
          FORM: Field Atlas direction, assigned candidate 7, seed key cc638bf1.
          FINISH: unreviewed and undocumented is unfinished; this build ends with
          the finish review, the verdict, and DESIGN.md.
        */}
        {children}
      </body>
    </html>
  );
}
