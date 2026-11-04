import type { LineKey, LineFontConfig, LineStylesConfig } from '../types';

export type { LineKey, LineFontConfig, LineStylesConfig };

export interface PadCalibration {
  // Global canvas offsets
  offsetX: number; // in mm or px (default 0)
  offsetY: number; // in mm or px (default 0)
  scale: number;   // 1 = 100%
  fontSizeOffset: number; // default 0

  // Right Column Guide & Name
  rightColumnOffset: number; // Fine offset for right-aligned items (default 0)
  nameXOffset?: number;
  nameYOffset?: number;
  nameLineSpacing?: number; // Spacing/gap between Arabic Name line and English Name line in px
  nameArabicYOffset?: number; // Fine Y offset for Arabic Name
  nameEnglishYOffset?: number; // Fine Y offset for English Name

  // Right Column Individual X & Y (Visa Number, Issue Date, Reference, Birth Date)
  visaNumberXOffset?: number;
  visaNumberYOffset?: number;
  issueDateXOffset?: number;
  issueDateYOffset?: number;
  referenceNumberXOffset?: number;
  referenceNumberYOffset?: number;
  birthDateXOffset?: number;
  birthDateYOffset?: number;

  // 1. Expiry Date (Individual X & Y)
  expiryDateXOffset: number;
  expiryDateYOffset?: number;

  // 2. Passport No (Individual X & Y)
  passportNoXOffset?: number;
  passportNoYOffset?: number;

  // 3. 2023-06-07 Passport Issue Date (Individual X & Y)
  passportIssueDateXOffset?: number;
  passportIssueDateYOffset?: number;

  // 4. 2033-06-06 Passport Expiry Date (Individual X & Y)
  passportExpiryDateXOffset?: number;
  passportExpiryDateYOffset?: number;

  // Legacy center offset
  passportCenterXOffset: number;

  // 5. MRZ (Individual X, Y, font size & chevron scale)
  mrzXOffset?: number;
  mrzYOffset?: number;
  mrzFontSizeOffset?: number;
  mrzChevronScaleY: number; // Vertical scale (squash / flatten)
  mrzChevronScaleX?: number; // Horizontal scale (width)
  mrzStrokeWidth?: number; // 0 = natural stroke (default), 0.05 = subtle, 0.1 = bold
  mrzFontWeight?: string | number;  // 'normal' | 'medium' | 'bold' | 'extrabold' | 400 | 600 | 700 | 900
  mrzColor?: string; // Hex/rgb color e.g. '#222222' (slightly lighter than pure black)
  mrzOpacity?: number; // 0.50 to 1.00 (default 0.92 for slightly softer print)
  mrz2BgdScale?: number; // Scale for BGD / Nationality in MRZ Line 2 (default 0.82 = 82% smaller)
  mrzLine1XOffset?: number;
  mrzLine1YOffset?: number;
  mrzLine2XOffset?: number;
  mrzLine2YOffset?: number;

  // 6. Individual Line Fonts & Print Styles
  lineStyles?: LineStylesConfig;
}

const PAD_IMAGE_KEY = 'bitik_custom_pad_image_v1';
const PAD_SETTINGS_KEY = 'bitik_pad_settings_v1';

export interface PadSettings {
  showPadBackground: boolean;
  documentMode: 'pad' | 'full';
  calibration: PadCalibration;
}

export const defaultCalibration: PadCalibration = {
  offsetX: 0,
  offsetY: 0,
  scale: 1,
  fontSizeOffset: 0,
  rightColumnOffset: 0,
  nameXOffset: 0,
  nameYOffset: 0,
  nameLineSpacing: 0,
  nameArabicYOffset: 0,
  nameEnglishYOffset: 0,
  visaNumberXOffset: 0,
  visaNumberYOffset: 0,
  issueDateXOffset: 0,
  issueDateYOffset: 0,
  referenceNumberXOffset: 0,
  referenceNumberYOffset: 0,
  birthDateXOffset: 0,
  birthDateYOffset: 0,
  expiryDateXOffset: 0,
  expiryDateYOffset: 0,
  passportNoXOffset: 0,
  passportNoYOffset: 0,
  passportIssueDateXOffset: 0,
  passportIssueDateYOffset: 0,
  passportExpiryDateXOffset: 0,
  passportExpiryDateYOffset: 0,
  passportCenterXOffset: 0,
  mrzXOffset: 0,
  mrzYOffset: 0,
  mrzFontSizeOffset: 0,
  mrzChevronScaleY: 0.75, // Flatter squashed chevrons matching official eVisa photo by default
  mrzChevronScaleX: 1.0,
  mrzStrokeWidth: 0.22,
  mrzFontWeight: 'bold',
  mrzColor: '#222222', // Slightly lighter authentic color (not harsh black)
  mrzOpacity: 0.92,   // 92% slightly lighter tone
  mrz2BgdScale: 0.82, // BGD in Line 2 is slightly smaller matching original Kuwait visa
  lineStyles: {},
};

export const defaultPadSettings: PadSettings = {
  showPadBackground: true,
  documentMode: 'pad', // Default to Pad Overlay mode as requested by user
  calibration: defaultCalibration,
};

export const AVAILABLE_FONTS = [
  { id: 'Myanmar Text', label: 'Myanmar Text (অফিসিয়াল কুয়েত ফন্ট)' },
  { id: 'Orator Std', label: 'Orator Std (অফিসিয়াল MRZ ফন্ট)' },
  { id: 'Cairo', label: 'Cairo (আরবি ও ইংরেজি বোল্ড)' },
  { id: 'Amiri', label: 'Amiri (ঐতিহ্যবাহী নসখ আরবি ফন্ট)' },
  { id: 'Alexandria', label: 'Alexandria (মডার্ন ক্লিয়ার আরবি)' },
  { id: 'Noto Sans Arabic', label: 'Noto Sans Arabic' },
  { id: 'Share Tech Mono', label: 'Share Tech Mono (মনোস্পেস)' },
  { id: 'Segoe UI', label: 'Segoe UI' },
  { id: 'Arial', label: 'Arial' },
  { id: 'Times New Roman', label: 'Times New Roman' },
  { id: 'Courier New', label: 'Courier New' },
];

export interface LineFieldDefinition {
  key: LineKey;
  labelBn: string;
  labelEn: string;
  arabicField?: boolean;
  defaultFontSize: number;
  defaultFontFamily: string;
  defaultFontWeight: string;
  category: 'primary' | 'passport' | 'name' | 'details' | 'mrz';
}

export const LINE_DEFINITIONS: LineFieldDefinition[] = [
  {
    key: 'visaNumber',
    labelBn: 'ভিসা নম্বর (Visa Number - ৩৫...)',
    labelEn: 'Visa Number',
    defaultFontSize: 16,
    defaultFontFamily: 'Myanmar Text',
    defaultFontWeight: 'bold',
    category: 'primary',
  },
  {
    key: 'referenceNumber',
    labelBn: 'রেফারেন্স নম্বর (Reference No. - ৩৭...)',
    labelEn: 'Reference Number',
    defaultFontSize: 15.5,
    defaultFontFamily: 'Myanmar Text',
    defaultFontWeight: 'bold',
    category: 'primary',
  },
  {
    key: 'issueDate',
    labelBn: 'ইস্যু তারিখ (Issue Date)',
    labelEn: 'Issue Date',
    defaultFontSize: 14,
    defaultFontFamily: 'Myanmar Text',
    defaultFontWeight: 'bold',
    category: 'primary',
  },
  {
    key: 'expiryDate',
    labelBn: 'মেয়াদ শেষ তারিখ (Expiry Date - ৪ মাস)',
    labelEn: 'Expiry Date',
    defaultFontSize: 14,
    defaultFontFamily: 'Myanmar Text',
    defaultFontWeight: 'bold',
    category: 'primary',
  },
  {
    key: 'passportNumber',
    labelBn: 'পাসপোর্ট নম্বর (Passport Number)',
    labelEn: 'Passport Number',
    defaultFontSize: 14.5,
    defaultFontFamily: 'Myanmar Text',
    defaultFontWeight: 'bold',
    category: 'passport',
  },
  {
    key: 'passportIssueDate',
    labelBn: 'পাসপোর্ট ইস্যু তারিখ (Passport Issue Date)',
    labelEn: 'Passport Issue Date',
    defaultFontSize: 12,
    defaultFontFamily: 'Myanmar Text',
    defaultFontWeight: 'bold',
    category: 'passport',
  },
  {
    key: 'passportExpiryDate',
    labelBn: 'পাসপোর্ট মেয়াদ শেষ তারিখ (Passport Expiry Date)',
    labelEn: 'Passport Expiry Date',
    defaultFontSize: 12,
    defaultFontFamily: 'Myanmar Text',
    defaultFontWeight: 'bold',
    category: 'passport',
  },
  {
    key: 'nameArabic',
    labelBn: 'আবেদনকারীর আরবি নাম (Arabic Full Name)',
    labelEn: 'Arabic Name',
    arabicField: true,
    defaultFontSize: 17.5,
    defaultFontFamily: 'Myanmar Text',
    defaultFontWeight: 'bold',
    category: 'name',
  },
  {
    key: 'nameEnglish',
    labelBn: 'আবেদনকারীর ইংরেজি নাম (English Full Name)',
    labelEn: 'English Name',
    defaultFontSize: 13.5,
    defaultFontFamily: 'Myanmar Text',
    defaultFontWeight: 'bold',
    category: 'name',
  },
  {
    key: 'birthDate',
    labelBn: 'জন্ম তারিখ (Birth Date)',
    labelEn: 'Birth Date',
    defaultFontSize: 14,
    defaultFontFamily: 'Myanmar Text',
    defaultFontWeight: 'bold',
    category: 'name',
  },
  {
    key: 'nationality',
    labelBn: 'জাতীয়তা (Nationality - BANGLADESH)',
    labelEn: 'Nationality',
    defaultFontSize: 13,
    defaultFontFamily: 'Myanmar Text',
    defaultFontWeight: 'bold',
    category: 'details',
  },
  {
    key: 'occupation',
    labelBn: 'পেশা (Occupation)',
    labelEn: 'Occupation',
    defaultFontSize: 13,
    defaultFontFamily: 'Myanmar Text',
    defaultFontWeight: 'bold',
    category: 'details',
  },
  {
    key: 'visaType',
    labelBn: 'ভিসার ধরন (Visa Type)',
    labelEn: 'Visa Type',
    defaultFontSize: 12.5,
    defaultFontFamily: 'Myanmar Text',
    defaultFontWeight: 'bold',
    category: 'details',
  },
  {
    key: 'sponsorDetails',
    labelBn: 'কফিলের তথ্য (Sponsor Details)',
    labelEn: 'Sponsor Details',
    arabicField: true,
    defaultFontSize: 13.5,
    defaultFontFamily: 'Myanmar Text',
    defaultFontWeight: 'bold',
    category: 'details',
  },
  {
    key: 'mrzLine1',
    labelBn: 'MRZ লাইন ১ (ICAO নাম কোড)',
    labelEn: 'MRZ Line 1',
    defaultFontSize: 16.5,
    defaultFontFamily: 'Orator Std',
    defaultFontWeight: 'bold',
    category: 'mrz',
  },
  {
    key: 'mrzLine2',
    labelBn: 'MRZ লাইন ২ (ICAO ভিসা ও চেক ডিজিট কোড)',
    labelEn: 'MRZ Line 2',
    defaultFontSize: 16.5,
    defaultFontFamily: 'Orator Std',
    defaultFontWeight: 'bold',
    category: 'mrz',
  },
];

export function getSavedPadImage(): string | null {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return null;
    return localStorage.getItem(PAD_IMAGE_KEY);
  } catch (err) {
    return null;
  }
}

export function savePadImage(dataUrl: string): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.setItem(PAD_IMAGE_KEY, dataUrl);
  } catch (err) {
    console.error('Failed to save pad image:', err);
  }
}

export function removePadImage(): void {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return;
    localStorage.removeItem(PAD_IMAGE_KEY);
  } catch (err) {
    console.error('Failed to remove pad image:', err);
  }
}

export function getSavedPadSettings(): PadSettings {
  try {
    if (typeof window === 'undefined' || !window.localStorage) return defaultPadSettings;
    const raw = localStorage.getItem(PAD_SETTINGS_KEY);
    if (!raw) return defaultPadSettings;
    const parsed = JSON.parse(raw);
    const parsedCal = parsed.calibration || {};
    const effectiveStroke =
      parsedCal.mrzStrokeWidth !== undefined && parsedCal.mrzStrokeWidth > 0 && parsedCal.mrzStrokeWidth !== 0.07
        ? parsedCal.mrzStrokeWidth
        : defaultCalibration.mrzStrokeWidth;
    const effectiveFontWeight =
      parsedCal.mrzFontWeight && parsedCal.mrzFontWeight !== 'normal'
        ? parsedCal.mrzFontWeight
        : defaultCalibration.mrzFontWeight;

    return {
      ...defaultPadSettings,
      ...parsed,
      calibration: {
        ...defaultCalibration,
        ...parsedCal,
        mrzStrokeWidth: effectiveStroke,
        mrzFontWeight: effectiveFontWeight,
        mrzColor: parsedCal.mrzColor || defaultCalibration.mrzColor,
        mrzOpacity: typeof parsedCal.mrzOpacity === 'number' ? parsedCal.mrzOpacity : defaultCalibration.mrzOpacity,
        lineStyles: {
          ...(defaultCalibration.lineStyles || {}),
          ...(parsedCal.lineStyles || {}),
        },
      },
    };
  } catch (err) {
    console.error('Failed to get pad settings:', err);
    return defaultPadSettings;
  }
}

export function savePadSettings(settings: Partial<PadSettings>): void {
  try {
    const current = getSavedPadSettings();
    const updated = {
      ...current,
      ...settings,
      calibration: {
        ...current.calibration,
        ...(settings.calibration || {}),
        lineStyles: {
          ...(current.calibration.lineStyles || {}),
          ...(settings.calibration?.lineStyles || {}),
        },
      },
    };
    localStorage.setItem(PAD_SETTINGS_KEY, JSON.stringify(updated));
  } catch (err) {
    console.error('Failed to save pad settings:', err);
  }
}

export function getLineStyle(
  key: LineKey,
  calibration?: PadCalibration,
  fallbackFamily?: string
): {
  fontSize: string;
  fontFamily: string;
  fontWeight: string | number;
  letterSpacing?: string;
  display?: string;
  color?: string;
} {
  const lineDef = LINE_DEFINITIONS.find((d) => d.key === key);
  const custom = calibration?.lineStyles?.[key];
  const globalFontDiff = calibration?.fontSizeOffset || 0;

  const baseSize = lineDef ? lineDef.defaultFontSize : 14;
  const size = custom?.fontSize !== undefined ? custom.fontSize : baseSize + globalFontDiff;
  const family = custom?.fontFamily || (lineDef ? lineDef.defaultFontFamily : (fallbackFamily || 'Myanmar Text'));
  const weight = custom?.fontWeight || (lineDef ? lineDef.defaultFontWeight : 'bold');
  const letterSpacing = custom?.letterSpacing || (key === 'mrzLine1' || key === 'mrzLine2' ? '0.11em' : undefined);
  const isVisible = custom?.visible !== false;

  return {
    fontSize: `${size}px`,
    fontFamily: `"${family}", "MyanmarText", "Cairo", sans-serif`,
    fontWeight: weight === 'normal' ? 400 : weight === 'extrabold' || weight === '900' ? 900 : 700,
    letterSpacing,
    display: isVisible ? undefined : 'none',
    color: custom?.color,
  };
}

export function getLineOffsets(
  key: LineKey,
  calibration?: PadCalibration
): { x: number; y: number } {
  if (!calibration) return { x: 0, y: 0 };
  const custom = calibration.lineStyles?.[key];
  const customX = custom?.xOffset || 0;
  const customY = custom?.yOffset || 0;

  let directX = 0;
  let directY = 0;

  switch (key) {
    case 'visaNumber':
      directX = calibration.visaNumberXOffset || 0;
      directY = calibration.visaNumberYOffset || 0;
      break;
    case 'issueDate':
      directX = calibration.issueDateXOffset || 0;
      directY = calibration.issueDateYOffset || 0;
      break;
    case 'referenceNumber':
      directX = calibration.referenceNumberXOffset || 0;
      directY = calibration.referenceNumberYOffset || 0;
      break;
    case 'birthDate':
      directX = calibration.birthDateXOffset || 0;
      directY = calibration.birthDateYOffset || 0;
      break;
    case 'expiryDate':
      directX = calibration.expiryDateXOffset || 0;
      directY = calibration.expiryDateYOffset || 0;
      break;
    case 'passportNumber':
      directX = calibration.passportNoXOffset || 0;
      directY = calibration.passportNoYOffset || 0;
      break;
    case 'passportIssueDate':
      directX = calibration.passportIssueDateXOffset || 0;
      directY = calibration.passportIssueDateYOffset || 0;
      break;
    case 'passportExpiryDate':
      directX = calibration.passportExpiryDateXOffset || 0;
      directY = calibration.passportExpiryDateYOffset || 0;
      break;
    case 'nameArabic':
      directY = (calibration.nameArabicYOffset || 0);
      break;
    case 'nameEnglish':
      directY = (calibration.nameEnglishYOffset || 0);
      break;
    case 'mrzLine1':
      directX = calibration.mrzLine1XOffset || 0;
      directY = calibration.mrzLine1YOffset || 0;
      break;
    case 'mrzLine2':
      directX = calibration.mrzLine2XOffset || 0;
      directY = calibration.mrzLine2YOffset || 0;
      break;
  }

  return {
    x: directX + customX,
    y: directY + customY,
  };
}
