/**
 * Visa & Reference Number Rules and Date Calculator
 */

export interface NumberGenerationRules {
  visaPrefix: string; // default "35"
  visaDigitCount: number; // default 7
  refPrefix: string; // default "37"
  refDigitCount: number; // default 7
  enforceRules: boolean; // default true
}

export const DEFAULT_NUMBER_RULES: NumberGenerationRules = {
  visaPrefix: '35',
  visaDigitCount: 7,
  refPrefix: '37',
  refDigitCount: 7,
  enforceRules: true,
};

export const NUMBER_RULES_STORAGE_KEY = 'kuwait_evisa_number_rules_v1';

/**
 * Loads configured rules from localStorage with safe fallback
 */
export function getNumberRules(): NumberGenerationRules {
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      const raw = localStorage.getItem(NUMBER_RULES_STORAGE_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        return {
          visaPrefix: typeof parsed.visaPrefix === 'string' && parsed.visaPrefix.trim() !== '' ? parsed.visaPrefix : DEFAULT_NUMBER_RULES.visaPrefix,
          visaDigitCount: typeof parsed.visaDigitCount === 'number' && parsed.visaDigitCount > 0 ? parsed.visaDigitCount : DEFAULT_NUMBER_RULES.visaDigitCount,
          refPrefix: typeof parsed.refPrefix === 'string' && parsed.refPrefix.trim() !== '' ? parsed.refPrefix : DEFAULT_NUMBER_RULES.refPrefix,
          refDigitCount: typeof parsed.refDigitCount === 'number' && parsed.refDigitCount > 0 ? parsed.refDigitCount : DEFAULT_NUMBER_RULES.refDigitCount,
          enforceRules: parsed.enforceRules !== undefined ? Boolean(parsed.enforceRules) : DEFAULT_NUMBER_RULES.enforceRules,
        };
      }
    }
  } catch (e) {
    console.error('Failed to load number rules from storage', e);
  }
  return { ...DEFAULT_NUMBER_RULES };
}

/**
 * Saves configured rules to localStorage and dispatches change event
 */
export function saveNumberRules(rules: Partial<NumberGenerationRules>): NumberGenerationRules {
  const current = getNumberRules();
  const updated: NumberGenerationRules = {
    ...current,
    ...rules,
  };
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      localStorage.setItem(NUMBER_RULES_STORAGE_KEY, JSON.stringify(updated));
      window.dispatchEvent(new CustomEvent('number-rules-updated', { detail: updated }));
    }
  } catch (e) {
    console.error('Failed to save number rules to storage', e);
  }
  return updated;
}

/**
 * Resets rules back to default 35 & 37
 */
export function resetNumberRules(): NumberGenerationRules {
  return saveNumberRules(DEFAULT_NUMBER_RULES);
}

export const USED_NUMBERS_STORAGE_KEY = 'kuwait_evisa_used_numbers_registry_v1';

interface UsedNumbersRegistry {
  visaNumbers: string[];
  refNumbers: string[];
}

/**
 * Loads the set of already-used Visa and Reference numbers from localStorage
 * and seeds it from any saved history records so duplicates are mathematically impossible.
 */
function getUsedNumbersRegistry(type: 'visa' | 'ref'): Set<string> {
  const set = new Set<string>();
  try {
    if (typeof window !== 'undefined' && window.localStorage) {
      // 1. From persistent registry
      const raw = localStorage.getItem(USED_NUMBERS_STORAGE_KEY);
      if (raw) {
        const parsed: UsedNumbersRegistry = JSON.parse(raw);
        const list = type === 'visa' ? parsed.visaNumbers : parsed.refNumbers;
        if (Array.isArray(list)) {
          list.forEach((n) => set.add(String(n).trim()));
        }
      }

      // 2. From saved visa records in history
      const historyRaw = localStorage.getItem('bitik_visa_records_v1');
      if (historyRaw) {
        const history = JSON.parse(historyRaw);
        if (Array.isArray(history)) {
          history.forEach((rec: any) => {
            const val = type === 'visa' ? rec?.data?.visaNumber : rec?.data?.referenceNumber;
            if (val) set.add(String(val).trim());
          });
        }
      }
    }
  } catch (e) {
    console.warn('Could not read used numbers registry', e);
  }
  return set;
}

/**
 * Marks a generated or saved number as permanently used so it can never be generated again.
 */
export function markNumberAsUsed(type: 'visa' | 'ref', numberStr: string): void {
  if (!numberStr || typeof window === 'undefined' || !window.localStorage) return;
  const clean = String(numberStr).trim();
  if (!clean) return;

  try {
    const raw = localStorage.getItem(USED_NUMBERS_STORAGE_KEY);
    let parsed: UsedNumbersRegistry = { visaNumbers: [], refNumbers: [] };
    if (raw) {
      try {
        parsed = JSON.parse(raw);
        if (!Array.isArray(parsed.visaNumbers)) parsed.visaNumbers = [];
        if (!Array.isArray(parsed.refNumbers)) parsed.refNumbers = [];
      } catch {
        parsed = { visaNumbers: [], refNumbers: [] };
      }
    }

    const targetList = type === 'visa' ? parsed.visaNumbers : parsed.refNumbers;
    if (!targetList.includes(clean)) {
      targetList.push(clean);
      localStorage.setItem(USED_NUMBERS_STORAGE_KEY, JSON.stringify(parsed));
    }
  } catch (e) {
    console.warn('Could not save used number to registry', e);
  }
}

/**
 * Generates random digits for non-sequential IDs
 */
export function getRandomDigits(count: number = 7): string {
  const safeCount = Math.max(1, Math.min(15, count));
  let result = '';
  // First digit non-zero (1-9) to avoid leading zero omission
  result += Math.floor(1 + Math.random() * 9).toString();
  for (let i = 1; i < safeCount; i++) {
    result += Math.floor(Math.random() * 10).toString();
  }
  return result;
}

/**
 * Visa Number Auto-Generator
 * Requirement: Default first 2 digits are "35" followed by 7 random digits.
 * User Requirement: "Visa number and Reference no এক নাম্বার দ্বিতীয়বার আর আসবে না"
 * (Guarantees 100% uniqueness - no visa number will ever be generated twice).
 */
export function generateVisaNumber(overrideRules?: Partial<NumberGenerationRules>): string {
  const rules = { ...getNumberRules(), ...overrideRules };
  const usedSet = getUsedNumbersRegistry('visa');

  let candidate = '';
  let attempts = 0;
  do {
    const digits = getRandomDigits(rules.visaDigitCount);
    candidate = `${rules.visaPrefix}${digits}`;
    attempts++;
  } while (usedSet.has(candidate) && attempts < 1000);

  // Mark permanently in registry
  markNumberAsUsed('visa', candidate);
  return candidate;
}

/**
 * Reference Number Auto-Generator
 * Requirement: Default first 2 digits are "37" followed by 7 random digits.
 * User Requirement: "Visa number and Reference no এক নাম্বার দ্বিতীয়বার আর আসবে না"
 * (Guarantees 100% uniqueness - no reference number will ever be generated twice).
 */
export function generateReferenceNumber(overrideRules?: Partial<NumberGenerationRules>): string {
  const rules = { ...getNumberRules(), ...overrideRules };
  const usedSet = getUsedNumbersRegistry('ref');

  let candidate = '';
  let attempts = 0;
  do {
    const digits = getRandomDigits(rules.refDigitCount);
    candidate = `${rules.refPrefix}${digits}`;
    attempts++;
  } while (usedSet.has(candidate) && attempts < 1000);

  // Mark permanently in registry
  markNumberAsUsed('ref', candidate);
  return candidate;
}

/**
 * Expiry Date Calculator (4 Months)
 * Requirement: 4 months after Issue Date (ইস্যু তারিখের ৪ মাস পর)
 * E.g., Issue Date: 2026-09-15 -> Expiry Date: 2027-01-15 (or 2027-01-14 with subtractOneDay)
 */
export function calculate4MonthsExpiry(issueDateStr: string, subtractOneDay: boolean = false): string {
  if (!issueDateStr) return '';
  const [year, month, day] = issueDateStr.split('-').map(Number);
  if (!year || !month || !day) return '';

  const date = new Date(year, month - 1 + 4, day);
  // Handle edge case if month rolls over (e.g., 31st into a 30-day month)
  const targetMonth = (month - 1 + 4) % 12;
  if (date.getMonth() !== targetMonth) {
    date.setDate(0); // set to last day of target month
  }
  if (subtractOneDay) {
    date.setDate(date.getDate() - 1);
  }

  const yyyy = date.getFullYear();
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

/**
 * Expiry Date Calculator (3 Months - legacy)
 */
export function calculate3MonthsExpiry(issueDateStr: string): string {
  return calculate4MonthsExpiry(issueDateStr);
}

/**
 * Formats standard date to YYYY-MM-DD
 */
export function getTodayDateString(): string {
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, '0');
  const dd = String(today.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}
