export interface TueSunWeekOption {
  key: string;
  startYMD: string;
  endYMD: string;
  label: string;
}

/**
 * Generates Tuesday - Sunday weekly date ranges for a given YYYY-MM month,
 * following the exact logic in pc-aio-tracker (e.g., "Week 2: 6 - 11 Oct (Tue–Sun)").
 */
export function buildTueSunWeeksForMonth(yyyyMm: string): TueSunWeekOption[] {
  if (!yyyyMm || !/^\d{4}-\d{2}$/.test(yyyyMm)) return [];
  const [yStr, mStr] = yyyyMm.split('-');
  const year = Number(yStr);
  const monthIdx = Number(mStr) - 1;
  if (!Number.isFinite(year) || !Number.isFinite(monthIdx)) return [];

  const firstDayOfMonth = new Date(year, monthIdx, 1);
  const lastDayOfMonth = new Date(year, monthIdx + 1, 0);
  const monthShort = firstDayOfMonth.toLocaleString('en-GB', { month: 'short' });
  const monthFullLabel = firstDayOfMonth.toLocaleString('en-GB', { month: 'short', year: 'numeric' });

  const fmtYMD = (d: Date) =>
    `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;

  const options: TueSunWeekOption[] = [
    {
      key: 'ALL_MONTH',
      startYMD: fmtYMD(firstDayOfMonth),
      endYMD: fmtYMD(lastDayOfMonth),
      label: `All Weeks in ${monthFullLabel} (1 - ${lastDayOfMonth.getDate()} ${monthShort})`,
    },
  ];

  // Find the first Tuesday on or before the 1st of the month whose Sunday falls in this month
  const cursor = new Date(year, monthIdx, 1);
  const daysSinceTuesday = (cursor.getDay() - 2 + 7) % 7;
  cursor.setDate(cursor.getDate() - daysSinceTuesday);

  let weekNum = 1;
  while (cursor <= lastDayOfMonth) {
    const tue = new Date(cursor.getFullYear(), cursor.getMonth(), cursor.getDate());
    const sun = new Date(tue.getFullYear(), tue.getMonth(), tue.getDate() + 5); // Tuesday + 5 days = Sunday

    if (sun >= firstDayOfMonth) {
      const startYMD = fmtYMD(tue);
      const endYMD = fmtYMD(sun);
      const tueMon = tue.toLocaleString('en-GB', { month: 'short' });
      const sunMon = sun.toLocaleString('en-GB', { month: 'short' });
      const dateRangeText =
        tue.getMonth() === sun.getMonth()
          ? `${tue.getDate()} - ${sun.getDate()} ${sunMon}`
          : `${tue.getDate()} ${tueMon} - ${sun.getDate()} ${sunMon}`;

      options.push({
        key: `${startYMD}..${endYMD}`,
        startYMD,
        endYMD,
        label: `Week ${weekNum}: ${dateRangeText} (Tue–Sun)`,
      });
      weekNum++;
    }

    cursor.setDate(cursor.getDate() + 7);
  }

  return options;
}

export function parseSheetDate(dateStr: any): Date | null {
  if (!dateStr) return null;
  if (typeof dateStr === 'number') return new Date(Math.round((dateStr - 25569) * 86400 * 1000));
  const str = String(dateStr).trim();
  const parts = str.split(/[\/\-]/);
  if (parts.length === 3) {
    let year, month, day;
    if (parts[0].length === 4) {
      year = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      day = parseInt(parts[2].split(' ')[0], 10);
    } else {
      day = parseInt(parts[0], 10);
      month = parseInt(parts[1], 10) - 1;
      year = parseInt(parts[2].split(' ')[0], 10);
    }
    const d = new Date(year, month, day);
    if (!isNaN(d.getTime())) return d;
  }
  const fallback = new Date(str);
  return isNaN(fallback.getTime()) ? null : fallback;
}

export function toYMD(val: any): string {
  const d = parseSheetDate(val);
  if (!d) return String(val || '').trim();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`;
}

export function getAvailableMonths(monthsBack = 12): { value: string; label: string }[] {
  const months: { value: string; label: string }[] = [];
  const now = new Date();
  for (let i = 0; i < monthsBack; i++) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const value = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('en-GB', { month: 'long', year: 'numeric' });
    months.push({ value, label });
  }
  return months;
}

