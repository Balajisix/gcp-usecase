import type { ReactNode } from "react";
import type {
  Expense,
  Receipt,
  ReceiptAiResult,
} from "../../types/expense";
import {
  formatAiStatus,
  formatCurrency,
  formatDateTime,
  humanize,
} from "../../utils/format";
import {
  type ComparisonResult,
  type ComparisonRow,
  formatMismatchValue,
  getComparisonRows,
  getOtherMismatches,
  isValidated,
} from "../../utils/verification";
import {
  AlertIcon,
  CheckCircleIcon,
  CheckIcon,
  ClockIcon,
  SparklesIcon,
  TriangleAlertIcon,
} from "../ui/icons";

type ReceiptVerificationProps = {
  expense: Expense;
  receipt: Receipt;
  aiResult: ReceiptAiResult;
};

export function ReceiptVerification({
  expense,
  receipt,
  aiResult,
}: ReceiptVerificationProps) {
  const validated = isValidated(receipt);
  const rows = getComparisonRows(expense, receipt, aiResult);
  const otherMismatches = getOtherMismatches(
    receipt.mismatches ?? [],
  );
  const matchCount = rows.filter(
    (row) => row.result === "match",
  ).length;
  const mismatchLabels = [
    ...rows
      .filter((row) => row.result === "mismatch")
      .map((row) => row.label),
    ...otherMismatches.map((mismatch) => humanize(mismatch.field)),
  ];

  const showReviewReason =
    (receipt.validationStatus === "NEEDS_REVIEW" ||
      receipt.needsReview) &&
    Boolean(aiResult.reviewReason);

  return (
    <div className="mt-4 space-y-4 rounded-2xl border border-slate-200 bg-slate-50/70 p-4 sm:p-5">
      {/* Heading + match score */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="flex items-start gap-3">
          <div className="grid size-9 shrink-0 place-items-center rounded-xl bg-linear-to-br from-indigo-500 to-violet-500 text-white shadow-sm">
            <SparklesIcon className="size-4.5" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-slate-900">
              AI Receipt Verification
            </h4>
            <p className="mt-0.5 text-xs text-slate-500">
              Your entries compared with details read from the
              receipt.
            </p>
          </div>
        </div>

        {validated ? (
          <MatchScore matched={matchCount} total={rows.length} />
        ) : (
          <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-2.5 py-1 text-xs font-medium text-slate-600 ring-1 ring-inset ring-slate-500/20">
            <ClockIcon className="size-3.5" />
            Not validated yet
          </span>
        )}
      </div>

      {/* Outcome */}
      {!validated && (
        <Callout tone="info" title="Comparison not available yet">
          The AI has read this receipt, but the server hasn't
          returned a validation result, so fields are shown as not
          checked rather than matched.
        </Callout>
      )}

      {receipt.validationStatus === "VERIFIED" && (
        <Callout tone="success" title="Everything matches the receipt">
          All checked fields agree with what the AI extracted.
        </Callout>
      )}

      {mismatchLabels.length > 0 && (
        <Callout
          tone="danger"
          title={`${mismatchLabels.length} ${
            mismatchLabels.length === 1 ? "difference" : "differences"
          } found`}
        >
          {mismatchLabels.join(", ")} on the receipt{" "}
          {mismatchLabels.length === 1 ? "doesn't" : "don't"} match
          what you entered. Check the receipt or update the expense.
        </Callout>
      )}

      {showReviewReason && (
        <Callout tone="warning" title="Manual review required">
          {aiResult.reviewReason}
        </Callout>
      )}

      {/* Field-by-field comparison */}
      <div className="overflow-hidden rounded-xl border border-slate-200 bg-white">
        <div className="hidden grid-cols-[7rem_1fr_1fr_6.5rem] gap-4 border-b border-slate-200 bg-slate-50 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-slate-500 sm:grid">
          <span>Field</span>
          <span>You entered</span>
          <span>Receipt</span>
          <span className="text-right">Result</span>
        </div>

        <ul className="divide-y divide-slate-100">
          {rows.map((row) => (
            <ComparisonRowItem key={row.field} row={row} />
          ))}
        </ul>
      </div>

      {/* Mismatches for fields outside the table */}
      {otherMismatches.length > 0 && (
        <div className="rounded-xl border border-red-200 bg-white p-4">
          <p className="text-sm font-semibold text-slate-900">
            Other differences
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            {otherMismatches.map((mismatch) => (
              <li
                key={mismatch.field}
                className="grid gap-1 sm:grid-cols-[7rem_1fr_1fr] sm:gap-4"
              >
                <span className="font-medium text-slate-700">
                  {humanize(mismatch.field)}
                </span>
                <span className="text-slate-600">
                  <span className="text-slate-400">Entered: </span>
                  {formatMismatchValue(mismatch.entered)}
                </span>
                <span className="font-medium text-red-700">
                  <span className="font-normal text-slate-400">
                    Receipt:{" "}
                  </span>
                  {formatMismatchValue(mismatch.extracted)}
                </span>
              </li>
            ))}
          </ul>
        </div>
      )}

      {/* Line items read from the receipt */}
      {aiResult.items && aiResult.items.length > 0 && (
        <ReceiptItems aiResult={aiResult} />
      )}

      {/* Metadata */}
      <div className="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-500">
        <span>AI status: {formatAiStatus(receipt.aiStatus)}</span>
        {aiResult.currency && (
          <span>Currency: {aiResult.currency}</span>
        )}
        {receipt.validatedAt && (
          <span className="inline-flex items-center gap-1">
            <ClockIcon className="size-3.5" />
            Validated {formatDateTime(receipt.validatedAt)}
          </span>
        )}
      </div>
    </div>
  );
}

function MatchScore({
  matched,
  total,
}: {
  matched: number;
  total: number;
}) {
  const allMatch = matched === total;

  return (
    <div className="min-w-36">
      <p className="text-right text-xs font-medium text-slate-600">
        <span
          className={`text-sm font-bold ${
            allMatch ? "text-green-600" : "text-red-600"
          }`}
        >
          {matched}/{total}
        </span>{" "}
        fields match
      </p>
      <div className="mt-1.5 flex gap-1">
        {Array.from({ length: total }, (_, index) => (
          <span
            key={index}
            className={`h-1.5 flex-1 rounded-full ${
              index < matched
                ? "bg-green-500"
                : "bg-red-400"
            }`}
          />
        ))}
      </div>
    </div>
  );
}

function ComparisonRowItem({ row }: { row: ComparisonRow }) {
  return (
    <li
      className={`grid grid-cols-2 gap-x-4 gap-y-1.5 px-4 py-3 text-sm sm:grid-cols-[7rem_1fr_1fr_6.5rem] sm:items-center ${
        row.result === "mismatch" ? "bg-red-50/60" : ""
      }`}
    >
      <span className="font-medium text-slate-700">
        {row.label}
      </span>

      {/* On mobile the result pill sits next to the label. */}
      <span className="justify-self-end sm:order-last">
        <ResultPill result={row.result} />
      </span>

      <div className="min-w-0">
        <span className="block text-[11px] uppercase tracking-wide text-slate-400 sm:hidden">
          You entered
        </span>
        <span className="block truncate text-slate-900">
          {row.entered}
        </span>
      </div>

      <div className="min-w-0">
        <span className="block text-[11px] uppercase tracking-wide text-slate-400 sm:hidden">
          Receipt
        </span>
        <span
          className={`block truncate ${
            row.result === "mismatch"
              ? "font-semibold text-red-700"
              : "text-slate-600"
          }`}
        >
          {row.extracted}
        </span>
        {row.note && (
          <span className="mt-0.5 block text-xs text-red-600">
            {row.note}
          </span>
        )}
      </div>
    </li>
  );
}

const RESULT_PILLS = {
  match: {
    label: "Match",
    className: "bg-green-100 text-green-700",
    Icon: CheckIcon,
  },
  mismatch: {
    label: "Mismatch",
    className: "bg-red-100 text-red-700",
    Icon: TriangleAlertIcon,
  },
  unchecked: {
    label: "Not checked",
    className: "bg-slate-100 text-slate-500",
    Icon: ClockIcon,
  },
};

function ResultPill({ result }: { result: ComparisonResult }) {
  const { label, className, Icon } = RESULT_PILLS[result];

  return (
    <span
      className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-semibold ${className}`}
    >
      <Icon className="size-3" />
      {label}
    </span>
  );
}

const CALLOUT_TONES = {
  success: {
    box: "border-green-200 bg-green-50 text-green-800",
    text: "text-green-700",
    Icon: CheckCircleIcon,
  },
  danger: {
    box: "border-red-200 bg-red-50 text-red-800",
    text: "text-red-700",
    Icon: TriangleAlertIcon,
  },
  warning: {
    box: "border-orange-200 bg-orange-50 text-orange-800",
    text: "text-orange-700",
    Icon: AlertIcon,
  },
  info: {
    box: "border-slate-200 bg-white text-slate-800",
    text: "text-slate-600",
    Icon: ClockIcon,
  },
};

function Callout({
  tone,
  title,
  children,
}: {
  tone: keyof typeof CALLOUT_TONES;
  title: string;
  children: ReactNode;
}) {
  const { box, text, Icon } = CALLOUT_TONES[tone];

  return (
    <div className={`flex gap-3 rounded-xl border p-3.5 ${box}`}>
      <Icon className="mt-0.5 size-4.5 shrink-0" />
      <div>
        <p className="text-sm font-semibold">{title}</p>
        <p className={`mt-0.5 text-sm ${text}`}>{children}</p>
      </div>
    </div>
  );
}

function ReceiptItems({ aiResult }: { aiResult: ReceiptAiResult }) {
  const currency = aiResult.currency || "INR";

  return (
    <details className="group/items rounded-xl border border-slate-200 bg-white">
      <summary className="flex cursor-pointer list-none items-center justify-between px-4 py-3 text-sm font-semibold text-slate-800 [&::-webkit-details-marker]:hidden">
        Items on receipt ({aiResult.items.length})
        <span className="text-xs font-medium text-indigo-600 group-open/items:hidden">
          Show
        </span>
        <span className="hidden text-xs font-medium text-indigo-600 group-open/items:inline">
          Hide
        </span>
      </summary>

      <ul className="divide-y divide-slate-100 border-t border-slate-100 text-sm">
        {aiResult.items.map((item, index) => (
          <li
            key={`${item.name}-${index}`}
            className="flex items-center justify-between gap-4 px-4 py-2"
          >
            <span className="min-w-0 truncate text-slate-700">
              {item.name}
              {item.quantity > 1 && (
                <span className="ml-1.5 text-xs text-slate-400">
                  × {item.quantity}
                </span>
              )}
            </span>
            <span className="shrink-0 tabular-nums text-slate-900">
              {formatCurrency(item.amount, currency)}
            </span>
          </li>
        ))}

        {typeof aiResult.totalAmount === "number" && (
          <li className="flex items-center justify-between gap-4 bg-slate-50 px-4 py-2 font-semibold">
            <span className="text-slate-700">Receipt total</span>
            <span className="tabular-nums text-slate-900">
              {formatCurrency(aiResult.totalAmount, currency)}
            </span>
          </li>
        )}
      </ul>
    </details>
  );
}
