import type {
  Expense,
  ExpenseFormValues,
  Summary,
} from "../types/expense";
import { request } from "./client";

// The API may send expense columns in snake_case with numeric values as
// strings (e.g. raw Postgres rows), so accept both shapes.
type RawExpense = Omit<
  Expense,
  "id" | "amount" | "expenseDate" | "createdAt" | "receipt"
> & {
  id: number | string;
  amount: number | string;
  expenseDate?: string;
  expense_date?: string;
  createdAt?: string;
  created_at?: string;
  receipt?: Expense["receipt"];
};

function normalizeExpense(raw: RawExpense): Expense {
  return {
    id: Number(raw.id),
    merchant: raw.merchant,
    amount: Number(raw.amount),
    expenseDate: raw.expenseDate ?? raw.expense_date ?? "",
    category: raw.category,
    notes: raw.notes,
    createdAt: raw.createdAt ?? raw.created_at ?? "",
    receipt: raw.receipt ?? null,
  };
}

export async function getExpenses() {
  const expenses = await request<RawExpense[]>("/api/expenses");

  return expenses.map(normalizeExpense);
}

export function getSummary() {
  return request<Summary>("/api/summary");
}

export async function createExpenseWithReceipt(
  values: ExpenseFormValues,
  receipt: File,
) {
  const formData = new FormData();

  formData.append("merchant", values.merchant);
  formData.append("amount", values.amount);
  formData.append("expenseDate", values.expenseDate);
  formData.append("category", values.category);
  formData.append("notes", values.notes);
  formData.append("receipt", receipt);

  await request("/api/expenses/with-receipt", {
    method: "POST",
    body: formData,
  });
}
