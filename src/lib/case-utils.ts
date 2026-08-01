export const STATUS_LABELS: Record<string, string> = {
  draft: "Draft Intake",
  attorney_review: "Attorney Review",
  intake: "Intake",
  notice_preparation: "Notice Prep",
  notice_served: "Notice Served",
  waiting_period: "Waiting Period",
  ready_to_file: "Ready to File",
  filed: "Filed",
  court_scheduled: "Court Scheduled",
  in_court_process: "In Court",
  outcome_pending: "Outcome Pending",
  resolved: "Resolved",
  closed: "Closed",
  on_hold: "On Hold",
};

export const STATUS_COLORS: Record<string, string> = {
  draft: "bg-muted text-muted-foreground border-border",
  attorney_review: "bg-status-info/15 text-status-info border-status-info/30",
  intake: "bg-status-info/15 text-status-info border-status-info/30",
  notice_preparation: "bg-status-warning/15 text-status-warning border-status-warning/30",
  notice_served: "bg-status-warning/15 text-status-warning border-status-warning/30",
  waiting_period: "bg-status-neutral/15 text-status-neutral border-status-neutral/30",
  ready_to_file: "bg-status-success/15 text-status-success border-status-success/30",
  filed: "bg-primary/15 text-primary border-primary/30",
  court_scheduled: "bg-status-danger/15 text-status-danger border-status-danger/30",
  in_court_process: "bg-status-danger/15 text-status-danger border-status-danger/30",
  outcome_pending: "bg-status-warning/15 text-status-warning border-status-warning/30",
  resolved: "bg-status-success/15 text-status-success border-status-success/30",
  closed: "bg-muted text-muted-foreground border-border",
  on_hold: "bg-status-neutral/15 text-status-neutral border-status-neutral/30",
};

export const PRIORITY_COLORS: Record<string, string> = {
  low: "bg-muted text-muted-foreground",
  normal: "bg-primary/10 text-primary",
  high: "bg-status-danger/15 text-status-danger",
};

export const MILESTONE_STATUS_COLORS: Record<string, string> = {
  pending: "text-muted-foreground",
  complete: "text-status-success",
  overdue: "text-status-danger",
  skipped: "text-status-neutral",
};
