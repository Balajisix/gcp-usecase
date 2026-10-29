import { WalletIcon } from "../ui/icons";

export function AppHeader() {
  return (
    <header className="relative overflow-hidden bg-linear-to-br from-indigo-700 via-indigo-600 to-violet-600 pb-28 pt-10 text-white">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -right-24 -top-24 size-96 rounded-full bg-white/10 blur-3xl"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute -bottom-32 left-1/4 size-80 rounded-full bg-fuchsia-400/20 blur-3xl"
      />

      <div className="relative mx-auto flex max-w-6xl items-center gap-4 px-4 sm:px-6">
        <div className="grid size-12 place-items-center rounded-2xl bg-white/15 ring-1 ring-white/25 backdrop-blur">
          <WalletIcon className="size-6" />
        </div>

        <div>
          <h1 className="text-2xl font-bold tracking-tight sm:text-3xl">
            Expense Analyzer
          </h1>

          <p className="mt-0.5 text-sm text-indigo-100">
            Track spending and keep every receipt in one place
          </p>
        </div>

        <span className="ml-auto hidden rounded-full bg-white/15 px-3 py-1 text-xs font-medium ring-1 ring-white/25 sm:inline-block">
          Stage 4 — AI Receipt Verification
        </span>
      </div>
    </header>
  );
}
