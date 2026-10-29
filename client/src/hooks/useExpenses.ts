import { useCallback, useEffect, useState } from "react";
import { getExpenses, getSummary } from "../api/expenses";
import type { Expense, Summary } from "../types/expense";
import { getErrorMessage } from "../utils/errors";

type ExpensesData = {
  expenses: Expense[];
  summary: Summary;
};

async function loadExpensesData(): Promise<ExpensesData> {
  const [expenses, summary] = await Promise.all([
    getExpenses(),
    getSummary(),
  ]);

  return { expenses, summary };
}

export function useExpenses() {
  const [data, setData] = useState<ExpensesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  const handleLoaded = useCallback((result: ExpensesData) => {
    setData(result);
    setError("");
    setLoading(false);
  }, []);

  const handleFailed = useCallback((err: unknown) => {
    console.error(err);
    setError(getErrorMessage(err, "Failed to load data"));
    setLoading(false);
  }, []);

  useEffect(() => {
    let ignore = false;

    loadExpensesData().then(
      (result) => {
        if (!ignore) handleLoaded(result);
      },
      (err) => {
        if (!ignore) handleFailed(err);
      },
    );

    return () => {
      ignore = true;
    };
  }, [handleLoaded, handleFailed]);

  const refresh = useCallback(async () => {
    setLoading(true);

    try {
      handleLoaded(await loadExpensesData());
    } catch (err) {
      handleFailed(err);
    }
  }, [handleLoaded, handleFailed]);

  return {
    expenses: data?.expenses ?? [],
    summary: data?.summary ?? null,
    loading,
    error,
    refresh,
  };
}
