// Client-side Direct OCR and MRZ Parser (Programmatic fallback)
import { createWorker } from 'tesseract.js';
import { parse } from 'mrz';
import { PassportData } from '../types';

// Arabic transliteration map for common Bangladeshi names
const ARABIC_NAME_MAP: Record<string, string> = {
  MD: 'محمد',
  MOHAMMED: 'محمد',
  MUHAMMAD: 'محمد',
  MOHAMMAD: 'محمد',
  AHMED: 'أحمد',
  AHMAD: 'أحمد',
  ALI: 'علي',
  HOSSAIN: 'حسين',
  HUSSAIN: 'حسين',
  HOSEN: 'حسين',
  HASAN: 'حسن',
  HASSAN: 'حسن',
  ISLAM: 'الإسلام',
  ALAM: 'عالم',
  KHAN: 'خان',
  MIAH: 'ميا',
  MIA: 'ميا',
  BEGUM: 'بيجوم',
  KHATUN: 'خاتون',
  AKTER: 'أختر',
  SHAH: 'شاه',
  RAHMAN: 'الرحمن',
  ABDUL: 'عبد',
  ABDULLAH: 'عبد الله',
  ABU: 'أبو',
  AL: 'ال',
  AMIN: 'أمين',
  ALAMIN: 'الأمين',
  SIFAJUL: 'سيفاجول',
  RAJEK: 'راجيك',
  SHAMSUD: 'شمسود',
  JAHIRUOL: 'جهير',
  GAFFAR: 'الغفار',
  KABIR: 'كبير',
  SHARIF: 'شريف',
  RASHID: 'رشيد',
  SHEIKH: 'شيخ',
  CHOWDHURY: 'চৌধুরী',
  BABU: 'بابو',
  RANA: 'رنا',
  SOHEL: 'سهيل',
  SAIFUL: 'سيف',
  KAMAL: 'كمال',
  JAMAL: 'جمال',
  FARUK: 'فاروق',
  RUBEL: 'روبيل',
  KHALED: 'خالد',
  MAHMUD: 'محمود',
  TARIQ: 'طارق',
};

// Transliterate English Name to Arabic programmatically
export function transliterateToArabic(englishName: string): string {
  if (!englishName) return '';
  const words = englishName.toUpperCase().replace(/[^A-Z\s]/g, ' ').split(/\s+/).filter(Boolean);
  const arabicWords = words.map(word => {
    if (ARABIC_NAME_MAP[word]) {
      return ARABIC_NAME_MAP[word];
    }
    return word
      .replace(/SH/g, 'ش')
      .replace(/CH/g, 'تش')
      .replace(/TH/g, 'ث')
      .replace(/KH/g, 'خ')
      .replace(/GH/g, 'غ')
      .replace(/PH/g, 'ف')
      .replace(/A/g, 'ا')
      .replace(/B/g, 'ب')
      .replace(/C/g, 'ك')
      .replace(/D/g, 'د')
      .replace(/E/g, 'ي')
      .replace(/F/g, 'ف')
      .replace(/G/g, 'ج')
      .replace(/H/g, 'ه')
      .replace(/I/g, 'ي')
      .replace(/J/g, 'ج')
      .replace(/K/g, 'ك')
      .replace(/L/g, 'ل')
      .replace(/M/g, 'م')
      .replace(/N/g, 'ن')
      .replace(/O/g, 'و')
      .replace(/P/g, 'ب')
      .replace(/Q/g, 'ق')
      .replace(/R/g, 'ر')
      .replace(/S/g, 'س')
      .replace(/T/g, 'ت')
      .replace(/U/g, 'و')
      .replace(/V/g, 'ف')
      .replace(/W/g, 'و')
      .replace(/X/g, 'كس')
      .replace(/Y/g, 'ي')
      .replace(/Z/g, 'ز');
  });
  return arabicWords.join(' ');
}

// Convert YYMMDD to YYYY-MM-DD
function parseYYMMDD(yymmdd: string, defaultCentury: '19' | '20' = '20'): string {
  if (!yymmdd || yymmdd.length !== 6) return '';
  const yy = parseInt(yymmdd.substring(0, 2), 10);
  const mm = yymmdd.substring(2, 4);
  const dd = yymmdd.substring(4, 6);
  const century = yy > 45 ? '19' : '20';
  return `${century}${yymmdd.substring(0, 2)}-${mm}-${dd}`;
}

export async function extractPassportProgrammatically(
  imageSource: string | File,
  onProgress?: (status: string) => void
): Promise<PassportData> {
  let text = '';
  try {
    if (onProgress) onProgress('টেসার্যাক্ট ইঞ্জিন চালু হচ্ছে...');
    const worker = await createWorker('eng');
    if (onProgress) onProgress('পাসপোর্ট টেক্সট এবং MRZ স্ক্যান করা হচ্ছে...');
    const ret = await worker.recognize(imageSource);
    await worker.terminate();
    text = ret.data.text || '';
  } catch (workerErr: any) {
    console.warn('Local OCR worker could not load or process:', workerErr?.message || workerErr);
    throw new Error('পাসপোর্ট স্বয়ংক্রিয়ভাবে পড়তে সমস্যা হয়েছে। অনুগ্রহ করে ডেমো ডেটা লোড করুন অথবা ম্যানুয়ালি তথ্য দিন।');
  }

  const lines = text.split('\n').map(l => l.trim()).filter(Boolean);

  // 1. Search for MRZ lines
  const mrzCandidateLines = lines
    .map(l => l.replace(/[^A-Z0-9<]/gi, '').toUpperCase())
    .filter(l => l.length >= 35);

  let parsedMrz: any = null;
  for (let i = 0; i < mrzCandidateLines.length; i++) {
    const l1 = mrzCandidateLines[i];
    const l2 = mrzCandidateLines[i + 1];
    if (l1 && l2 && (l1.startsWith('P') || l1.includes('<<'))) {
      try {
        const clean1 = l1.slice(0, 44).padEnd(44, '<');
        const clean2 = l2.slice(0, 44).padEnd(44, '<');
        const result = parse([clean1, clean2]);
        if (result && result.fields) {
          parsedMrz = result.fields;
          break;
        }
      } catch {
        // continue
      }
    }
  }

  // Regex searches
  const passportNoMatch = text.match(/\b([A-Z][0-9]{7,8})\b/i);
  const sexMatch = text.match(/(?:Sex|Gender)[^A-Z]*(M|F)\b/i);

  // Look for Father's name if present on Bangladeshi passport page 2 or text
  const fatherMatch = text.match(/(?:Father's Name|Father)[^A-Za-z]*([A-Z\s]{3,35})/i);
  const fatherName = (fatherMatch?.[1] || '').trim();

  let fullNameEnglish = '';
  let passportNumber = '';
  let dateOfBirth = '';
  let sex: 'M' | 'F' = 'M';
  let nationalityEnglish = 'BANGLADESH';
  let expiryDate = '';

  if (parsedMrz) {
    const given = (parsedMrz.firstNames || '').trim();
    const surname = (parsedMrz.lastName || '').trim();
    fullNameEnglish = [given, surname].filter(Boolean).join(' ');
    passportNumber = parsedMrz.documentNumber?.replace(/</g, '') || '';
    if (parsedMrz.birthDate) {
      dateOfBirth = parseYYMMDD(parsedMrz.birthDate, '19');
    }
    if (parsedMrz.sex) {
      sex = parsedMrz.sex === 'female' || parsedMrz.sex === 'F' ? 'F' : 'M';
    }
    if (parsedMrz.nationality === 'BGD') {
      nationalityEnglish = 'BANGLADESH';
    }
    if (parsedMrz.expirationDate) {
      expiryDate = parseYYMMDD(parsedMrz.expirationDate, '20');
    }
  } else {
    if (passportNoMatch) passportNumber = passportNoMatch[1].toUpperCase();
    if (sexMatch) sex = sexMatch[1].toUpperCase() === 'F' ? 'F' : 'M';
  }

  // If passport has father's name, combine it for official visa name
  if (fatherName && !fullNameEnglish.includes(fatherName)) {
    fullNameEnglish = `${fullNameEnglish} ${fatherName}`.trim();
  }

  if (!passportNumber && passportNoMatch) {
    passportNumber = passportNoMatch[1].toUpperCase();
  }

  const fullNameArabic = transliterateToArabic(fullNameEnglish);

  return {
    fullNameEnglish: fullNameEnglish || 'MD APPLICANT',
    fullNameArabic: fullNameArabic || 'محمد',
    fatherName: fatherName || '',
    passportNumber: passportNumber || 'A00000000',
    dateOfBirth: dateOfBirth || '1995-01-01',
    sex,
    nationalityEnglish,
    nationalityArabic: 'بنغلاديش',
    passportExpiryDate: expiryDate || '',
    passportIssueDate: '',
    passportType: 'عادي',
  };
}
