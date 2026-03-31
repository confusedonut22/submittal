function pad2(value) {
  return String(value).padStart(2, "0");
}

function normalizeCurrency(currency) {
  const normalized = String(currency || "USD").trim().toUpperCase();
  return normalized || "USD";
}

export function formatSessionDuration(elapsedMs) {
  const safeElapsed = Number.isFinite(elapsedMs) && elapsedMs > 0 ? Math.floor(elapsedMs / 1000) : 0;
  const hours = Math.floor(safeElapsed / 3600);
  const minutes = Math.floor((safeElapsed % 3600) / 60);
  const seconds = safeElapsed % 60;

  if (hours > 0) {
    return `${pad2(hours)}:${pad2(minutes)}:${pad2(seconds)}`;
  }

  return `${pad2(minutes)}:${pad2(seconds)}`;
}

export function formatSignedMoney(amount, scale = 1_000_000, currency = "USD") {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const prefix = safeAmount >= 0 ? "+" : "-";
  return `${prefix}${formatCurrencyAmount(Math.abs(safeAmount), currency, scale)}`;
}

export function formatCurrencyAmount(amount, currency = "USD", scale = 1_000_000) {
  const safeAmount = Number.isFinite(amount) ? amount : 0;
  const normalizedCurrency = normalizeCurrency(currency);

  try {
    return new Intl.NumberFormat("en-US", {
      style: "currency",
      currency: normalizedCurrency,
      currencyDisplay: "symbol",
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(safeAmount / scale);
  } catch {
    return `${normalizedCurrency} ${(safeAmount / scale).toFixed(2)}`;
  }
}
