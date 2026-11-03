/**
 * Standardizes dates to YYYY-MM-DD
 * E.g., 2026-09-15
 */
export function formatToYYYYMMDD(dateStr?: string): string {
  if (!dateStr) return '';
  const trimmed = dateStr.trim();
  // Already in YYYY-MM-DD
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed;
  }
  // DD-MM-YYYY or DD/MM/YYYY or DD.MM.YYYY
  const dmyMatch = trimmed.match(/^(\d{1,2})[-/.](\d{1,2})[-/.](\d{4})$/);
  if (dmyMatch) {
    const day = dmyMatch[1].padStart(2, '0');
    const month = dmyMatch[2].padStart(2, '0');
    const year = dmyMatch[3];
    return `${year}-${month}-${day}`;
  }
  // YYYY/MM/DD or YYYY.MM.DD
  const ymdMatch = trimmed.match(/^(\d{4})[-/.](\d{1,2})[-/.](\d{1,2})$/);
  if (ymdMatch) {
    const year = ymdMatch[1];
    const month = ymdMatch[2].padStart(2, '0');
    const day = ymdMatch[3].padStart(2, '0');
    return `${year}-${month}-${day}`;
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
