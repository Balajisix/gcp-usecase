import {
  RECEIPT_ACCEPTED_TYPES,
  RECEIPT_MAX_BYTES,
} from "../constants/expense";
import type { ExpenseFormValues } from "../types/expense";

// Returns an error message, or null when the input is valid.
export function validateExpense(
  values: ExpenseFormValues,
  receipt: File | null,
) {
  if (
    !values.merchant.trim() ||
    !values.amount ||
    !values.expenseDate
  ) {
    return "Merchant, amount and date are required.";
  }

  if (Number(values.amount) <= 0) {
    return "Amount must be greater than zero.";
  }

  if (!receipt) {
    return "Please select a receipt.";
  }

  if (!RECEIPT_ACCEPTED_TYPES.includes(receipt.type)) {
    return "Receipt must be a JPEG, PNG or PDF file.";
  }

  if (receipt.size > RECEIPT_MAX_BYTES) {
    return "Receipt must be 10 MB or smaller.";
  }

  return null;
}
