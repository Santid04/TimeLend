"use client";

import * as React from "react";
import { Slot } from "@radix-ui/react-slot";
import { cva, type VariantProps } from "class-variance-authority";

import { cn } from "@/lib/utils";

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-xl border text-sm font-semibold transition-all duration-200 disabled:pointer-events-none disabled:opacity-55 [&_svg]:pointer-events-none [&_svg]:size-4 [&_svg]:shrink-0",
  {
    variants: {
      variant: {
        default:
          "border-cyan-300/20 bg-[linear-gradient(135deg,rgba(76,214,255,0.92),rgba(99,102,241,0.86))] text-slate-950 shadow-[0_16px_36px_-18px_rgba(76,214,255,0.72)] hover:-translate-y-0.5 hover:shadow-[0_18px_40px_-18px_rgba(76,214,255,0.8)]",
        secondary:
          "border-white/10 bg-white/[0.05] text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.04)] hover:-translate-y-0.5 hover:border-white/18 hover:bg-white/[0.08]",
        outline:
          "border-cyan-300/18 bg-cyan-300/[0.07] text-cyan-100 hover:-translate-y-0.5 hover:bg-cyan-300/[0.12]",
        ghost: "border-transparent bg-transparent text-slate-300 hover:bg-white/[0.05] hover:text-white",
        warning:
          "border-amber-300/20 bg-[linear-gradient(135deg,rgba(251,191,36,0.18),rgba(249,115,22,0.2))] text-amber-50 hover:-translate-y-0.5 hover:border-amber-200/30 hover:bg-[linear-gradient(135deg,rgba(251,191,36,0.24),rgba(249,115,22,0.26))]",
        destructive:
          "border-rose-300/20 bg-[linear-gradient(135deg,rgba(251,113,133,0.2),rgba(244,63,94,0.22))] text-rose-50 hover:-translate-y-0.5 hover:border-rose-200/30 hover:bg-[linear-gradient(135deg,rgba(251,113,133,0.26),rgba(244,63,94,0.28))]",
      },
      size: {
        default: "h-11 px-5",
        sm: "h-9 px-4 text-xs",
        lg: "h-11 px-5 text-sm",
        icon: "size-10 rounded-xl",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  },
);

export interface ButtonProps
  extends React.ButtonHTMLAttributes<HTMLButtonElement>,
    VariantProps<typeof buttonVariants> {
  asChild?: boolean;
}

const Button = React.forwardRef<HTMLButtonElement, ButtonProps>(
  ({ className, variant, size, asChild = false, ...props }, ref) => {
    const Comp = asChild ? Slot : "button";

    return (
      <Comp className={cn(buttonVariants({ variant, size, className }))} ref={ref} {...props} />
    );
  },
);
Button.displayName = "Button";

export { Button, buttonVariants };
