import * as React from "react";
import { cn } from "@/lib/utils";

type Variant = "primary" | "secondary" | "outline";
type Size = "sm" | "md" | "lg";

export interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  size?: Size;
}

export const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant = "primary", size = "md", ...props }, ref) => {
    return (
      <button
        ref={ref}
        className={cn(
          "btn",
          size === "lg" ? "btn-lg" : size === "sm" ? "h-9 px-3 text-sm" : "btn-md",
          variant === "primary" && "btn-primary",
          variant === "secondary" && "btn-secondary",
          variant === "outline" && "btn-outline",
          className,
        )}
        {...props}
      />
    );
  },
);
Button.displayName = "Button";
