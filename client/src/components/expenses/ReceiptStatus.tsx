import type { Receipt } from "../../types/expense";
import { formatAiStatus } from "../../utils/format";
import { AlertIcon, FileIcon } from "../ui/icons";
import { ValidationBadge } from "./ValidationBadge";

type ReceiptStatusProps = {
  receipt: Receipt;
};

// Any status other than complete or processing is treated as a failure.
function getAiStatusStyle(aiStatus: string) {
  if (aiStatus === "AI_COMPLETE") {
    return {
      badge: "bg-green-100 text-green-700",
      dot: "bg-green-500",
    };
  }

  if (aiStatus === "AI_PROCESSING") {
    return {
      badge: "bg-yellow-100 text-yellow-700",
      dot: "bg-yellow-500 animate-pulse",
    };
  }

  return {
    badge: "bg-red-100 text-red-700",
    dot: "bg-red-500",
  };
}

export function ReceiptStatus({ receipt }: ReceiptStatusProps) {
  const aiStyle = getAiStatusStyle(receipt.aiStatus);

  return (
    <div className="mt-2.5 flex flex-wrap items-center gap-2">
      <ValidationBadge status={receipt.validationStatus} />

      <span
        title={receipt.fileName}
        className="inline-flex max-w-full items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs text-slate-600"
      >
        <FileIcon className="size-3.5 shrink-0" />
        <span className="truncate">{receipt.fileName}</span>
      </span>

      <span
        title={receipt.aiStatus}
        className={`inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-xs font-medium ${aiStyle.badge}`}
      >
        <span className={`size-1.5 rounded-full ${aiStyle.dot}`} />
        AI: {formatAiStatus(receipt.aiStatus)}
      </span>

      {/* The validation badge already says "Needs Review" in that case. */}
      {receipt.needsReview &&
        receipt.validationStatus !== "NEEDS_REVIEW" && (
          <span
            title={receipt.aiResult?.reviewReason}
            className="inline-flex items-center gap-1.5 rounded-full bg-orange-100 px-2.5 py-1 text-xs font-medium text-orange-700"
          >
            <AlertIcon className="size-3.5" />
            Needs Review
          </span>
        )}
    </div>
  );
}
