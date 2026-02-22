import { Badge } from "@/components/ui/badge";
import { STATUS_LABELS, STATUS_COLORS } from "@/lib/case-utils";
import { cn } from "@/lib/utils";

export default function StatusBadge({ status, className }: { status: string; className?: string }) {
  return (
    <Badge variant="outline" className={cn("text-xs font-medium border", STATUS_COLORS[status] || "", className)}>
      {STATUS_LABELS[status] || status}
    </Badge>
  );
}
