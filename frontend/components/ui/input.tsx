import * as React from "react";

import { cn } from "@/lib/utils";

const Input = React.forwardRef<HTMLInputElement, React.ComponentProps<"input">>(
  ({ className, type, ...props }, ref) => {
    return (
      <input
        className={cn(
          "flex h-12 w-full rounded-2xl border border-white/10 bg-slate-950/40 px-4 py-3 text-sm text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.03)] outline-none placeholder:text-slate-500 transition-colors file:mr-4 file:rounded-full file:border-0 file:bg-cyan-400/12 file:px-4 file:py-2 file:text-xs file:font-semibold file:text-cyan-100 disabled:cursor-not-allowed disabled:opacity-55 focus-visible:border-cyan-300/35 focus-visible:ring-2 focus-visible:ring-cyan-300/20",
          className,
        )}
        ref={ref}
        type={type}
        {...props}
      />
    );
  },
);
Input.displayName = "Input";

export { Input };
