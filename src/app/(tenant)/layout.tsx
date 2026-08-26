import { CommandPalette } from "@/ui/commandPalette/CommandPalette";

export default function TenantLayout({ children }: { children: React.ReactNode }) {
  return (
    <>
      {children}
      <CommandPalette />
    </>
  );
}
