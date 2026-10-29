export type ReceiptAiResult = {
  merchant: string;
  transactionDate: string;
  totalAmount: number;
  currency: string;
  category: string;
  items: Array<{
    name: string;
    quantity: number;
    amount: number;
  }>;
  needsReview: boolean;
  reviewReason: string;
};

export type Mismatch = {
  field: string;
  entered: unknown;
  extracted: unknown;
};

export type ValidationStatus =
  | "VERIFIED"
  | "MISMATCH"
  | "NEEDS_REVIEW"
  | "PENDING";

export type Receipt = {
  id: number;
  fileName: string;
  processingStatus: string;
  aiStatus: string;
  aiResult: ReceiptAiResult | null;
  needsReview: boolean;
  // Optional: the API may omit these until it returns validation results.
  validationStatus?: ValidationStatus;
  mismatches?: Mismatch[] | null;
  validatedAt?: string | null;
};

export type Expense = {
  id: number;
  merchant: string;
  amount: number;
  expenseDate: string;
  category: string;
  notes: string | null;
  createdAt: string;
  receipt: Receipt | null;
};

export type Summary = {
  expenseCount: number;
  totalAmount: number;
  averageAmount: number;
};

export type ExpenseFormValues = {
  merchant: string;
  amount: string;
  expenseDate: string;
  category: string;
  notes: string;
};
