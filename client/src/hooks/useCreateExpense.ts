import { useState } from "react";
import { createExpenseWithReceipt } from "../api/expenses";
import type { ExpenseFormValues } from "../types/expense";
import { getErrorMessage } from "../utils/errors";
import { validateExpense } from "../utils/validateExpense";

export function useCreateExpense(
  onCreated: () => Promise<void> | void,
) {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState("");

  // Resolves to true when the expense was saved.
  async function createExpense(
    values: ExpenseFormValues,
    receipt: File | null,
  ) {
    const validationError = validateExpense(
      values,
      receipt,
    );

    if (validationError || !receipt) {
      setError(
        validationError ?? "Please select a receipt.",
      );
      return false;
    }

    try {
      setSubmitting(true);
      setError("");

      await createExpenseWithReceipt(values, receipt);
      await onCreated();

      return true;
    } catch (err) {
      console.error(err);
      setError(
        getErrorMessage(err, "Failed to create expense"),
      );
      return false;
    } finally {
      setSubmitting(false);
    }
  }

  return {
    createExpense,
    submitting,
    error,
    clearError: () => setError(""),
  };
}
