import { ExpenseForm } from "../components/expenses/ExpenseForm";
import { ExpenseList } from "../components/expenses/ExpenseList";
import { AppHeader } from "../components/layout/AppHeader";
import { SummaryCards } from "../components/summary/SummaryCards";
import { Alert } from "../components/ui/Alert";
import { useCreateExpense } from "../hooks/useCreateExpense";
import { useExpenses } from "../hooks/useExpenses";

export function DashboardPage() {
  const { expenses, summary, loading, error, refresh } =
    useExpenses();

  const { createExpense, submitting, error: createError, clearError } =
    useCreateExpense(refresh);

  return (
    <div className="min-h-screen bg-slate-50">
      <AppHeader />

      <main className="relative mx-auto -mt-20 max-w-6xl space-y-6 px-4 pb-16 sm:px-6">
        <SummaryCards summary={summary} loading={loading} />

        {error && <Alert>{error}</Alert>}

        <div className="grid items-start gap-6 lg:grid-cols-5">
          <div className="lg:sticky lg:top-6 lg:col-span-2">
            <ExpenseForm
              onSubmit={createExpense}
              submitting={submitting}
              error={createError}
              onDismissError={clearError}
            />
          </div>

          <div className="lg:col-span-3">
            <ExpenseList
              expenses={expenses}
              loading={loading}
              onRefresh={refresh}
            />
          </div>
        </div>
      </main>
    </div>
  );
}
