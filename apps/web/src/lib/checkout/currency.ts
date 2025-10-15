const formatterCache = new Map<string, Intl.NumberFormat>();

const getFormatter = (currency: string): Intl.NumberFormat => {
  const key = currency.toUpperCase();
  if (!formatterCache.has(key)) {
    formatterCache.set(
      key,
      new Intl.NumberFormat(undefined, {
        style: 'currency',
        currency: key,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      }),
    );
  }
  return formatterCache.get(key)!;
};

export const formatCurrency = (value: number, currency: string = 'USD'): string => {
  const formatter = getFormatter(currency);
  return formatter.format(value ?? 0);
};
