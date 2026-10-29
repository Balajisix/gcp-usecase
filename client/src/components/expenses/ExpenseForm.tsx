import {
  type ChangeEvent,
  type SubmitEvent,
  useState,
} from "react";
import {
  CATEGORIES,
  EMPTY_EXPENSE_FORM,
} from "../../constants/expense";
import type { ExpenseFormValues } from "../../types/expense";
import { Alert } from "../ui/Alert";
import { Button } from "../ui/Button";
import { Card } from "../ui/Card";
import { FormField } from "../ui/FormField";
import { PlusIcon } from "../ui/icons";
import { inputClassName } from "../ui/styles";
import { ReceiptInput } from "./ReceiptInput";

type ExpenseFormProps = {
  onSubmit: (
    values: ExpenseFormValues,
    receipt: File | null,
  ) => Promise<boolean>;
  submitting: boolean;
  error: string;
  onDismissError: () => void;
};

type FieldElement =
  | HTMLInputElement
  | HTMLSelectElement
  | HTMLTextAreaElement;

export function ExpenseForm({
  onSubmit,
  submitting,
  error,
  onDismissError,
}: ExpenseFormProps) {
  const [values, setValues] = useState(EMPTY_EXPENSE_FORM);
  const [receipt, setReceipt] = useState<File | null>(null);

  function updateField(field: keyof ExpenseFormValues) {
    return (event: ChangeEvent<FieldElement>) => {
      const { value } = event.currentTarget;
      setValues((current) => ({ ...current, [field]: value }));
    };
  }

  async function handleSubmit(
    event: SubmitEvent<HTMLFormElement>,
  ) {
    event.preventDefault();

    const saved = await onSubmit(values, receipt);

    if (saved) {
      setValues(EMPTY_EXPENSE_FORM);
      setReceipt(null);
    }
  }

  return (
    <Card>
      <div className="mb-6">
        <h2 className="text-lg font-semibold text-slate-900">
          Add Expense
        </h2>
        <p className="mt-1 text-sm text-slate-500">
          Enter your expense details and upload the receipt for
          AI verification.
        </p>
      </div>

      <form
        onSubmit={handleSubmit}
        noValidate
        className="grid gap-4 sm:grid-cols-2"
      >
        <FormField
          label="Merchant"
          htmlFor="merchant"
          className="sm:col-span-2"
        >
          <input
            id="merchant"
            type="text"
            placeholder="e.g. Blue Tokai Coffee"
            value={values.merchant}
            onChange={updateField("merchant")}
            className={inputClassName}
          />
        </FormField>

        <FormField label="Amount" htmlFor="amount">
          <div className="relative">
            <span className="pointer-events-none absolute inset-y-0 left-4 flex items-center text-sm text-slate-400">
              ₹
            </span>
            <input
              id="amount"
              type="number"
              min="0"
              step="0.01"
              inputMode="decimal"
              placeholder="0.00"
              value={values.amount}
              onChange={updateField("amount")}
              className={`${inputClassName} pl-8`}
            />
          </div>
        </FormField>

        <FormField label="Date" htmlFor="expenseDate">
          <input
            id="expenseDate"
            type="date"
            value={values.expenseDate}
            onChange={updateField("expenseDate")}
            className={inputClassName}
          />
        </FormField>

        <FormField
          label="Category"
          htmlFor="category"
          className="sm:col-span-2"
        >
          <select
            id="category"
            value={values.category}
            onChange={updateField("category")}
            className={inputClassName}
          >
            {CATEGORIES.map((category) => (
              <option key={category}>{category}</option>
            ))}
          </select>
        </FormField>

        <FormField
          label="Notes"
          htmlFor="notes"
          className="sm:col-span-2"
        >
          <textarea
            id="notes"
            placeholder="Optional details"
            value={values.notes}
            onChange={updateField("notes")}
            className={`${inputClassName} min-h-24 resize-y`}
          />
        </FormField>

        <ReceiptInput
          file={receipt}
          onChange={setReceipt}
          className="sm:col-span-2"
        />

        {error && (
          <div className="sm:col-span-2">
            <Alert onDismiss={onDismissError}>{error}</Alert>
          </div>
        )}

        <Button
          type="submit"
          loading={submitting}
          className="sm:col-span-2"
        >
          {!submitting && <PlusIcon className="size-4" />}
          {submitting
            ? "Uploading & Processing..."
            : "Add Expense & Verify Receipt"}
        </Button>
      </form>
    </Card>
  );
}
