"use client";

import { EyeClosedIcon, EyeIcon } from "lucide-react";
import * as React from "react";

import { Input } from "@/ui/shadcn/components/input";
import { cn } from "@/ui/shadcn/lib/utils";

interface PasswordInputProps extends Omit<React.ComponentProps<"input">, "type"> {
  error?: boolean;
  errorMessage?: string;
}

function PasswordInput({ className, error = false, errorMessage, ...props }: PasswordInputProps) {
  const [showPassword, setShowPassword] = React.useState(false);

  return (
    <>
      <div className="relative w-full">
        <Input type={showPassword ? "text" : "password"} data-slot="input" className={cn(className)} aria-invalid={error} {...props} />

        <button
          type="button"
          onClick={() => setShowPassword(!showPassword)}
          className={cn(
            "absolute top-0 right-0 h-full cursor-pointer border-l px-3 text-muted-foreground transition-colors hover:text-foreground",
            error && "border-l-destructive",
          )}
          aria-label={showPassword ? "Passwort verbergen" : "Passwort anzeigen"}
        >
          {showPassword ? <EyeIcon size={20} /> : <EyeClosedIcon size={20} />}
        </button>
      </div>

      {error && errorMessage && <p className="text-sm text-destructive">{errorMessage}</p>}
    </>
  );
}

export { PasswordInput };
