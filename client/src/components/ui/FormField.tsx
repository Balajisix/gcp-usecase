import type { ReactNode } from "react";

type FormFieldProps = {
  label: string;
  htmlFor?: string;
  hint?: string;
  className?: string;
  children: ReactNode;
};

export function FormField({
  label,
  htmlFor,
  hint,
  className = "",
  children,
}: FormFieldProps) {
  return (
    <div className={className}>
      <label
        htmlFor={htmlFor}
        className="mb-1.5 block text-sm font-medium text-slate-700"
      >
        {label}
      </label>

      {children}

      {hint && (
        <p className="mt-1.5 text-xs text-slate-500">
          {hint}
        </p>
      )}
    </div>
  );
}
