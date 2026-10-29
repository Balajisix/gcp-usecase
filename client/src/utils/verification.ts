import type {
  Expense,
  Mismatch,
  Receipt,
  ReceiptAiResult,
} from "../types/expense";
import { formatCurrency, formatDate } from "./format";

export const NOT_DETECTED = "Not detected";

export type ComparisonResult = "match" | "mismatch" | "unchecked";

export type ComparisonRow = {
  field: string;
  label: string;
  entered: string;
  extracted: string;
  result: ComparisonResult;
  note?: string;
};

// A field can only be called a match once the server has run the
// comparison; before that, "not in mismatches" means "not checked".
export function isValidated(receipt: Receipt) {
  return (
    receipt.validationStatus === "VERIFIED" ||
    receipt.validationStatus === "MISMATCH" ||
    receipt.validationStatus === "NEEDS_REVIEW"
  );
}

// Field keys as reported in `receipt.mismatches`.
const COMPARED_FIELDS = [
  "merchant",
  "amount",
  "expense_date",
  "category",
];

function getAmountNote(
  expense: Expense,
  aiResult: ReceiptAiResult,
) {
  const currency = aiResult.currency || "INR";

  if (
    currency !== "INR" ||
    typeof aiResult.totalAmount !== "number"
  ) {
    return undefined;
  }

  const difference = expense.amount - aiResult.totalAmount;

  if (difference === 0) {
    return undefined;
  }

  return `${formatCurrency(Math.abs(difference))} ${
    difference > 0 ? "more" : "less"
  } than the receipt`;
}

export function getComparisonRows(
  expense: Expense,
  receipt: Receipt,
  aiResult: ReceiptAiResult,
): ComparisonRow[] {
  const validated = isValidated(receipt);
  const mismatched = new Set(
    (receipt.mismatches ?? []).map((mismatch) => mismatch.field),
  );

  const rows: Omit<ComparisonRow, "result">[] = [
    {
      field: "merchant",
      label: "Merchant",
      entered: expense.merchant,
      extracted: aiResult.merchant || NOT_DETECTED,
    },
    {
      field: "amount",
      label: "Amount",
      entered: formatCurrency(expense.amount),
      extracted:
        typeof aiResult.totalAmount === "number"
          ? formatCurrency(
              aiResult.totalAmount,
              aiResult.currency || "INR",
            )
          : NOT_DETECTED,
      note: mismatched.has("amount")
        ? getAmountNote(expense, aiResult)
        : undefined,
    },
    {
      field: "expense_date",
      label: "Date",
      entered: formatDate(expense.expenseDate),
      extracted: aiResult.transactionDate
        ? formatDate(aiResult.transactionDate)
        : NOT_DETECTED,
    },
    {
      field: "category",
      label: "Category",
      entered: expense.category,
      extracted: aiResult.category || NOT_DETECTED,
    },
  ];

  return rows.map((row) => ({
    ...row,
    result: mismatched.has(row.field)
      ? "mismatch"
      : validated
        ? "match"
        : "unchecked",
  }));
}

// Mismatches the backend reports for fields not shown in the comparison table.
export function getOtherMismatches(mismatches: Mismatch[]) {
  return mismatches.filter(
    (mismatch) => !COMPARED_FIELDS.includes(mismatch.field),
  );
}

export function formatMismatchValue(value: unknown) {
  if (value === null || value === undefined || value === "") {
    return NOT_DETECTED;
  }

  if (typeof value === "object") {
    return JSON.stringify(value);
  }

  return String(value);
}
