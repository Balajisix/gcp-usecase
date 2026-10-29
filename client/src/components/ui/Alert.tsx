import type { ReactNode } from "react";
import { AlertIcon, XIcon } from "./icons";

type AlertProps = {
  children: ReactNode;
  onDismiss?: () => void;
};

export function Alert({ children, onDismiss }: AlertProps) {
  return (
    <div
      role="alert"
      className="flex items-start gap-3 rounded-2xl border border-red-200 bg-red-50 p-4 text-sm text-red-700"
    >
      <AlertIcon className="mt-0.5 size-5 shrink-0" />

      <p className="flex-1">{children}</p>

      {onDismiss && (
        <button
          type="button"
          onClick={onDismiss}
          aria-label="Dismiss"
          className="rounded-lg p-0.5 text-red-500 hover:bg-red-100"
        >
          <XIcon className="size-4" />
        </button>
      )}
    </div>
  );
}
