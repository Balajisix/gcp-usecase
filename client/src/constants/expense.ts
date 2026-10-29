import type {
  ExpenseFormValues,
  ValidationStatus,
} from "../types/expense";

export const CATEGORIES = [
  "Food",
  "Shopping",
  "Travel",
  "Entertainment",
  "Health",
  "Utilities",
  "Other",
] as const;

// Full class strings so Tailwind can detect them at build time.
export const CATEGORY_STYLES: Record<string, string> = {
  Food: "bg-orange-100 text-orange-700",
  Shopping: "bg-pink-100 text-pink-700",
  Travel: "bg-sky-100 text-sky-700",
  Entertainment: "bg-violet-100 text-violet-700",
  Health: "bg-emerald-100 text-emerald-700",
  Utilities: "bg-amber-100 text-amber-700",
  Other: "bg-slate-100 text-slate-700",
};

export const EMPTY_EXPENSE_FORM: ExpenseFormValues = {
  merchant: "",
  amount: "",
  expenseDate: "",
  category: "Other",
  notes: "",
};

export const RECEIPT_ACCEPTED_TYPES = [
  "image/jpeg",
  "image/png",
  "application/pdf",
];

export const RECEIPT_MAX_BYTES = 10 * 1024 * 1024;

export const VALIDATION_STATUS_STYLES: Record<
  ValidationStatus,
  { label: string; shortLabel: string; badge: string; row: string }
> = {
  VERIFIED: {
    label: "Receipt Verified",
    shortLabel: "Verified",
    badge: "bg-green-100 text-green-700 ring-green-600/20",
    row: "border-slate-100",
  },
  MISMATCH: {
    label: "Mismatch Found",
    shortLabel: "Mismatch",
    badge: "bg-red-100 text-red-700 ring-red-600/20",
    row: "border-red-200",
  },
  NEEDS_REVIEW: {
    label: "Needs Review",
    shortLabel: "Needs review",
    badge: "bg-orange-100 text-orange-700 ring-orange-600/20",
    row: "border-orange-200",
  },
  PENDING: {
    label: "Verifying...",
    shortLabel: "Verifying",
    badge: "bg-slate-100 text-slate-600 ring-slate-500/20",
    row: "border-slate-100",
  },
};
