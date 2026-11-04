export type { NumberGenerationRules } from './utils/numberGenerator';

export interface PassportData {
  fullNameEnglish: string;
  fullNameArabic: string;
  givenName?: string;
  surname?: string;
  fatherName?: string;
  motherName?: string;
  passportNumber: string;
  dateOfBirth: string; // YYYY-MM-DD
  sex: 'M' | 'F' | string;
  sexArabic?: string;
  nationalityEnglish: string;
  nationalityArabic: string;
  passportIssueDate: string; // YYYY-MM-DD
  passportExpiryDate: string; // YYYY-MM-DD
  passportType: string;
  placeOfBirth?: string;
  personalNumber?: string;
}

export interface LineFontConfig {
  fontSize?: number; // custom font size in px
  fontFamily?: string; // custom font family
  fontWeight?: string; // 'bold', 'normal', '700', '800', '900'
  letterSpacing?: string; // e.g. '0.08em', 'normal', '1px'
  visible?: boolean; // whether to print/show this line
  color?: string; // custom text color
  yOffset?: number; // individual Y offset (up / down in px)
  xOffset?: number; // individual X offset (left / right in px)
}

export type LineKey =
  | 'visaNumber'
  | 'referenceNumber'
  | 'issueDate'
  | 'expiryDate'
  | 'passportNumber'
  | 'passportIssueDate'
  | 'passportExpiryDate'
  | 'nameArabic'
  | 'nameEnglish'
  | 'birthDate'
  | 'nationality'
  | 'occupation'
  | 'visaType'
  | 'sponsorDetails'
  | 'mrzLine1'
  | 'mrzLine2';

export type LineStylesConfig = Partial<Record<LineKey, LineFontConfig>>;

export interface KuwaitEVisaData {
  visaNumber: string; // starts with 35 + 7 random digits
  referenceNumber: string; // starts with 37 + 7 random digits
  issueDate: string; // YYYY-MM-DD
  expiryDate: string; // YYYY-MM-DD (auto 4 months from issueDate)
  autoCalculateExpiry: boolean;
  visaTypeEnglish: string;
  visaTypeArabic: string;
  nationalityEnglish: string;
  nationalityArabic: string;
  passportNumber: string;
  passportTypeArabic: string;
  passportTypeEnglish?: string;
  birthPlace?: string;
  passportIssueDate: string;
  passportExpiryDate: string;
  sexEnglish: string; // 'M' or 'F'
  sexArabic: string; // 'ذكر' or 'أنثى'
  occupationEnglish: string;
  occupationArabic: string;
  nameArabic: string;
  nameEnglish: string;
  givenName?: string;
  surname?: string;
  fatherName?: string;
  motherName?: string;
  birthDate: string; // YYYY-MM-DD
  sponsorDetails: string;
  issuingAuthorityArabic: string;
  editionText: string;
  fontFamily: string; // 'Myanmar Text' default
  // Name lines spacing (Arabic & English name gap)
  nameLineSpacing?: number;
  // Line-by-Line Custom Font/Print Styles
  lineStyles?: LineStylesConfig;
  // Custom MRZ Override (Optional)
  customMrzLine1?: string;
  customMrzLine2?: string;
}

export interface ExtractionState {
  isExtracting: boolean;
  progressMessage: string;
  error: string | null;
  uploadedFileName: string | null;
  uploadedImagePreview: string | null;
}
