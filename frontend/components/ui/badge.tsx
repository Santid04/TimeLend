import * as React from "react";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const badgeVariants = cva(
  "inline-flex items-center rounded-full border px-3 py-1 text-[0.72rem] font-semibold uppercase tracking-[0.18em] transition-colors",
  {
    variants: {
      variant: {
        default: "border-cyan-300/18 bg-cyan-300/[0.1] text-cyan-100",
        secondary: "border-white/10 bg-white/[0.06] text-slate-200",
        outline: "border-white/12 bg-transparent text-slate-300",
        success: "border-emerald-300/20 bg-emerald-400/12 text-emerald-100",
        warning: "border-amber-300/20 bg-amber-400/14 text-amber-100",
        destructive: "border-rose-300/20 bg-rose-400/14 text-rose-100",
      },
    },
    defaultVariants: {
      variant: "default",
    },
  },
);

export interface BadgeProps
  extends React.HTMLAttributes<HTMLDivElement>,
    VariantProps<typeof badgeVariants> {}

function Badge({ className, variant, ...props }: BadgeProps) {
  return <div className={cn(badgeVariants({ variant }), className)} {...props} />;
}

export { Badge, badgeVariants };
