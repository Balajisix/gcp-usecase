import { useState } from "react";
import { RECEIPT_ACCEPTED_TYPES } from "../../constants/expense";
import { formatFileSize } from "../../utils/format";
import { FormField } from "../ui/FormField";
import { FileIcon, UploadIcon, XIcon } from "../ui/icons";

type ReceiptInputProps = {
  file: File | null;
  onChange: (file: File | null) => void;
  className?: string;
};

export function ReceiptInput({
  file,
  onChange,
  className,
}: ReceiptInputProps) {
  const [dragging, setDragging] = useState(false);

  return (
    <FormField
      label="Receipt"
      htmlFor="receipt"
      hint="JPEG, PNG or PDF · Maximum 10 MB"
      className={className}
    >
      {file ? (
        <div className="flex items-center gap-3 rounded-xl border border-indigo-200 bg-indigo-50/60 p-3">
          <div className="grid size-10 shrink-0 place-items-center rounded-lg bg-white text-indigo-600 shadow-sm">
            <FileIcon className="size-5" />
          </div>

          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-800">
              {file.name}
            </p>
            <p className="text-xs text-slate-500">
              {formatFileSize(file.size)}
            </p>
          </div>

          <button
            type="button"
            onClick={() => onChange(null)}
            aria-label="Remove receipt"
            className="rounded-lg p-1.5 text-slate-500 transition hover:bg-white hover:text-slate-800"
          >
            <XIcon className="size-4" />
          </button>
        </div>
      ) : (
        // The input stays unmounted while a file is selected, so it is
        // empty again whenever the file is removed or the form is reset.
        <label
          htmlFor="receipt"
          onDragOver={(event) => {
            event.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(event) => {
            event.preventDefault();
            setDragging(false);
            onChange(event.dataTransfer.files[0] ?? null);
          }}
          className={`flex cursor-pointer flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed px-4 py-6 text-center transition focus-within:border-indigo-400 focus-within:ring-4 focus-within:ring-indigo-100 ${
            dragging
              ? "border-indigo-400 bg-indigo-50"
              : "border-slate-200 bg-slate-50/60 hover:border-indigo-300 hover:bg-indigo-50/40"
          }`}
        >
          <div className="grid size-11 place-items-center rounded-full bg-white text-indigo-600 shadow-sm">
            <UploadIcon className="size-5" />
          </div>

          <p className="text-sm text-slate-600">
            <span className="font-semibold text-indigo-600">
              Click to upload
            </span>{" "}
            or drag and drop
          </p>

          <input
            id="receipt"
            type="file"
            accept={RECEIPT_ACCEPTED_TYPES.join(",")}
            onChange={(event) =>
              onChange(
                event.currentTarget.files?.[0] ?? null,
              )
            }
            className="sr-only"
          />
        </label>
      )}
    </FormField>
  );
}
