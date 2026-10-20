export const parseNum = (val: any): number => {
  if (typeof val === 'number') return isNaN(val) ? 0 : val;
  if (!val) return 0;
  const parsed = Number(String(val).replace(/[^0-9.-]+/g, ''));
  return isNaN(parsed) ? 0 : parsed;
};

export const formatIDR = (num: number): string => {
  const val = Math.round(Number(num) || 0);
  return 'Rp ' + val.toLocaleString('id-ID');
};

export const formatNum = (num: number): string => {
  return (Number(num) || 0).toLocaleString('en-US', { maximumFractionDigits: 0 });
};

export const formatPct = (num: number): string => {
  return ((Number(num) || 0) * 100).toFixed(2) + '%';
};

export const formatDecimal = (num: number, decimals = 2): string => {
  return (Number(num) || 0).toFixed(decimals);
};

export const formatROAS = (roas: number): string => {
  const val = Number(roas) || 0;
  return `${val.toFixed(2)}x`;
};

