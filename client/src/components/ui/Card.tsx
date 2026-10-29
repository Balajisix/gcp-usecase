import type { ReactNode } from "react";

type CardProps = {
  children: ReactNode;
  className?: string;
};

export function Card({ children, className = "" }: CardProps) {
  return (
    <section
      className={`rounded-3xl border border-slate-200/70 bg-white p-6 shadow-sm shadow-slate-200/50 ${className}`}
    >
      {children}
    </section>
  );
}
