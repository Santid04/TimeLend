import type { CommitmentStatus } from "@/types/frontend";

import { Badge } from "@/components/ui/badge";
import { cn, formatCommitmentStatus } from "@/lib/utils";

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
  return (
    <Badge
      className={cn("min-w-fit", className)}
      variant={statusVariants[status] ?? "secondary"}
    >
      {label ?? formatCommitmentStatus(status)}
    </Badge>
  );
}
