import type { ReactNode } from "react";
import type { LucideIcon } from "lucide-react";

import { Card, CardContent } from "@/components/ui/card";

type EmptyStateProps = {
  action?: ReactNode;
  description: string;
  icon: LucideIcon;
  title: string;
};

export function EmptyState({ action, description, icon: Icon, title }: EmptyStateProps) {
  return (
    <Card className="overflow-hidden rounded-2xl border-dashed border-white/12 bg-[linear-gradient(180deg,rgba(12,18,38,0.8),rgba(7,10,20,0.74))]">
      <CardContent className="flex flex-col items-start gap-5 p-8">
        <div className="flex size-14 items-center justify-center rounded-3xl border border-white/10 bg-white/[0.06] text-cyan-100">
          <Icon className="size-6" />
        </div>

        <div className="space-y-2">
          <h3 className="font-display text-xl font-semibold text-white">{title}</h3>
          <p className="max-w-2xl text-sm leading-6 text-slate-300/74">{description}</p>
        </div>

        {action}
      </CardContent>
    </Card>
  );
}
