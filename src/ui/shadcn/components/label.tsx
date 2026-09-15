import * as LabelPrimitive from "@radix-ui/react-label";
import * as React from "react";

import { cn } from "@/ui/shadcn/lib/utils";

function Label({ className, ...props }: React.ComponentProps<typeof LabelPrimitive.Root>) {
  return (
    <LabelPrimitive.Root
      data-slot="label"
      className={cn(
        // Reference "Data / Labels" token: uppercase, tracked, muted — kept in the
        // body sans (not mono) so longer German compound words stay legible.
        "text-xs leading-none font-semibold tracking-wide text-muted-foreground uppercase select-none group-data-[disabled=true]:pointer-events-none group-data-[disabled=true]:opacity-50 peer-disabled:cursor-not-allowed peer-disabled:opacity-50",
        className,
      )}
      {...props}
    />
  );
}

export { Label };
