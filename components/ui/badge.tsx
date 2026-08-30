import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";
import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-2.5 py-0.5 text-label-sm font-semibold transition-colors focus:outline-none focus:ring-2 focus:ring-secondary focus:ring-offset-2",
  {
    variants: {
      variant: {
        default:
          "border-transparent bg-primary text-on-primary hover:bg-primary/80",
        secondary:
          "border-transparent bg-secondary text-on-secondary hover:bg-secondary/80",
        outline: "text-on-surface border-outline-variant",
        surface: "border-transparent bg-surface-container text-on-surface",
        success: "border-transparent bg-[#e6f4ea] text-[#137333]",
        error: "border-transparent bg-error-container text-on-error-container",
        muted: "border-outline-variant bg-surface-bright text-on-surface-variant",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  }
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
