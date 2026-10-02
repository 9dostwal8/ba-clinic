// @ts-nocheck
export const formatNumber = (value: number | string, decimals: number = 0): string => {
  const numValue = typeof value === 'string' ? parseFloat(value) : value;
  if (isNaN(numValue)) return '0';

  const rounded = decimals === 0 ? Math.round(numValue) : Number(numValue.toFixed(decimals));
  return rounded.toLocaleString('en-US', {
    minimumFractionDigits: 0,
    maximumFractionDigits: 0
  });
};

export const formatCurrency = (value: number | string, currency?: string): string => {
  const formatted = formatNumber(value);
  return currency ? `${formatted} ${currency}` : formatted;
};

export const NUMBER_STYLE_CLASSES = {
  primary: 'text-yellow-600 font-semibold',
  large: 'text-2xl font-bold text-yellow-600',
  xlarge: 'text-3xl font-bold text-yellow-600',
  negative: 'text-yellow-700 font-semibold',
  positive: 'text-yellow-600 font-semibold',
  balance: 'text-yellow-900 font-bold',
};
