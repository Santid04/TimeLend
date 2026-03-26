"use client";

import type { CommitmentStatus } from "@/types/frontend";

import { Badge } from "@/components/ui/badge";
import { useTranslation } from "@/lib/i18n/useTranslation";
import { cn } from "@/lib/utils";

type StatusBadgeProps = {
  className?: string;
  label?: string;
  status: CommitmentStatus | "PROCESSING" | "CONNECTED" | "AUTHENTICATED" | "UNSUPPORTED";
};

const statusVariants = {
  ACTIVE: "warning",
  FAILED_PENDING_APPEAL: "warning",
  COMPLETED: "success",
  FAILED_FINAL: "destructive",
  PROCESSING: "default",
  CONNECTED: "success",
  AUTHENTICATED: "success",
  UNSUPPORTED: "destructive",
} as const;

export function StatusBadge({ className, label, status }: StatusBadgeProps) {
  const { translateStatus } = useTranslation();

  return (
    <Badge
      className={cn("min-w-fit", className)}
      variant={statusVariants[status] ?? "secondary"}
    >
      {label ?? translateStatus(status)}
    </Badge>
  );
}
