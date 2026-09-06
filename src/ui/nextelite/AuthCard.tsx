import { Card, CardContent } from "@/ui/shadcn/components/card";

export function AuthCard({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-background px-6 py-12">
      <div className="w-full max-w-sm">
        <div className="mb-6 flex items-center justify-center gap-2.5 font-bold">
          <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-sm font-bold text-primary-foreground">
            PM
          </div>
          <span className="text-lg font-semibold">
            PM<span className="text-primary">·</span>Atlas
          </span>
        </div>

        <Card>
          <CardContent>
            <h1 className="mb-1 text-xl font-bold tracking-tight">{title}</h1>
            {description && <p className="mb-6 text-sm text-muted-foreground">{description}</p>}
            {children}
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
