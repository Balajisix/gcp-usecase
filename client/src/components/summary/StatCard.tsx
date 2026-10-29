import type { ReactNode } from "react";

type StatCardProps = {
  label: string;
  value: string;
  icon: ReactNode;
  iconClassName: string;
  loading?: boolean;
};

export function StatCard({
  label,
  value,
  icon,
  iconClassName,
  loading = false,
}: StatCardProps) {
  return (
    <div className="flex items-center gap-4 rounded-3xl border border-slate-200/70 bg-white p-5 shadow-lg shadow-slate-900/5">
      <div
        className={`grid size-12 shrink-0 place-items-center rounded-2xl ${iconClassName}`}
      >
        {icon}
      </div>

      <div className="min-w-0">
        <p className="text-sm font-medium text-slate-500">
          {label}
        </p>

        {loading ? (
          <div className="mt-2 h-7 w-24 animate-pulse rounded-lg bg-slate-200" />
        ) : (
          <p className="mt-1 truncate text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </p>
        )}
      </div>
    </div>
  );
}
