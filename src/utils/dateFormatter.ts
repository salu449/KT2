const MONTH_MAP: Record<string, string> = {
  JAN: '01', JANUARY: '01',
  FEB: '02', FEBRUARY: '02',
  MAR: '03', MARCH: '03',
  APR: '04', APRIL: '04',
  MAY: '05',
  JUN: '06', JUNE: '06',
  JUL: '07', JULY: '07',
  AUG: '08', AUGUST: '08',
  SEP: '09', SEPT: '09', SEPTEMBER: '09',
  OCT: '10', OCTOBER: '10',
  NOV: '11', NOVEMBER: '11',
  DEC: '12', DECEMBER: '12',
};

/**
 * Standardizes dates to YYYY-MM-DD
 * Handles:
 * - '2026-10-29'
 * - '29 OCT 2026' or '29-OCT-2026' or '29/OCT/2026' (official passport format)
 * - '18 DEC 1978'
 * - '28 OCT 2036'
 * - '29-10-2026' or '29/10/2026'
 * - 'OCT 29, 2026'
 * - 6-digit YYMMDD e.g. '361028' -> '2036-10-28', '781218' -> '1978-12-18'
 */
export function formatToYYYYMMDD(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();

  // Already in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }

  // 1. Text Month Format: e.g. '29 OCT 2026', '28 OCT 2036', '18 DEC 1978', '29-OCT-2026'
  const textMonthMatch = trimmed.match(/^(\d{1,2})[\s\-/.]([A-Za-z]{3,9})[\s\-/.](19\d{2}|20\d{2}|\d{2})$/i);
  if (textMonthMatch) {
    const day = textMonthMatch[1].padStart(2, '0');
    const monthKey = textMonthMatch[2].toUpperCase();
    const month = MONTH_MAP[monthKey];
    let year = textMonthMatch[3];
    if (year.length === 2) {
      const yy = parseInt(year, 10);
      year = (yy > 40 ? '19' : '20') + year;
    }
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  // 2. Month-First Format: e.g. 'OCT 29 2026' or 'October 29, 2026'
  const monthFirstMatch = trimmed.match(/^([A-Za-z]{3,9})[\s\-/,.]+(\d{1,2})[\s\-/,.]+(19\d{2}|20\d{2}|\d{2})$/i);
  if (monthFirstMatch) {
    const monthKey = monthFirstMatch[1].toUpperCase();
    const month = MONTH_MAP[monthKey];
    const day = monthFirstMatch[2].padStart(2, '0');
    let year = monthFirstMatch[3];
    if (year.length === 2) {
      const yy = parseInt(year, 10);
      year = (yy > 40 ? '19' : '20') + year;
    }
    if (month) {
      return `${year}-${month}-${day}`;
    }
  }

  // 3. DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }

  // 4. YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  // 5. 6-digit YYMMDD e.g. MRZ dates '361028' -> 2036-10-28, '781218' -> 1978-12-18
  if (/^\d{6}$/.test(trimmed)) {
    const yy = parseInt(trimmed.substring(0, 2), 10);
    const mm = trimmed.substring(2, 4);
    const dd = trimmed.substring(4, 6);
    const century = yy > 45 ? '19' : '20';
    return `${century}${trimmed.substring(0, 2)}-${mm}-${dd}`;
  }

  return trimmed;
}

/**
 * Returns breakdown of date parts for labels: Year, Month, Day
 */
export function getDateBreakdown(dateStr?: string): { year: string; month: string; day: string } | null {
  const ymd = formatToYYYYMMDD(dateStr);
  if (!/^\d{4}-\d{2}-\d{2}$/.test(ymd)) return null;
  const [year, month, day] = ymd.split('-');
  return { year, month, day };
}
