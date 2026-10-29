import { useState } from "react";
import {
  CATEGORY_STYLES,
  VALIDATION_STATUS_STYLES,
} from "../../constants/expense";
import type { Expense } from "../../types/expense";
import { formatCurrency, formatDate } from "../../utils/format";
import {
  CalendarIcon,
  ChevronDownIcon,
  ShieldCheckIcon,
} from "../ui/icons";
import { CategoryBadge } from "./CategoryBadge";
import { ReceiptStatus } from "./ReceiptStatus";
import { ReceiptVerification } from "./ReceiptVerification";

type ExpenseItemProps = {
  expense: Expense;
};

export function ExpenseItem({ expense }: ExpenseItemProps) {
  const { receipt } = expense;
  const aiResult = receipt?.aiResult ?? null;

  const needsAttention =
    receipt?.validationStatus === "MISMATCH" ||
    receipt?.validationStatus === "NEEDS_REVIEW";

  // null = user hasn't toggled yet, so follow the receipt status. This keeps
  // a row opening automatically when a refresh turns it into a mismatch.
  const [toggled, setToggled] = useState<boolean | null>(null);
  const expanded = toggled ?? needsAttention;

  const avatarStyle =
    CATEGORY_STYLES[expense.category] ?? CATEGORY_STYLES.Other;

  const validationStatus = receipt?.validationStatus;
  const borderStyle =
    (validationStatus &&
      VALIDATION_STATUS_STYLES[validationStatus]?.row) ||
    "border-slate-100";

  return (
    <li
      className={`rounded-2xl border bg-white p-4 transition hover:shadow-md hover:shadow-slate-200/60 ${borderStyle}`}
    >
      <div className="flex items-start gap-4">
        <div
          className={`grid size-11 shrink-0 place-items-center rounded-xl text-base font-semibold ${avatarStyle}`}
        >
          {expense.merchant.charAt(0).toUpperCase()}
        </div>

        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <p className="truncate font-semibold text-slate-900">
              {expense.merchant}
            </p>
            <CategoryBadge category={expense.category} />
          </div>

          <p className="mt-1 flex items-center gap-1.5 text-sm text-slate-500">
            <CalendarIcon className="size-3.5" />
            {formatDate(expense.expenseDate)}
          </p>

          {expense.notes && (
            <p className="mt-1.5 line-clamp-2 text-sm text-slate-400">
              {expense.notes}
            </p>
          )}

          {receipt && <ReceiptStatus receipt={receipt} />}
        </div>

        <p className="shrink-0 text-base font-bold tabular-nums text-slate-900">
          {formatCurrency(expense.amount)}
        </p>
      </div>

      {receipt && aiResult && (
        <>
          <button
            type="button"
            onClick={() => setToggled(!expanded)}
            aria-expanded={expanded}
            className="mt-3 inline-flex items-center gap-1.5 rounded-lg px-2 py-1 text-sm font-medium text-indigo-600 transition hover:bg-indigo-50 sm:ml-15"
          >
            <ShieldCheckIcon className="size-4" />
            {expanded
              ? "Hide verification details"
              : "View verification details"}
            <ChevronDownIcon
              className={`size-4 transition-transform ${
                expanded ? "rotate-180" : ""
              }`}
            />
          </button>

          {expanded && (
            <ReceiptVerification
              expense={expense}
              receipt={receipt}
              aiResult={aiResult}
            />
          )}
        </>
      )}
    </li>
  );
}
