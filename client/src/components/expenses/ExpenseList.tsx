import { VALIDATION_STATUS_STYLES } from "../../constants/expense";
import type {
  Expense,
  ValidationStatus,
} from "../../types/expense";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { InboxIcon, RefreshIcon } from "../ui/icons";
import { ExpenseItem } from "./ExpenseItem";

type ExpenseListProps = {
  expenses: Expense[];
  loading: boolean;
  onRefresh: () => void;
};

export function ExpenseList({
  expenses,
  loading,
  onRefresh,
}: ExpenseListProps) {
  const showSkeleton = loading && expenses.length === 0;

  return (
    <Card>
      <div className="mb-6 flex items-center justify-between gap-4">
        <div>
          <h2 className="text-lg font-semibold text-slate-900">
            Expenses
          </h2>
          <p className="mt-1 text-sm text-slate-500">
            {expenses.length}{" "}
            {expenses.length === 1 ? "entry" : "entries"} ·
            verified against receipts by AI
          </p>
          <VerificationTally expenses={expenses} />
        </div>

        <Button
          type="button"
          variant="secondary"
          onClick={onRefresh}
          disabled={loading}
          className="px-3.5 py-2"
        >
          <RefreshIcon
            className={`size-4 ${loading ? "animate-spin" : ""}`}
          />
          Refresh
        </Button>
      </div>

      {showSkeleton ? (
        <ul className="space-y-3" aria-hidden="true">
          {[0, 1, 2].map((index) => (
            <li
              key={index}
              className="flex animate-pulse items-center gap-4 rounded-2xl border border-slate-100 p-4"
            >
              <div className="size-11 rounded-xl bg-slate-200" />
              <div className="flex-1 space-y-2">
                <div className="h-4 w-1/3 rounded bg-slate-200" />
                <div className="h-3 w-1/4 rounded bg-slate-100" />
              </div>
              <div className="h-5 w-16 rounded bg-slate-200" />
            </li>
          ))}
        </ul>
      ) : expenses.length === 0 ? (
        <div className="flex flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-200 px-6 py-14 text-center">
          <div className="grid size-14 place-items-center rounded-full bg-indigo-50 text-indigo-500">
            <InboxIcon className="size-7" />
          </div>
          <p className="mt-4 font-semibold text-slate-800">
            No expenses yet
          </p>
          <p className="mt-1 max-w-xs text-sm text-slate-500">
            Add your first expense using the form to start
            tracking your spending.
          </p>
        </div>
      ) : (
        <ul className="space-y-3">
          {expenses.map((expense) => (
            <ExpenseItem key={expense.id} expense={expense} />
          ))}
        </ul>
      )}
    </Card>
  );
}

const TALLY_ORDER: ValidationStatus[] = [
  "MISMATCH",
  "NEEDS_REVIEW",
  "PENDING",
  "VERIFIED",
];

function VerificationTally({ expenses }: { expenses: Expense[] }) {
  const counts = new Map<ValidationStatus, number>();

  for (const expense of expenses) {
    const status = expense.receipt?.validationStatus;

    if (status && status in VALIDATION_STATUS_STYLES) {
      counts.set(status, (counts.get(status) ?? 0) + 1);
    }
  }

  if (counts.size === 0) {
    return null;
  }

  return (
    <div className="mt-3 flex flex-wrap gap-2">
      {TALLY_ORDER.filter((status) => counts.has(status)).map(
        (status) => (
          <span
            key={status}
            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium ring-1 ring-inset ${VALIDATION_STATUS_STYLES[status].badge}`}
          >
            <span className="font-bold">{counts.get(status)}</span>
            {VALIDATION_STATUS_STYLES[status].shortLabel}
          </span>
        ),
      )}
    </div>
  );
}
