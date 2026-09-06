import { type HTMLAttributes } from "react";

import { cn } from "@/ui/shadcn/lib/utils";

export default function InputError({ message, className = "", ...props }: HTMLAttributes<HTMLParagraphElement> & { message?: string }) {
  return message ? (
    <p {...props} className={cn("text-sm text-destructive", className)}>
      {message}
    </p>
  ) : null;
}
