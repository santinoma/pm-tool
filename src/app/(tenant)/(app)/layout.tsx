import { ThemeProvider } from "@/ui/shadcn/lib/theme-provider";

export default function TenantAppLayout({ children }: { children: React.ReactNode }) {
  return <ThemeProvider className="min-h-dvh">{children}</ThemeProvider>;
}
