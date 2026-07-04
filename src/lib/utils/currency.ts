export const SUPPORTED_CURRENCIES = [
  { code: "PKR", name: "Pakistani Rupee", symbol: "Rs.", locale: "en-PK" },
  { code: "USD", name: "US Dollar", symbol: "$", locale: "en-US" },
  { code: "EUR", name: "Euro", symbol: "€", locale: "de-DE" },
  { code: "GBP", name: "British Pound", symbol: "£", locale: "en-GB" },
  { code: "AED", name: "UAE Dirham", symbol: "د.إ", locale: "ar-AE" },
  { code: "SAR", name: "Saudi Riyal", symbol: "﷼", locale: "ar-SA" },
  { code: "CAD", name: "Canadian Dollar", symbol: "C$", locale: "en-CA" },
  { code: "AUD", name: "Australian Dollar", symbol: "A$", locale: "en-AU" },
  { code: "INR", name: "Indian Rupee", symbol: "₹", locale: "en-IN" },
  { code: "CNY", name: "Chinese Yuan", symbol: "¥", locale: "zh-CN" },
];

export function getCurrencyInfo(code: string) {
  return SUPPORTED_CURRENCIES.find(c => c.code === code) || { code, name: code, symbol: code, locale: "en-US" };
}

export function formatCurrency(amount: number, currency: string): string {
  const info = getCurrencyInfo(currency);
  try {
    return new Intl.NumberFormat(info.locale, {
      style: "currency",
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    }).format(amount);
  } catch {
    return `${info.symbol} ${amount.toFixed(2)}`;
  }
}

export function convertToPKR(amount: number, exchangeRate: number): number {
  return amount * exchangeRate;
}

export function convertFromPKR(pkrAmount: number, exchangeRate: number): number {
  if (exchangeRate === 0) return 0;
  return pkrAmount / exchangeRate;
}

export function formatForeignAmount(amount: number, currency: string, baseAmount?: number): string {
  const formatted = formatCurrency(amount, currency);
  if (baseAmount !== undefined) {
    return `${formatted} (Rs. ${baseAmount.toFixed(2)})`;
  }
  return formatted;
}
