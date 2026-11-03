import { formatToYYYYMMDD } from './dateFormatter';

/**
 * Standard ICAO 7-3-1 check digit calculator for MRZ strings
 */
export function calculateMrzCheckDigit(data: string): string {
  const weights = [7, 3, 1];
  let sum = 0;
  for (let i = 0; i < data.length; i++) {
    const char = data[i].toUpperCase();
    let value = 0;
    if (char >= '0' && char <= '9') {
      value = char.charCodeAt(0) - 48;
    } else if (char >= 'A' && char <= 'Z') {
      value = char.charCodeAt(0) - 55;
    } else if (char === '<') {
      value = 0;
    }
    sum += value * weights[i % 3];
  }
  return (sum % 10).toString();
}

/**
 * Converts date to 6-digit YYMMDD format.
 * E.g. '2026-09-23' -> '260923' (2026 সালকে শুধু 26, এরপর মাস 09, এরপর তারিখ 23)
 * Handles YYYY-MM-DD, DD-MM-YYYY, YYYY/MM/DD, etc.
 */
export function toYYMMDD(dateStr: string): string {
  if (!dateStr) return '000000';
  const clean = dateStr.trim();

  // If already 6 digits (e.g. 260923)
  if (/^\d{6}$/.test(clean)) {
    return clean;
  }

  // Format to standard YYYY-MM-DD
  const ymd = formatToYYYYMMDD(clean);
  if (/^\d{4}-\d{2}-\d{2}$/.test(ymd)) {
    const [year, month, day] = ymd.split('-');
    // 2026 -> 26, month -> 09, day -> 23
    const yy = year.slice(-2);
    const mm = month.padStart(2, '0').slice(-2);
    const dd = day.padStart(2, '0').slice(-2);
    return `${yy}${mm}${dd}`;
  }

  // Digits only fallback
  const digits = clean.replace(/[^0-9]/g, '');
  if (digits.length >= 8) {
    if (digits.startsWith('19') || digits.startsWith('20')) {
      return digits.substring(2, 8); // YYYYMMDD -> YYMMDD
    } else {
      // Possible DDMMYYYY
      const end4 = digits.substring(4, 8);
      if (end4.startsWith('19') || end4.startsWith('20')) {
        const dd = digits.substring(0, 2);
        const mm = digits.substring(2, 4);
        const yy = end4.substring(2);
        return `${yy}${mm}${dd}`;
      }
      return digits.substring(2, 8);
    }
  }

  return digits.padEnd(6, '0').substring(0, 6);
}

/**
 * Updates the 6-digit Issue Date (YYMMDD) and its check digit in MRZ Line 2.
 * E.g. in '2835517761BGD8802013M2609233373538093<<<<<<<<',
 * updates '260923' and check digit '3' to the new issue date and guarantees 8 chevrons '<<<<<<<<' at the end.
 */
export function updateMrzLine2IssueDate(mrzLine2: string, newIssueDate: string): string {
  if (!mrzLine2) return mrzLine2;
  const newYYMMDD = toYYMMDD(newIssueDate);
  const newCheck = calculateMrzCheckDigit(newYYMMDD);

  // Pattern: [20 chars before sex + Sex (M/F)][6 digits old date][1 digit check?][rest of line]
  const pattern = /^([A-Z0-9<]{20}[MF])(\d{6})(\d?)(.*)$/i;
  const match = mrzLine2.match(pattern);

  if (match) {
    const prefix = match[1]; // includes sex M/F
    let suffix = match[4]; // reference number & chevrons
    // Ensure line 2 ends with exactly 8 chevrons '<<<<<<<<'
    if (/<+$/.test(suffix)) {
      suffix = suffix.replace(/<+$/, '<<<<<<<<');
    } else {
      suffix = `${suffix}<<<<<<<<`;
    }
    return `${prefix}${newYYMMDD}${newCheck}${suffix}`;
  }

  // Loose pattern if length differs slightly
  const loosePattern = /^(.+?[MF])(\d{6})(\d?)(.*)$/i;
  const looseMatch = mrzLine2.match(loosePattern);
  if (looseMatch) {
    const prefix = looseMatch[1];
    let suffix = looseMatch[4];
    if (/<+$/.test(suffix)) {
      suffix = suffix.replace(/<+$/, '<<<<<<<<');
    } else {
      suffix = `${suffix}<<<<<<<<`;
    }
    return `${prefix}${newYYMMDD}${newCheck}${suffix}`;
  }

  return mrzLine2;
}

export interface MrzLine2Breakdown {
  visaNumber: string;
  visaCheck: string;
  countryCode: string;
  dobYYMMDD: string;
  dobCheck: string;
  sex: string;
  issueYYMMDD: string;
  issueCheck: string;
  referenceNumber: string;
  fillers: string;
}

export function parseKuwaitMrzLine2(mrzLine2: string): MrzLine2Breakdown | null {
  if (!mrzLine2 || mrzLine2.length < 35) return null;
  return {
    visaNumber: mrzLine2.substring(0, 9),
    visaCheck: mrzLine2.substring(9, 10),
    countryCode: mrzLine2.substring(10, 13),
    dobYYMMDD: mrzLine2.substring(13, 19),
    dobCheck: mrzLine2.substring(19, 20),
    sex: mrzLine2.substring(20, 21),
    issueYYMMDD: mrzLine2.substring(21, 27),
    issueCheck: mrzLine2.substring(27, 28),
    referenceNumber: mrzLine2.substring(28, 37),
    fillers: mrzLine2.substring(37),
  };
}

/**
 * Maps nationality to 3-letter ICAO code
 */
export function getCountryCode(nationality: string): string {
  const clean = (nationality || '').toUpperCase().trim();
  if (clean.includes('BANGLA') || clean === 'BGD') return 'BGD';
  if (clean.includes('INDIA') || clean === 'IND') return 'IND';
  if (clean.includes('PAKIS') || clean === 'PAK') return 'PAK';
  if (clean.includes('PHILIP') || clean === 'PHL') return 'PHL';
  if (clean.includes('NEPAL') || clean === 'NPL') return 'NPL';
  if (clean.includes('SRI') || clean === 'LKA') return 'LKA';
  if (clean.includes('EGYPT') || clean === 'EGY') return 'EGY';
  if (clean.includes('KUWAIT') || clean === 'KWT') return 'KWT';
  return clean.substring(0, 3).padEnd(3, 'X');
}

/**
 * Formats name for Line 1 of MRZ with VHKW prefix
 * Requirement: Kuwait eVisa MRZ Line 1 starts with VHKW (44 characters total)
 * E.g. 'MD SOHEL RANA MD BABUL HOWLADER' -> 'VHKWHOWLADER<<MD<SOHEL<RANA<MD<BABUL<<<<'
 */
export function formatMrzLine1Name(fullName: string): string {
  let cleanName = (fullName || 'APPLICANT')
    .toUpperCase()
    .replace(/[^A-Z0-9\s<]/g, '')
    .trim();

  // Strip VHKW prefix if already provided to prevent duplicate VHKW
  if (cleanName.startsWith('VHKW')) {
    cleanName = cleanName.substring(4).trim();
  }

  let formatted = '';
  // If already contains <<, format chevrons
  if (cleanName.includes('<<')) {
    formatted = cleanName.replace(/\s+/g, '<');
  } else {
    const parts = cleanName.split(/\s+/).filter(Boolean);
    if (parts.length <= 1) {
      formatted = parts[0] || 'APPLICANT';
    } else {
      // Last part is surname, earlier parts are given + father name
      const surname = parts[parts.length - 1];
      const givenAndOthers = parts.slice(0, -1).join('<');
      formatted = `${surname}<<${givenAndOthers}`;
    }
  }

  // Prepend VHKW as required for Kuwait eVisa MRZ Line 1 (padded to exactly 44 chars)
  const fullLine1 = `VHKW${formatted}`;
  return fullLine1.padEnd(44, '<').substring(0, 44);
}

/**
 * Generates Kuwait eVisa MRZ (Machine Readable Zone - 2 lines, 44 chars each)
 * Line 1 Example: VHKWRAHMAN<<MD<TOFAZZAL<HOSSAN<MD<SIDIKUR<<<<
 * Line 2 Example: 2835517761BGD8802013M2609233373538093<<<<<<<
 */
export function generateKuwaitMrz(params: {
  fullNameEnglish: string;
  visaNumber: string;
  referenceNumber: string;
  nationalityEnglish: string;
  dateOfBirth: string;
  sex: string;
  issueDate: string;
}): { line1: string; line2: string } {
  const {
    fullNameEnglish,
    visaNumber,
    referenceNumber,
    nationalityEnglish,
    dateOfBirth,
    sex,
    issueDate,
  } = params;

  // Line 1: VHKW + SURNAME<<GIVEN_NAMES<FATHER_NAME (44 chars starting with VHKW)
  const line1 = formatMrzLine1Name(fullNameEnglish);

  // Line 2 Components
  // 1. Visa Number (9 digits)
  const cleanVisaNo = (visaNumber || '350000000').padEnd(9, '0').substring(0, 9);
  // 2. Visa check digit (1 digit)
  const visaCheck = calculateMrzCheckDigit(cleanVisaNo);
  // 3. 3-letter Country code (e.g. BGD)
  const countryCode = getCountryCode(nationalityEnglish);
  // 4. Date of Birth in YYMMDD (6 digits)
  const dobYYMMDD = toYYMMDD(dateOfBirth);
  // 5. DOB check digit (1 digit)
  const dobCheck = calculateMrzCheckDigit(dobYYMMDD);
  // 6. Sex (1 char: M / F)
  const cleanSex = (sex || 'M').toUpperCase().startsWith('F') ? 'F' : 'M';
  // 7. Issue Date in YYMMDD (6 digits, e.g. 260830)
  const issueYYMMDD = toYYMMDD(issueDate);
  // 8. Issue Date check digit (1 digit)
  const issueCheck = calculateMrzCheckDigit(issueYYMMDD);
  // 9. Reference Number (9 digits, e.g. 375821743)
  const cleanRefNo = (referenceNumber || '370000000').padEnd(9, '0').substring(0, 9);

  // Combine line 2 (Always ends with exactly 8 chevrons '<<<<<<<<' as per Kuwait eVisa specification)
  const line2Raw = `${cleanVisaNo}${visaCheck}${countryCode}${dobYYMMDD}${dobCheck}${cleanSex}${issueYYMMDD}${issueCheck}${cleanRefNo}`;
  const line2 = `${line2Raw}<<<<<<<<`;

  return { line1, line2 };
}
