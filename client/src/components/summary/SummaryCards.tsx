import type { Summary } from "../../types/expense";
import { formatCurrency } from "../../utils/format";
import {
  ReceiptIcon,
  TrendingUpIcon,
  WalletIcon,
} from "../ui/icons";
import { StatCard } from "./StatCard";

type SummaryCardsProps = {
  summary: Summary | null;
  loading: boolean;
};

export function SummaryCards({
  summary,
  loading,
}: SummaryCardsProps) {
  return (
    <div className="grid gap-4 sm:grid-cols-3">
      <StatCard
        label="Total Expenses"
        value={String(summary?.expenseCount ?? 0)}
        icon={<ReceiptIcon className="size-6" />}
        iconClassName="bg-indigo-100 text-indigo-600"
        loading={loading && !summary}
      />

      <StatCard
        label="Total Spent"
        value={formatCurrency(summary?.totalAmount ?? 0)}
        icon={<WalletIcon className="size-6" />}
        iconClassName="bg-emerald-100 text-emerald-600"
        loading={loading && !summary}
      />

      <StatCard
        label="Average Expense"
        value={formatCurrency(summary?.averageAmount ?? 0)}
        icon={<TrendingUpIcon className="size-6" />}
        iconClassName="bg-amber-100 text-amber-600"
        loading={loading && !summary}
      />
    </div>
  );
}
