import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";
import { cn } from "@/lib/utils";

type MetricCardProps = {
  icon: LucideIcon;
  helper: string;
  label: string;
  tone?: "accent" | "success" | "warning" | "danger" | "neutral";
  value: string;
};

const toneClasses = {
  accent:
    "border-cyan-300/16 bg-[linear-gradient(180deg,rgba(19,33,66,0.96),rgba(10,16,34,0.92))] shadow-[0_22px_60px_-28px_rgba(76,214,255,0.75)]",
  danger:
    "border-rose-300/16 bg-[linear-gradient(180deg,rgba(54,22,34,0.92),rgba(21,10,18,0.88))]",
  neutral:
    "border-white/10 bg-[linear-gradient(180deg,rgba(15,22,44,0.86),rgba(8,12,24,0.76))]",
  success:
    "border-emerald-300/16 bg-[linear-gradient(180deg,rgba(15,43,35,0.92),rgba(8,19,18,0.88))]",
  warning:
    "border-amber-300/16 bg-[linear-gradient(180deg,rgba(53,38,17,0.92),rgba(24,16,7,0.88))]",
} as const;

const iconToneClasses = {
  accent: "bg-cyan-300/14 text-cyan-100",
  danger: "bg-rose-300/14 text-rose-100",
  neutral: "bg-white/8 text-slate-100",
  success: "bg-emerald-300/14 text-emerald-100",
  warning: "bg-amber-300/14 text-amber-100",
} as const;

export function MetricCard({
  icon: Icon,
  helper,
  label,
  tone = "neutral",
  value,
}: MetricCardProps) {
  return (
    <Card className={cn("group overflow-hidden rounded-[26px]", toneClasses[tone])}>
      <CardContent className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-3">
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-slate-400">
              {label}
            </p>
            <p className="text-xl font-semibold tracking-tight text-white sm:text-2xl">{value}</p>
          </div>

          <div
            className={cn(
              "flex size-11 items-center justify-center rounded-2xl border border-white/8 shadow-[inset_0_1px_0_rgba(255,255,255,0.05)]",
              iconToneClasses[tone],
            )}
          >
            <Icon className="size-5" />
          </div>
        </div>

        <p className="mt-4 text-sm leading-6 text-slate-300/72">{helper}</p>
      </CardContent>
    </Card>
  );
}
