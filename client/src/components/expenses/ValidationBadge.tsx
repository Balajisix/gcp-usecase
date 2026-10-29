import { VALIDATION_STATUS_STYLES } from "../../constants/expense";
import type { ValidationStatus } from "../../types/expense";
import {
  AlertIcon,
  CheckCircleIcon,
  ClockIcon,
  SpinnerIcon,
  TriangleAlertIcon,
} from "../ui/icons";

type ValidationBadgeProps = {
  status?: ValidationStatus;
};

const STATUS_ICONS = {
  VERIFIED: CheckCircleIcon,
  MISMATCH: TriangleAlertIcon,
  NEEDS_REVIEW: AlertIcon,
  PENDING: SpinnerIcon,
};

export function ValidationBadge({ status }: ValidationBadgeProps) {
  // No status from the API: say so instead of implying work in progress.
  if (!status || !(status in VALIDATION_STATUS_STYLES)) {
    return (
      <span
        title={status ?? "No validation result from the server"}
        className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold text-slate-600 ring-1 ring-inset ring-slate-500/20"
      >
        <ClockIcon className="size-3.5" />
        Not validated
      </span>
    );
  }

  const style = VALIDATION_STATUS_STYLES[status];
  const StatusIcon = STATUS_ICONS[status];

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-semibold ring-1 ring-inset ${style.badge}`}
    >
      <StatusIcon
        className={`size-3.5 ${
          status === "PENDING" ? "animate-spin" : ""
        }`}
      />
      {style.label}
    </span>
  );
}
