const currencyFormatters = new Map<string, Intl.NumberFormat>();

export function formatCurrency(
  value: number,
  currency = "INR",
) {
  let formatter = currencyFormatters.get(currency);

  if (!formatter) {
    try {
      formatter = new Intl.NumberFormat("en-IN", {
        style: "currency",
        currency,
      });
    } catch {
      // Unknown currency code from the receipt: fall back to INR.
      return formatCurrency(value);
    }

    currencyFormatters.set(currency, formatter);
  }

  return formatter.format(value);
}

export function formatDateTime(value: string) {
  return new Date(value).toLocaleString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
  });
}

// "expense_date" -> "Expense date"
export function humanize(value: string) {
  const label = value.replaceAll("_", " ").toLowerCase();

  return label.charAt(0).toUpperCase() + label.slice(1);
}

// Parses "YYYY-MM-DD" (or an ISO string) as a local date to avoid timezone shifts.
export function formatDate(value: string) {
  const [year, month, day] = value
    .slice(0, 10)
    .split("-")
    .map(Number);

  const date = new Date(year, month - 1, day);

  if (Number.isNaN(date.getTime())) {
    return value;
  }

  return date.toLocaleDateString("en-IN", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

export function formatFileSize(bytes: number) {
  if (bytes < 1024) {
    return `${bytes} B`;
  }

  if (bytes < 1024 * 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }

  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

// "AI_PROCESSING" -> "Processing"
export function formatAiStatus(aiStatus: string) {
  return humanize(aiStatus.replace(/^AI_/, ""));
}
