import React, { useState, useEffect } from 'react';
import {
  RotateCcw,
  Hash,
  User,
  Building,
  Type as TypeIcon,
  Copy,
  Check,
  Sliders,
  Settings2,
  Save,
  RotateCw,
  CheckCircle2,
  Info,
  X,
  ChevronDown,
  ChevronUp,
  Maximize2,
  Sparkles,
} from 'lucide-react';
import { KuwaitEVisaData } from '../types';
import {
  generateVisaNumber,
  generateReferenceNumber,
  calculate4MonthsExpiry,
  getTodayDateString,
  NumberGenerationRules,
  getNumberRules,
  saveNumberRules,
  resetNumberRules,
  DEFAULT_NUMBER_RULES,
} from '../utils/numberGenerator';
import { formatToYYYYMMDD } from '../utils/dateFormatter';
import {
  generateKuwaitMrz,
  formatMrzLine1Name,
  toYYMMDD,
  updateMrzLine2IssueDate,
  parseKuwaitMrzLine2,
} from '../utils/mrzGenerator';
import { MrzLine } from './MrzRenderer';
import { LineFontManager } from './LineFontManager';
import { PadCalibration, savePadSettings } from '../services/padService';
import { transliterateToArabic } from '../services/programmaticPassportExtractor';

interface EditorFormProps {
  data: KuwaitEVisaData;
  onChange: (updated: Partial<KuwaitEVisaData>) => void;
  onGenerateNewNumbers?: () => void;
  calibration?: PadCalibration;
  onCalibrationChange?: (cal: PadCalibration) => void;
  onOpenLineFontsModal?: () => void;
}

export const VisaEditorForm: React.FC<EditorFormProps> = ({
  data,
  onChange,
  onGenerateNewNumbers,
  calibration,
  onCalibrationChange,
  onOpenLineFontsModal,
}) => {
  const [copiedKey, setCopiedKey] = useState<string | null>(null);
  const [showLineFontManager, setShowLineFontManager] = useState<boolean>(false);

  // Quick Copy Helper
  const handleCopy = (key: string, value: string) => {
    if (!value) return;
    navigator.clipboard.writeText(value);
    setCopiedKey(key);
    setTimeout(() => {
      setCopiedKey(null);
    }, 2000);
  };

  // Auto-compose full English name from Given Name + Surname + Father's Name
  const handleComposeFullName = (overrideGiven?: string, overrideSurname?: string, overrideFather?: string) => {
    const g = (overrideGiven !== undefined ? overrideGiven : (data.givenName || '')).trim().toUpperCase();
    const s = (overrideSurname !== undefined ? overrideSurname : (data.surname || '')).trim().toUpperCase();
    const f = (overrideFather !== undefined ? overrideFather : (data.fatherName || '')).trim().toUpperCase();
    
    const parts = [g, s, f].filter(Boolean);
    const combined = parts.join(' ').replace(/\s+/g, ' ').trim();
    const updates: Partial<KuwaitEVisaData> = {};
    if (combined) {
      updates.nameEnglish = combined;
    }
    if (overrideGiven !== undefined) updates.givenName = g;
    if (overrideSurname !== undefined) updates.surname = s;
    if (overrideFather !== undefined) updates.fatherName = f;
    onChange(updates);
  };

  const handleAutoTranslateArabic = () => {
    if (!data.nameEnglish) return;
    const arabic = transliterateToArabic(data.nameEnglish);
    if (arabic) {
      onChange({ nameArabic: arabic });
    }
  };

  // Name lines spacing helper (inter-line gap between Arabic & English name)
  const currentLineSpacing =
    calibration?.nameLineSpacing !== undefined
      ? calibration.nameLineSpacing
      : data.nameLineSpacing ?? 0;

  const handleUpdateNameSpacing = (newSpacing: number) => {
    const clamped = Math.max(-25, Math.min(50, newSpacing));
    onChange({ nameLineSpacing: clamped });
    if (calibration && onCalibrationChange) {
      const nextCal = {
        ...calibration,
        nameLineSpacing: clamped,
      };
      onCalibrationChange(nextCal);
      savePadSettings({ calibration: nextCal });
    }
  };

  // MRZ Calibration controls (Stroke, Weight, Chevron Scale Y & X, Color & Opacity)
  const currentMrzStroke = calibration?.mrzStrokeWidth !== undefined ? calibration.mrzStrokeWidth : 0.22;
  const currentMrzWeight = calibration?.mrzFontWeight || 'bold';
  const currentChevronScaleY = calibration?.mrzChevronScaleY !== undefined ? calibration.mrzChevronScaleY : 0.75;
  const currentChevronScaleX = calibration?.mrzChevronScaleX !== undefined ? calibration.mrzChevronScaleX : 1.0;
  const currentMrzColor = calibration?.mrzColor || '#222222';
  const currentMrzOpacity = calibration?.mrzOpacity !== undefined ? calibration.mrzOpacity : 0.92;
  const currentMrz2BgdScale = calibration?.mrz2BgdScale !== undefined ? calibration.mrz2BgdScale : 0.82;

  const handleUpdateMrzCal = (patch: Partial<PadCalibration>) => {
    if (calibration && onCalibrationChange) {
      const nextCal = {
        ...calibration,
        ...patch,
      };
      onCalibrationChange(nextCal);
      savePadSettings({ calibration: nextCal });
    }
  };

  // Handle Issue Date Change -> Auto calculate 4-month Expiry Date & Sync MRZ Line 2
  const handleIssueDateChange = (newIssueDate: string) => {
    const formatted = formatToYYYYMMDD(newIssueDate);
    const updates: Partial<KuwaitEVisaData> = { issueDate: formatted };
    if (data.autoCalculateExpiry && formatted) {
      updates.expiryDate = calculate4MonthsExpiry(formatted);
    }
    // Dynamically update MRZ Line 2 issue date if customMrzLine2 is active
    if (data.customMrzLine2) {
      updates.customMrzLine2 = updateMrzLine2IssueDate(data.customMrzLine2, formatted);
    }
    onChange(updates);
  };

  // Number Rules state
  const [numberRules, setNumberRules] = useState<NumberGenerationRules>(() => getNumberRules());
  const [isNumberRulesOpen, setIsNumberRulesOpen] = useState<boolean>(false);
  const [draftVisaPrefix, setDraftVisaPrefix] = useState<string>(numberRules.visaPrefix);
  const [draftVisaDigits, setDraftVisaDigits] = useState<number>(numberRules.visaDigitCount);
  const [draftRefPrefix, setDraftRefPrefix] = useState<string>(numberRules.refPrefix);
  const [draftRefDigits, setDraftRefDigits] = useState<number>(numberRules.refDigitCount);
  const [draftEnforceRules, setDraftEnforceRules] = useState<boolean>(numberRules.enforceRules);
  const [rulesSuccessMsg, setRulesSuccessMsg] = useState<string | null>(null);

  useEffect(() => {
    const handleRulesUpdated = (e: any) => {
      if (e.detail) {
        setNumberRules(e.detail);
        setDraftVisaPrefix(e.detail.visaPrefix);
        setDraftVisaDigits(e.detail.visaDigitCount);
        setDraftRefPrefix(e.detail.refPrefix);
        setDraftRefDigits(e.detail.refDigitCount);
        setDraftEnforceRules(e.detail.enforceRules);
      }
    };
    window.addEventListener('number-rules-updated', handleRulesUpdated);
    return () => window.removeEventListener('number-rules-updated', handleRulesUpdated);
  }, []);

  const handleSaveRules = (applyNow: boolean = false) => {
    const cleanVisaPrefix = draftVisaPrefix.trim() || '35';
    const cleanRefPrefix = draftRefPrefix.trim() || '37';
    const cleanVisaDigits = Math.max(1, Math.min(12, Number(draftVisaDigits) || 7));
    const cleanRefDigits = Math.max(1, Math.min(12, Number(draftRefDigits) || 7));

    const updated = saveNumberRules({
      visaPrefix: cleanVisaPrefix,
      visaDigitCount: cleanVisaDigits,
      refPrefix: cleanRefPrefix,
      refDigitCount: cleanRefDigits,
      enforceRules: draftEnforceRules,
    });

    setNumberRules(updated);

    if (applyNow) {
      const newVisa = generateVisaNumber(updated);
      const newRef = generateReferenceNumber(updated);
      onChange({
        visaNumber: newVisa,
        referenceNumber: newRef,
      });
      setRulesSuccessMsg(`নিয়ম সংরক্ষিত এবং নতুন নম্বর সেট করা হয়েছে! (${newVisa} / ${newRef})`);
    } else {
      setRulesSuccessMsg('নম্বর জেনারেশন নিয়ম সফলভাবে সংরক্ষিত হয়েছে!');
    }

    setTimeout(() => {
      setRulesSuccessMsg(null);
    }, 3000);
  };

  const handleResetRules = () => {
    const reset = resetNumberRules();
    setNumberRules(reset);
    setDraftVisaPrefix(reset.visaPrefix);
    setDraftVisaDigits(reset.visaDigitCount);
    setDraftRefPrefix(reset.refPrefix);
    setDraftRefDigits(reset.refDigitCount);
    setDraftEnforceRules(reset.enforceRules);
    setRulesSuccessMsg('ডিফল্ট নিয়ম (35 & 37) এ রিসেট করা হয়েছে!');
    setTimeout(() => setRulesSuccessMsg(null), 2500);
  };

  // Re-generate Visa Number
  const handleRegenerateVisaNo = () => {
    onChange({ visaNumber: generateVisaNumber(numberRules) });
  };

  // Re-generate Reference Number
  const handleRegenerateRefNo = () => {
    onChange({ referenceNumber: generateReferenceNumber(numberRules) });
  };

  // Quick Presets for Sponsor
  const sponsorPresets = [
    'شركة الأمل للتجارة العامة - 101962231 - الكويت العاصمة',
    'مؤسسة النور للمقاولات - 108453912 - حولي',
    'شركة الخليج للخدمات - 105642871 - الفروانية',
    'مستشفى السلام الدولي - 109283741 - بنيد القار',
  ];

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 space-y-6">
      {/* SECTION 1: AUTO-GENERATED NUMBERS & DATES */}
      <div>
        <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Hash className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Visa & Reference Numbers ({numberRules.visaPrefix} & {numberRules.refPrefix} Rules)
            </h3>
          </div>
          <button
            type="button"
            onClick={() => {
              setDraftVisaPrefix(numberRules.visaPrefix);
              setDraftVisaDigits(numberRules.visaDigitCount);
              setDraftRefPrefix(numberRules.refPrefix);
              setDraftRefDigits(numberRules.refDigitCount);
              setDraftEnforceRules(numberRules.enforceRules);
              setIsNumberRulesOpen(!isNumberRulesOpen);
            }}
            className={`inline-flex items-center gap-1.5 px-3 py-1 text-xs font-semibold rounded-full border transition-all cursor-pointer shadow-2xs ${
              isNumberRulesOpen
                ? 'bg-sky-700 text-white border-sky-700 ring-2 ring-sky-200'
                : 'bg-sky-50 hover:bg-sky-100 text-sky-800 border-sky-200'
            }`}
            title="ভিসা ও রেফারেন্স নম্বরের নিয়ম পরিবর্তন ও সেট করতে ক্লিক করুন"
          >
            <Settings2 className="w-3.5 h-3.5" />
            <span>{numberRules.enforceRules ? 'Auto Rules Active' : 'Custom Rules Active'}</span>
            <span className="font-mono bg-white/60 text-sky-950 px-1.5 py-0.5 rounded text-[10px] font-bold">
              {numberRules.visaPrefix} / {numberRules.refPrefix}
            </span>
            <span className="text-[10px] font-bold text-sky-600 ml-0.5 underline">
              {isNumberRulesOpen ? '✕ বন্ধ করুন' : '⚙️ সেট করুন'}
            </span>
          </button>
        </div>

        {/* EXPANDABLE NUMBER RULES CONFIGURATION PANEL */}
        {isNumberRulesOpen && (
          <div className="mb-4 bg-gradient-to-br from-sky-50/90 via-indigo-50/40 to-slate-50 border-2 border-sky-300 rounded-xl p-4 shadow-sm transition-all">
            <div className="flex items-start justify-between pb-3 border-b border-sky-100 mb-3">
              <div>
                <h4 className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <Sliders className="w-4 h-4 text-sky-600" />
                  <span>ভিসা ও রেফারেন্স নম্বর রুলস কনফিগারেশন (Configure Rules)</span>
                </h4>
                <p className="text-[11px] text-slate-600 mt-0.5">
                  ভিসা ও রেফারেন্স নম্বরের শুরুর প্রিফিক্স (ডিফল্ট ৩৫ ও ৩৭) এবং র‍্যান্ডম ডিজিট সংখ্যা নিজের মতো সেট করুন।
                </p>
              </div>
              <button
                type="button"
                onClick={() => setIsNumberRulesOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-md hover:bg-white/80 transition-colors"
                title="বন্ধ করুন"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Quick Presets */}
            <div className="mb-3.5">
              <label className="text-[11px] font-bold text-slate-700 block mb-1">
                কুইক প্রিসেট বাটন (Quick Presets):
              </label>
              <div className="flex flex-wrap gap-1.5">
                <button
                  type="button"
                  onClick={() => {
                    setDraftVisaPrefix('35');
                    setDraftVisaDigits(7);
                    setDraftRefPrefix('37');
                    setDraftRefDigits(7);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all cursor-pointer ${
                    draftVisaPrefix === '35' && draftRefPrefix === '37' && draftVisaDigits === 7 && draftRefDigits === 7
                      ? 'bg-sky-600 text-white border-sky-700 shadow-2xs font-semibold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  🇰🇼 কুয়েত স্ট্যান্ডার্ড (35 & 37 / 7 Digits)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftVisaPrefix('36');
                    setDraftVisaDigits(7);
                    setDraftRefPrefix('38');
                    setDraftRefDigits(7);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all cursor-pointer ${
                    draftVisaPrefix === '36' && draftRefPrefix === '38'
                      ? 'bg-sky-600 text-white border-sky-700 shadow-2xs font-semibold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  সিরিজ ৩৬ ও ৩৮ (36 & 38)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftVisaPrefix('34');
                    setDraftVisaDigits(7);
                    setDraftRefPrefix('36');
                    setDraftRefDigits(7);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all cursor-pointer ${
                    draftVisaPrefix === '34' && draftRefPrefix === '36'
                      ? 'bg-sky-600 text-white border-sky-700 shadow-2xs font-semibold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  সিরিজ ৩৪ ও ৩৬ (34 & 36)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setDraftVisaPrefix('25');
                    setDraftVisaDigits(7);
                    setDraftRefPrefix('27');
                    setDraftRefDigits(7);
                  }}
                  className={`px-2.5 py-1 text-[11px] font-medium rounded-md border transition-all cursor-pointer ${
                    draftVisaPrefix === '25' && draftRefPrefix === '27'
                      ? 'bg-sky-600 text-white border-sky-700 shadow-2xs font-semibold'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-50'
                  }`}
                >
                  সিরিজ ২৫ ও ২৭ (25 & 27)
                </button>
              </div>
            </div>

            {/* Inputs Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              {/* Visa Config */}
              <div className="bg-white/90 p-3 rounded-lg border border-sky-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-950 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-sky-500"></span>
                    ভিসা নম্বর রুলস (Visa Number Rules)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    মোট {draftVisaPrefix.length + Number(draftVisaDigits || 7)} ডিজিট
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                      শুরুর প্রিফিক্স (Prefix):
                    </label>
                    <input
                      type="text"
                      value={draftVisaPrefix}
                      onChange={(e) => setDraftVisaPrefix(e.target.value)}
                      placeholder="e.g. 35"
                      className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                      র‍্যান্ডম ডিজিট সংখ্যা:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={draftVisaDigits}
                      onChange={(e) => setDraftVisaDigits(Number(e.target.value))}
                      className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-slate-600 bg-sky-50/60 p-1.5 rounded border border-sky-100 flex items-center justify-between">
                  <span>লাইভ নমুনা:</span>
                  <span className="font-mono font-bold text-sky-900">
                    {draftVisaPrefix}{''.padEnd(Number(draftVisaDigits || 7), 'X')}
                  </span>
                </div>
              </div>

              {/* Reference Config */}
              <div className="bg-white/90 p-3 rounded-lg border border-sky-200 shadow-2xs space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-sky-950 flex items-center gap-1">
                    <span className="w-2 h-2 rounded-full bg-blue-500"></span>
                    রেফারেন্স নম্বর রুলস (Ref Number Rules)
                  </span>
                  <span className="text-[10px] text-slate-500 font-mono">
                    মোট {draftRefPrefix.length + Number(draftRefDigits || 7)} ডিজিট
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                      শুরুর প্রিফিক্স (Prefix):
                    </label>
                    <input
                      type="text"
                      value={draftRefPrefix}
                      onChange={(e) => setDraftRefPrefix(e.target.value)}
                      placeholder="e.g. 37"
                      className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                  <div>
                    <label className="text-[10px] font-semibold text-slate-600 block mb-0.5">
                      র‍্যান্ডম ডিজিট সংখ্যা:
                    </label>
                    <input
                      type="number"
                      min={1}
                      max={12}
                      value={draftRefDigits}
                      onChange={(e) => setDraftRefDigits(Number(e.target.value))}
                      className="w-full text-xs font-bold text-slate-900 bg-white border border-slate-300 rounded px-2 py-1 focus:ring-1 focus:ring-sky-500"
                    />
                  </div>
                </div>

                <div className="text-[10px] text-slate-600 bg-sky-50/60 p-1.5 rounded border border-sky-100 flex items-center justify-between">
                  <span>লাইভ নমুনা:</span>
                  <span className="font-mono font-bold text-sky-900">
                    {draftRefPrefix}{''.padEnd(Number(draftRefDigits || 7), 'X')}
                  </span>
                </div>
              </div>
            </div>

            {/* Success Notification */}
            {rulesSuccessMsg && (
              <div className="mb-3 p-2 bg-emerald-50 border border-emerald-300 rounded-md text-emerald-800 text-xs font-medium flex items-center gap-2 animate-in fade-in">
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0" />
                <span>{rulesSuccessMsg}</span>
              </div>
            )}

            {/* Actions Bar */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-2 border-t border-sky-100">
              <button
                type="button"
                onClick={handleResetRules}
                className="text-[11px] font-medium text-slate-600 hover:text-slate-800 hover:bg-slate-200/60 px-2 py-1 rounded transition-colors"
              >
                ডিফল্ট 35 & 37 এ রিসেট
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleSaveRules(false)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold text-slate-700 bg-white border border-slate-300 rounded-lg hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <Save className="w-3.5 h-3.5" />
                  <span>সংরক্ষণ করুন (Save Rules)</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleSaveRules(true)}
                  className="inline-flex items-center gap-1.5 px-3.5 py-1.5 text-xs font-bold text-white bg-sky-600 hover:bg-sky-700 rounded-lg transition-colors shadow-sm cursor-pointer"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>সংরক্ষণ ও নতুন নম্বর দিন (Save & Apply)</span>
                </button>
              </div>
            </div>
          </div>
        )}

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* Visa Number */}
          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Visa Number (رقم التأشيرة)</span>
                <span className="text-[10px] text-sky-700 font-mono font-normal">
                  ({numberRules.visaPrefix} + {numberRules.visaDigitCount} Digits)
                </span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCopy('visaNumber', data.visaNumber)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  title="Copy Visa Number"
                >
                  {copiedKey === 'visaNumber' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedKey === 'visaNumber' ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateVisaNo}
                  title={`Generate New Visa Number (${numberRules.visaPrefix} prefix)`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-sky-700 bg-white border border-sky-200 rounded hover:bg-sky-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Re-roll</span>
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="text"
                value={data.visaNumber}
                onChange={(e) => onChange({ visaNumber: e.target.value })}
                className="w-full text-base font-black text-slate-950 tracking-wider bg-white border border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
              <span>
                * Must begin with <span className="font-bold text-slate-700">{numberRules.visaPrefix}</span> followed by {numberRules.visaDigitCount} random digits
              </span>
              <button
                type="button"
                onClick={() => {
                  setDraftVisaPrefix(numberRules.visaPrefix);
                  setDraftVisaDigits(numberRules.visaDigitCount);
                  setIsNumberRulesOpen(true);
                }}
                className="text-sky-600 hover:text-sky-800 text-[10px] font-bold underline cursor-pointer"
              >
                নিয়ম পরিবর্তন
              </button>
            </p>
          </div>

          {/* Reference Number */}
          <div className="bg-slate-50/70 p-3 rounded-lg border border-slate-200">
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Reference No. (المرجع)</span>
                <span className="text-[10px] text-sky-700 font-mono font-normal">
                  ({numberRules.refPrefix} + {numberRules.refDigitCount} Digits)
                </span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleCopy('referenceNumber', data.referenceNumber)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-medium text-slate-600 bg-white border border-slate-200 rounded hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
                  title="Copy Reference Number"
                >
                  {copiedKey === 'referenceNumber' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedKey === 'referenceNumber' ? 'Copied' : 'Copy'}</span>
                </button>
                <button
                  type="button"
                  onClick={handleRegenerateRefNo}
                  title={`Generate New Reference Number (${numberRules.refPrefix} prefix)`}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[11px] font-semibold text-sky-700 bg-white border border-sky-200 rounded hover:bg-sky-50 transition-colors shadow-2xs cursor-pointer"
                >
                  <RotateCcw className="w-3 h-3" />
                  <span>Re-roll</span>
                </button>
              </div>
            </div>
            <div className="relative">
              <input
                type="text"
                value={data.referenceNumber}
                onChange={(e) => onChange({ referenceNumber: e.target.value })}
                className="w-full text-base font-black text-slate-950 tracking-wider bg-white border border-slate-300 rounded-md px-3 py-1.5 focus:ring-2 focus:ring-sky-500 focus:border-sky-500"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1 flex items-center justify-between">
              <span>
                * Must begin with <span className="font-bold text-slate-700">{numberRules.refPrefix}</span> followed by {numberRules.refDigitCount} random digits
              </span>
              <button
                type="button"
                onClick={() => {
                  setDraftRefPrefix(numberRules.refPrefix);
                  setDraftRefDigits(numberRules.refDigitCount);
                  setIsNumberRulesOpen(true);
                }}
                className="text-sky-600 hover:text-sky-800 text-[10px] font-bold underline cursor-pointer"
              >
                নিয়ম পরিবর্তন
              </button>
            </p>
          </div>
        </div>

        {/* SECTION: DATES (ISSUE & 4-MONTH EXPIRY) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mt-3">
          {/* Issue Date */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Issue Date (تاريخ الاصدار)</span>
                <span className="text-[10px] text-emerald-700 bg-emerald-50 border border-emerald-200 px-1.5 py-0.5 rounded font-medium">
                  আজকের তারিখ অটোমেটিক
                </span>
              </label>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => handleIssueDateChange(getTodayDateString())}
                  className="inline-flex items-center px-2 py-0.5 text-[10px] font-semibold text-emerald-700 bg-emerald-50 hover:bg-emerald-100 border border-emerald-200 rounded transition-colors cursor-pointer"
                  title="Set to Current Today Date / আজকের তারিখ"
                >
                  আজকের তারিখ
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy('issueDate', data.issueDate)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:text-sky-700 bg-slate-100 rounded border border-slate-200 cursor-pointer"
                  title="Copy Issue Date"
                >
                  {copiedKey === 'issueDate' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedKey === 'issueDate' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={data.issueDate}
                onChange={(e) => handleIssueDateChange(e.target.value)}
                placeholder="YYYY-MM-DD (যেমন: 2026-09-23)"
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500 font-mono"
              />
              <input
                type="date"
                value={formatToYYYYMMDD(data.issueDate)}
                onChange={(e) => handleIssueDateChange(formatToYYYYMMDD(e.target.value))}
                className="w-10 h-[38px] p-1 bg-slate-50 border border-slate-300 rounded-md text-slate-700 cursor-pointer"
                title="ক্যালেন্ডার থেকে নির্বাচন করুন"
              />
            </div>
            <div className="mt-1.5 flex flex-wrap items-center justify-between gap-1 text-[10.5px]">
              <span className="text-slate-500">
                ফরম্যাট: <span className="font-mono font-bold text-slate-700">YYYY-MM-DD</span>
              </span>
              <span className="inline-flex items-center gap-1 font-mono text-[11px] font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                <span>MRZ Line 2 কোড:</span>
                <span className="text-emerald-950 font-black underline tracking-wider">{toYYMMDD(data.issueDate)}</span>
                <span className="text-[10px] text-emerald-700 font-sans font-normal">(২০২৬ সালকে শুধু ২৬, এরপর মাস, এরপর তারিখ)</span>
              </span>
            </div>
          </div>

          {/* Expiry Date */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                <span>Expiry Date (صالحة لغاية)</span>
                <span className="text-[10px] text-sky-700 bg-sky-50 border border-sky-200 px-1.5 py-0.5 rounded font-medium">
                  ৪ মাস স্বয়ংক্রিয়
                </span>
              </label>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleCopy('expiryDate', data.expiryDate)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:text-sky-700 bg-slate-100 rounded border border-slate-200 cursor-pointer"
                  title="Copy Expiry Date"
                >
                  {copiedKey === 'expiryDate' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedKey === 'expiryDate' ? 'Copied' : 'Copy'}</span>
                </button>
                <label className="flex items-center gap-1 text-[11px] font-medium text-sky-700 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={data.autoCalculateExpiry}
                    onChange={(e) => {
                      const auto = e.target.checked;
                      const updates: Partial<KuwaitEVisaData> = {
                        autoCalculateExpiry: auto,
                      };
                      if (auto && data.issueDate) {
                        updates.expiryDate = calculate4MonthsExpiry(data.issueDate);
                      }
                      onChange(updates);
                    }}
                    className="rounded text-sky-600 focus:ring-sky-500"
                  />
                  <span>Auto +4 Mos</span>
                </label>
              </div>
            </div>
            <div className="relative">
              <input
                type="date"
                value={formatToYYYYMMDD(data.expiryDate)}
                onChange={(e) =>
                  onChange({ expiryDate: formatToYYYYMMDD(e.target.value), autoCalculateExpiry: false })
                }
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm font-semibold text-slate-900 focus:ring-2 focus:ring-sky-500"
              />
            </div>
            <div className="text-[10px] text-slate-600 font-medium mt-1 flex items-center justify-between">
              <span>মেয়াদ শেষ (<span className="font-mono font-bold text-sky-700">{formatToYYYYMMDD(data.expiryDate)}</span>)</span>
              <div className="flex items-center gap-1 text-[10px]">
                <button
                  type="button"
                  onClick={() => onChange({ expiryDate: calculate4MonthsExpiry(data.issueDate, false) })}
                  className="text-sky-600 hover:underline cursor-pointer"
                  title="হুবহু ৪ মাস পর"
                >
                  হুবহু ৪ মাস
                </button>
                <span>|</span>
                <button
                  type="button"
                  onClick={() => onChange({ expiryDate: calculate4MonthsExpiry(data.issueDate, true) })}
                  className="text-sky-600 hover:underline cursor-pointer"
                  title="৪ মাস মাইনাস ১ দিন"
                >
                  -১ দিন
                </button>
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 2: APPLICANT DETAILS (EXTRACTED FROM PASSPORT) */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <User className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Applicant Passport Details
            </h3>
          </div>
          <span className="text-xs text-sky-700 font-medium bg-sky-50 px-2 py-0.5 rounded border border-sky-200">
            Passport Data
          </span>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          {/* English Name */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800">
                Full Name (English):
              </label>
              <button
                type="button"
                onClick={() => handleCopy('nameEnglish', data.nameEnglish)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:text-sky-700 bg-slate-100 rounded border border-slate-200 cursor-pointer"
                title="Copy Name"
              >
                {copiedKey === 'nameEnglish' ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedKey === 'nameEnglish' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <input
              type="text"
              value={data.nameEnglish}
              onChange={(e) => onChange({ nameEnglish: e.target.value.toUpperCase() })}
              placeholder="e.g. AL AMIN ALTA MIAH"
              className="w-full uppercase bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-500"
            />
            <p className="text-[10px] text-slate-500 mt-1">
              * Includes Applicant Name and Father's Name
            </p>
          </div>

          {/* Arabic Name */}
          <div>
            <div className="flex items-center justify-between mb-1" dir="rtl">
              <label className="text-xs font-bold text-slate-800">
                الاسم بالكامل (العربية):
              </label>
              <div className="flex items-center gap-1.5" dir="ltr">
                <button
                  type="button"
                  onClick={handleAutoTranslateArabic}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded border border-sky-200 cursor-pointer"
                  title="ইংরেজি নাম থেকে স্বয়ংক্রিয় আরবি অনুবাদ তৈরি করুন"
                >
                  <Sparkles className="w-2.5 h-2.5 text-sky-600" />
                  <span>অটো আরবি</span>
                </button>
                <button
                  type="button"
                  onClick={() => handleCopy('nameArabic', data.nameArabic)}
                  className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:text-sky-700 bg-slate-100 rounded border border-slate-200 cursor-pointer"
                  title="Copy Arabic Name"
                >
                  {copiedKey === 'nameArabic' ? (
                    <Check className="w-3 h-3 text-emerald-600" />
                  ) : (
                    <Copy className="w-3 h-3" />
                  )}
                  <span>{copiedKey === 'nameArabic' ? 'Copied' : 'Copy'}</span>
                </button>
              </div>
            </div>
            <input
              type="text"
              dir="rtl"
              value={data.nameArabic}
              onChange={(e) => onChange({ nameArabic: e.target.value })}
              placeholder="سيفاجول اسلام راجيك شمسود ميا"
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-base font-bold text-slate-900 focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Detailed Name Breakdown (Given Name, Surname, Father's Name) */}
          <div className="md:col-span-2 bg-gradient-to-r from-slate-50 to-indigo-50/40 border border-slate-200 rounded-xl p-3 space-y-2">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-1.5">
              <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                <span className="w-2 h-2 rounded-full bg-indigo-600" />
                <span>নামের অংশসমূহ (Given Name, Surname ও বাবার নাম)</span>
              </span>
              <button
                type="button"
                onClick={() => handleComposeFullName()}
                className="text-[10px] text-indigo-700 bg-indigo-50 hover:bg-indigo-100 border border-indigo-200 px-2 py-0.5 rounded-lg font-semibold cursor-pointer inline-flex items-center gap-1"
                title="Given Name + Surname + Father's Name একসাথে করে সম্পূর্ণ নাম সাজান"
              >
                <Sparkles className="w-3 h-3 text-indigo-600" />
                <span>সম্পূর্ণ নাম অটো-সিঙ্ক (Given + Surname + Father)</span>
              </button>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5">
              {/* Given Name */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  ১. Given Name (নামের প্রথম/মূল অংশ):
                </label>
                <input
                  type="text"
                  value={data.givenName || ''}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    handleComposeFullName(val, undefined, undefined);
                  }}
                  placeholder="যেমন: MD SIDIKUR"
                  className="w-full uppercase bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Surname */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  ২. Surname (পারিবারিক পদবী):
                </label>
                <input
                  type="text"
                  value={data.surname || ''}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    handleComposeFullName(undefined, val, undefined);
                  }}
                  placeholder="যেমন: RAHMAN বা ISLAM"
                  className="w-full uppercase bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-sky-500"
                />
              </div>

              {/* Father's Name */}
              <div>
                <label className="text-[11px] font-semibold text-slate-700 block mb-1">
                  ৩. Father's Name (পিতার নাম):
                </label>
                <input
                  type="text"
                  value={data.fatherName || ''}
                  onChange={(e) => {
                    const val = e.target.value.toUpperCase();
                    handleComposeFullName(undefined, undefined, val);
                  }}
                  placeholder="যেমন: MD ABDUL GAFFAR"
                  className="w-full uppercase bg-white border border-slate-300 rounded-md px-2.5 py-1 text-xs font-bold text-slate-800 focus:ring-1 focus:ring-sky-500"
                />
              </div>
            </div>
            <p className="text-[10px] text-slate-500">
              * কুয়েত ই-ভিসার নিয়মানুযায়ী আবেদনকারীর Given Name এবং Surname দুটোই এবং বাবার নাম সম্পূর্ণভাবে যুক্ত থাকবে।
            </p>
          </div>

          {/* DEDICATED ARABIC & ENGLISH NAME SPACING CONTROLLER */}
          <div className="md:col-span-2 bg-gradient-to-r from-sky-50/90 via-indigo-50/70 to-blue-50/90 border border-sky-200/90 rounded-xl p-3 shadow-2xs">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-2">
              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-sky-600 animate-pulse" />
                <label className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                  <span>আরবি ও ইংরেজি নামের মাঝের স্পেস / ফাঁকা (Line Spacing)</span>
                  <span className="text-[10px] text-sky-700 bg-white border border-sky-200 px-1.5 py-0.2 rounded font-normal">
                    লাইভ সমন্বয়
                  </span>
                </label>
              </div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold text-sky-800 bg-white px-2.5 py-0.5 rounded-full border border-sky-300 shadow-2xs">
                  {currentLineSpacing > 0 ? `+${currentLineSpacing}` : currentLineSpacing} px
                </span>
                {currentLineSpacing !== 0 && (
                  <button
                    type="button"
                    onClick={() => handleUpdateNameSpacing(0)}
                    className="text-[10px] text-slate-500 hover:text-rose-600 underline cursor-pointer"
                  >
                    রিসেট (0px)
                  </button>
                )}
              </div>
            </div>

            {/* Stepper buttons & Slider */}
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => handleUpdateNameSpacing(Math.max(-25, currentLineSpacing - 1))}
                className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-2xs cursor-pointer select-none active:scale-95"
                title="১ পিক্সেল কমান (স্পেস টাইট করুন)"
              >
                -
              </button>

              <input
                type="range"
                min={-20}
                max={40}
                step={1}
                value={currentLineSpacing}
                onChange={(e) => handleUpdateNameSpacing(parseInt(e.target.value, 10))}
                className="flex-1 accent-sky-600 h-2 cursor-pointer"
              />

              <button
                type="button"
                onClick={() => handleUpdateNameSpacing(Math.min(50, currentLineSpacing + 1))}
                className="w-8 h-8 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 shadow-2xs cursor-pointer select-none active:scale-95"
                title="১ পিক্সেল বাড়ান (স্পেস বাড়ান)"
              >
                +
              </button>
            </div>

            {/* Quick Presets */}
            <div className="flex flex-wrap items-center gap-1.5 mt-2.5 pt-2 border-t border-sky-100">
              <span className="text-[11px] font-semibold text-slate-500">দ্রুত প্রিসেট:</span>
              {[
                { label: 'টাইট (-4px)', val: -4 },
                { label: 'ডিফল্ট (0px)', val: 0 },
                { label: 'সামান্য (+3px)', val: 3 },
                { label: 'মিডিয়াম (+6px)', val: 6 },
                { label: 'বেশি (+10px)', val: 10 },
                { label: 'প্রশস্ত (+16px)', val: 16 },
              ].map((preset) => (
                <button
                  key={preset.val}
                  type="button"
                  onClick={() => handleUpdateNameSpacing(preset.val)}
                  className={`px-2 py-0.5 text-[11px] rounded-md font-medium border transition-all cursor-pointer ${
                    currentLineSpacing === preset.val
                      ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                      : 'bg-white text-slate-700 border-slate-200 hover:bg-sky-50'
                  }`}
                >
                  {preset.label}
                </button>
              ))}
            </div>
          </div>

          {/* Passport Number */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800">
                Passport No. (رقم الجواز):
              </label>
              <button
                type="button"
                onClick={() => handleCopy('passportNumber', data.passportNumber)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:text-sky-700 bg-slate-100 rounded border border-slate-200 cursor-pointer"
                title="Copy Passport Number"
              >
                {copiedKey === 'passportNumber' ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedKey === 'passportNumber' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <input
              type="text"
              value={data.passportNumber}
              onChange={(e) => onChange({ passportNumber: e.target.value.toUpperCase() })}
              placeholder="e.g. A16807009"
              className="w-full uppercase bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm font-black text-slate-900 tracking-wider focus:ring-2 focus:ring-sky-500"
            />
          </div>

          {/* Date of Birth */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800">
                Birth Date (تاريخ الميلاد):
              </label>
              <button
                type="button"
                onClick={() => handleCopy('birthDate', data.birthDate)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:text-sky-700 bg-slate-100 rounded border border-slate-200 cursor-pointer"
                title="Copy Birth Date"
              >
                {copiedKey === 'birthDate' ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedKey === 'birthDate' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={data.birthDate}
                onChange={(e) => onChange({ birthDate: e.target.value })}
                placeholder="YYYY-MM-DD (e.g. 2003-11-01)"
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm font-mono font-bold text-slate-900 focus:ring-2 focus:ring-sky-500"
              />
              <input
                type="date"
                value={data.birthDate}
                onChange={(e) => onChange({ birthDate: e.target.value })}
                className="w-10 h-[38px] p-1 bg-slate-50 border border-slate-300 rounded-md text-slate-700 cursor-pointer"
                title="Pick Date"
              />
            </div>
            <p className="text-[10px] text-slate-500 mt-1">
              Format: <span className="font-mono font-bold text-slate-800">YYYY-MM-DD</span>
            </p>
          </div>

          {/* Sex / Gender */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Sex / Gender (الجنس):
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => onChange({ sexEnglish: 'M', sexArabic: 'ذكر' })}
                className={`py-1.5 px-3 rounded-md text-xs font-bold border transition-colors cursor-pointer ${
                  data.sexEnglish === 'M'
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Male (ذكر / M)
              </button>
              <button
                type="button"
                onClick={() => onChange({ sexEnglish: 'F', sexArabic: 'أنثى' })}
                className={`py-1.5 px-3 rounded-md text-xs font-bold border transition-colors cursor-pointer ${
                  data.sexEnglish === 'F'
                    ? 'bg-sky-600 text-white border-sky-600'
                    : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-50'
                }`}
              >
                Female (أنثى / F)
              </button>
            </div>
          </div>

          {/* Nationality */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1">
              Nationality (الجنسية):
            </label>
            <div className="grid grid-cols-2 gap-2">
              <input
                type="text"
                value={data.nationalityEnglish}
                onChange={(e) => onChange({ nationalityEnglish: e.target.value.toUpperCase() })}
                placeholder="BANGLADESH"
                className="bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs font-bold text-slate-900 uppercase"
              />
              <input
                type="text"
                dir="rtl"
                value={data.nationalityArabic}
                onChange={(e) => onChange({ nationalityArabic: e.target.value })}
                placeholder="بنغلاديش"
                className="bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs font-bold text-slate-900"
              />
            </div>
          </div>

          {/* Passport Issue Date */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800">
                Passport Issue Date:
              </label>
              <button
                type="button"
                onClick={() => handleCopy('passportIssueDate', data.passportIssueDate)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:text-sky-700 bg-slate-100 rounded border border-slate-200 cursor-pointer"
                title="Copy Issue Date"
              >
                {copiedKey === 'passportIssueDate' ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedKey === 'passportIssueDate' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={data.passportIssueDate}
                onChange={(e) => onChange({ passportIssueDate: e.target.value })}
                placeholder="YYYY-MM-DD (e.g. 2024-11-07)"
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs font-mono font-semibold text-slate-900"
              />
              <input
                type="date"
                value={data.passportIssueDate}
                onChange={(e) => onChange({ passportIssueDate: e.target.value })}
                className="w-10 h-[32px] p-1 bg-slate-50 border border-slate-300 rounded-md text-slate-700 cursor-pointer"
                title="Pick Date"
              />
            </div>
          </div>

          {/* Passport Expiry Date */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800">
                Passport Expiry Date:
              </label>
              <button
                type="button"
                onClick={() => handleCopy('passportExpiryDate', data.passportExpiryDate)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:text-sky-700 bg-slate-100 rounded border border-slate-200 cursor-pointer"
                title="Copy Expiry Date"
              >
                {copiedKey === 'passportExpiryDate' ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedKey === 'passportExpiryDate' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <div className="flex items-center gap-1.5">
              <input
                type="text"
                value={data.passportExpiryDate}
                onChange={(e) => onChange({ passportExpiryDate: e.target.value })}
                placeholder="YYYY-MM-DD (e.g. 2034-11-06)"
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs font-mono font-semibold text-slate-900"
              />
              <input
                type="date"
                value={data.passportExpiryDate}
                onChange={(e) => onChange({ passportExpiryDate: e.target.value })}
                className="w-10 h-[32px] p-1 bg-slate-50 border border-slate-300 rounded-md text-slate-700 cursor-pointer"
                title="Pick Date"
              />
            </div>
          </div>
        </div>
      </div>

      {/* SECTION 3: VISA & SPONSOR CONFIGURATION */}
      <div>
        <div className="flex items-center justify-between border-b border-slate-100 pb-2 mb-3">
          <div className="flex items-center gap-2">
            <Building className="w-4 h-4 text-sky-600" />
            <h3 className="text-sm font-bold text-slate-900">
              Visa Type & Sponsor Details
            </h3>
          </div>
        </div>

        <div className="space-y-3">
          {/* Visa Type & Occupation */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Visa Type (نوع التأشيرة):
              </label>
              <input
                type="text"
                value={data.visaTypeEnglish}
                onChange={(e) => onChange({ visaTypeEnglish: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-900 mb-1.5"
              />
              <input
                type="text"
                dir="rtl"
                value={data.visaTypeArabic}
                onChange={(e) => onChange({ visaTypeArabic: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs font-bold text-slate-900"
              />
            </div>
            <div>
              <label className="block text-xs font-bold text-slate-800 mb-1">
                Occupation (المهنة):
              </label>
              <input
                type="text"
                value={data.occupationEnglish}
                onChange={(e) => onChange({ occupationEnglish: e.target.value.toUpperCase() })}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs font-semibold text-slate-900 uppercase mb-1.5"
              />
              <input
                type="text"
                dir="rtl"
                value={data.occupationArabic}
                onChange={(e) => onChange({ occupationArabic: e.target.value })}
                className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs font-bold text-slate-900"
              />
            </div>
          </div>

          {/* Sponsor Details */}
          <div>
            <div className="flex items-center justify-between mb-1">
              <label className="text-xs font-bold text-slate-800" dir="rtl">
                الكفيل (Sponsor Details):
              </label>
              <button
                type="button"
                onClick={() => handleCopy('sponsorDetails', data.sponsorDetails)}
                className="inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-medium text-slate-600 hover:text-sky-700 bg-slate-100 rounded border border-slate-200 cursor-pointer"
                title="Copy Sponsor Details"
              >
                {copiedKey === 'sponsorDetails' ? (
                  <Check className="w-3 h-3 text-emerald-600" />
                ) : (
                  <Copy className="w-3 h-3" />
                )}
                <span>{copiedKey === 'sponsorDetails' ? 'Copied' : 'Copy'}</span>
              </button>
            </div>
            <input
              type="text"
              dir="rtl"
              value={data.sponsorDetails}
              onChange={(e) => onChange({ sponsorDetails: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-sm font-bold text-slate-900 focus:ring-2 focus:ring-sky-500"
            />
            {/* Sponsor quick selector */}
            <div className="flex flex-wrap gap-1.5 mt-1.5">
              {sponsorPresets.map((sp, idx) => (
                <button
                  key={idx}
                  type="button"
                  onClick={() => onChange({ sponsorDetails: sp })}
                  className="text-[10px] text-slate-600 hover:text-sky-700 bg-slate-100 hover:bg-sky-50 border border-slate-200 px-2 py-0.5 rounded transition-colors cursor-pointer"
                  dir="rtl"
                >
                  {sp.split('-')[0]}
                </button>
              ))}
            </div>
          </div>

          {/* Issuing Authority */}
          <div>
            <label className="block text-xs font-bold text-slate-800 mb-1" dir="rtl">
              جهة الإصدار (Issuing Authority):
            </label>
            <input
              type="text"
              dir="rtl"
              value={data.issuingAuthorityArabic}
              onChange={(e) => onChange({ issuingAuthorityArabic: e.target.value })}
              className="w-full bg-white border border-slate-300 rounded-md px-3 py-1.5 text-xs font-bold text-slate-900"
            />
          </div>
        </div>
      </div>

      {/* SECTION 4: MRZ (Machine Readable Zone) PREVIEW & COPY */}
      <div className="bg-slate-900 text-slate-100 p-4 rounded-xl border border-slate-800 space-y-3 shadow-md">
        <div className="flex items-center justify-between border-b border-slate-800 pb-2">
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-black text-amber-400 bg-amber-400/10 px-2 py-0.5 rounded border border-amber-400/30">
              MRZ 44-Char Standard
            </span>
            <span className="text-xs font-bold text-slate-200">
              Machine Readable Zone
            </span>
          </div>
          <div className="flex items-center gap-2">
            {(data.customMrzLine1 || data.customMrzLine2) && (
              <button
                type="button"
                onClick={() => onChange({ customMrzLine1: undefined, customMrzLine2: undefined })}
                className="text-[11px] font-medium text-amber-400 hover:text-amber-300 underline cursor-pointer"
              >
                Reset MRZ
              </button>
            )}
            <button
              type="button"
              onClick={() => {
                const line1 = data.customMrzLine1 || formatMrzLine1Name(data.nameEnglish);
                const line2 = data.customMrzLine2 || generateKuwaitMrz({
                  fullNameEnglish: data.nameEnglish,
                  visaNumber: data.visaNumber,
                  referenceNumber: data.referenceNumber,
                  nationalityEnglish: data.nationalityEnglish,
                  dateOfBirth: data.birthDate,
                  sex: data.sexEnglish,
                  issueDate: data.issueDate,
                }).line2;
                handleCopy('fullMrz', `${line1}\n${line2}`);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 py-1 text-xs font-bold bg-amber-500 hover:bg-amber-400 text-slate-950 rounded transition-colors shadow-2xs cursor-pointer"
            >
              {copiedKey === 'fullMrz' ? (
                <Check className="w-3.5 h-3.5 text-slate-950" />
              ) : (
                <Copy className="w-3.5 h-3.5" />
              )}
              <span>{copiedKey === 'fullMrz' ? 'Copied MRZ' : 'Copy Full MRZ'}</span>
            </button>
          </div>
        </div>

        <div className="space-y-2 font-mono text-[12px] md:text-[13px] bg-slate-950 p-3 rounded-lg border border-slate-800 text-amber-300">
          <div>
            <div className="flex items-center justify-between gap-2 mb-1">
              <span className="text-[11px] font-sans font-bold text-slate-400">MRZ Line 1 (44 Chars, VHKW কোডসহ নাম):</span>
              <button
                type="button"
                onClick={() => handleCopy('mrzLine1', data.customMrzLine1 || formatMrzLine1Name(data.nameEnglish))}
                className="text-[10px] text-slate-400 hover:text-white shrink-0 px-2 py-0.5 bg-slate-800 rounded cursor-pointer"
                title="Copy Line 1"
              >
                {copiedKey === 'mrzLine1' ? 'Copied' : 'Copy L1'}
              </button>
            </div>
            <input
              type="text"
              maxLength={50}
              value={data.customMrzLine1 !== undefined ? data.customMrzLine1 : formatMrzLine1Name(data.nameEnglish)}
              onChange={(e) => onChange({ customMrzLine1: e.target.value.toUpperCase() })}
              className="w-full bg-slate-900 border border-slate-700 text-amber-300 px-2.5 py-1 rounded text-xs md:text-sm font-mono tracking-widest focus:ring-1 focus:ring-amber-400"
            />
          </div>

          <div className="border-t border-slate-900 pt-2">
            <div className="flex items-center justify-between gap-2 mb-1">
              <div className="flex items-center gap-1.5">
                <span className="text-[11px] font-sans font-bold text-slate-400">MRZ Line 2 (লাস্টে ৮টি &lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt; চিহ্ন):</span>
                <span className="text-[10px] font-mono text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-800">
                  ইস্যু কোড: {toYYMMDD(data.issueDate)}
                </span>
                <span className="text-[10px] font-mono text-amber-300 bg-amber-950/80 px-1.5 py-0.5 rounded border border-amber-500/40">
                  ৮টি &lt; চিহ্ন
                </span>
              </div>
              <div className="flex items-center gap-1">
                <button
                  type="button"
                  onClick={() => {
                    const current = data.customMrzLine2 || generateKuwaitMrz({
                      fullNameEnglish: data.nameEnglish,
                      visaNumber: data.visaNumber,
                      referenceNumber: data.referenceNumber,
                      nationalityEnglish: data.nationalityEnglish,
                      dateOfBirth: data.birthDate,
                      sex: data.sexEnglish,
                      issueDate: data.issueDate,
                    }).line2;
                    const with8 = current.replace(/<*$/, '<<<<<<<<');
                    onChange({ customMrzLine2: with8 });
                  }}
                  className="text-[10px] text-amber-300 hover:text-white shrink-0 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded border border-amber-600/40 cursor-pointer font-bold"
                  title="Make sure line ends with exactly 8 chevrons <<<<<<<<"
                >
                  ৮টি চিহ্ন (&lt;&lt;&lt;&lt;&lt;&lt;&lt;&lt;)
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const current = data.customMrzLine2 || generateKuwaitMrz({
                      fullNameEnglish: data.nameEnglish,
                      visaNumber: data.visaNumber,
                      referenceNumber: data.referenceNumber,
                      nationalityEnglish: data.nationalityEnglish,
                      dateOfBirth: data.birthDate,
                      sex: data.sexEnglish,
                      issueDate: data.issueDate,
                    }).line2;
                    const synced = updateMrzLine2IssueDate(current, data.issueDate);
                    onChange({ customMrzLine2: synced });
                  }}
                  className="text-[10px] text-emerald-300 hover:text-white shrink-0 px-2 py-0.5 bg-slate-800 hover:bg-slate-700 rounded border border-emerald-600/40 cursor-pointer"
                  title="Sync Issue Date with MRZ Line 2"
                >
                  ইস্যু তারিখ সিঙ্ক ({toYYMMDD(data.issueDate)})
                </button>
                <button
                  type="button"
                  onClick={() => {
                    const l2 = data.customMrzLine2 || generateKuwaitMrz({
                      fullNameEnglish: data.nameEnglish,
                      visaNumber: data.visaNumber,
                      referenceNumber: data.referenceNumber,
                      nationalityEnglish: data.nationalityEnglish,
                      dateOfBirth: data.birthDate,
                      sex: data.sexEnglish,
                      issueDate: data.issueDate,
                    }).line2;
                    handleCopy('mrzLine2', l2);
                  }}
                  className="text-[10px] text-slate-400 hover:text-white shrink-0 px-2 py-0.5 bg-slate-800 rounded cursor-pointer"
                  title="Copy Line 2"
                >
                  {copiedKey === 'mrzLine2' ? 'Copied' : 'Copy L2'}
                </button>
              </div>
            </div>
            <input
              type="text"
              maxLength={50}
              value={data.customMrzLine2 !== undefined ? data.customMrzLine2 : generateKuwaitMrz({
                fullNameEnglish: data.nameEnglish,
                visaNumber: data.visaNumber,
                referenceNumber: data.referenceNumber,
                nationalityEnglish: data.nationalityEnglish,
                dateOfBirth: data.birthDate,
                sex: data.sexEnglish,
                issueDate: data.issueDate,
              }).line2}
              onChange={(e) => onChange({ customMrzLine2: e.target.value.toUpperCase() })}
              className="w-full bg-slate-900 border border-slate-700 text-amber-300 px-2.5 py-1 rounded text-xs md:text-sm font-mono tracking-widest focus:ring-1 focus:ring-amber-400"
            />
            {(() => {
              const currentL2 = data.customMrzLine2 !== undefined ? data.customMrzLine2 : generateKuwaitMrz({
                fullNameEnglish: data.nameEnglish,
                visaNumber: data.visaNumber,
                referenceNumber: data.referenceNumber,
                nationalityEnglish: data.nationalityEnglish,
                dateOfBirth: data.birthDate,
                sex: data.sexEnglish,
                issueDate: data.issueDate,
              }).line2;
              const parsed = parseKuwaitMrzLine2(currentL2);
              if (!parsed) return null;
              return (
                <div className="mt-1.5 pt-1.5 border-t border-slate-900/80 flex flex-wrap items-center gap-1 text-[10px] font-sans">
                  <span className="text-slate-400">অংশসমূহ:</span>
                  <span className="bg-slate-900 px-1 py-0.5 rounded text-slate-300 font-mono" title="Visa Number">
                    ভিসা: {parsed.visaNumber}
                  </span>
                  <span className="bg-slate-900 px-1 py-0.5 rounded text-sky-400 font-mono" title="Country">
                    দেশ: {parsed.countryCode}
                  </span>
                  <span className="bg-slate-900 px-1 py-0.5 rounded text-slate-300 font-mono" title="DOB">
                    জন্ম: {parsed.dobYYMMDD}
                  </span>
                  <span className="bg-slate-900 px-1 py-0.5 rounded text-amber-400 font-mono" title="Sex">
                    লিঙ্গ: {parsed.sex}
                  </span>
                  <span className="bg-emerald-950/80 border border-emerald-500/60 px-1.5 py-0.5 rounded text-emerald-300 font-mono font-bold" title="Visa Issue Date (YYMMDD: ২০২৬ সাল -> ২৬, মাস -> MM, দিন -> DD)">
                    ✓ ইস্যু তারিখ: {parsed.issueYYMMDD} ({`20${parsed.issueYYMMDD.substring(0, 2)}-${parsed.issueYYMMDD.substring(2, 4)}-${parsed.issueYYMMDD.substring(4, 6)}`})
                  </span>
                  <span className="bg-slate-900 px-1 py-0.5 rounded text-slate-300 font-mono" title="Reference Number">
                    রেফ: {parsed.referenceNumber}
                  </span>
                </div>
              );
            })()}
          </div>

          {/* MRZ CHEVRON SQUASH, STROKE & BOLDNESS CONTROLLER */}
          {calibration && onCalibrationChange && (
            <div className="bg-slate-900/95 rounded-lg border border-slate-700 p-3 mt-3 space-y-3 shadow-sm">
              <div className="flex items-center justify-between border-b border-slate-800 pb-2">
                <div className="flex items-center gap-2">
                  <Sliders className="w-4 h-4 text-amber-400" />
                  <span className="text-xs font-bold text-slate-100">
                    MRZ চিহ্ন চেপাকরণ, স্ট্রোক ও বোল্ডনেস নিয়ন্ত্রণ
                  </span>
                  <span className="text-[10px] text-amber-300 font-mono bg-amber-500/20 px-1.5 py-0.5 rounded border border-amber-500/30">
                    Live Sync
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => handleUpdateMrzCal({
                    mrzChevronScaleY: 0.75,
                    mrzChevronScaleX: 1.0,
                    mrzStrokeWidth: 0.22,
                    mrzFontWeight: 'bold',
                    mrzColor: '#222222',
                    mrzOpacity: 0.92,
                    mrz2BgdScale: 0.82,
                  })}
                  className="text-[10px] text-amber-400 hover:text-amber-300 underline cursor-pointer"
                  title="ডিফল্ট বোল্ড ও চেপা স্টাইলে রিসেট করুন"
                >
                  ডিফল্ট রিসেট (চিহ্ন ০.৭৫x / BGD ০.৮২x)
                </button>
              </div>

              {/* LIVE PREVIEW OF MRZ STROKE & SQUASH */}
              <div className="bg-white p-2.5 rounded-lg border border-slate-200 overflow-x-auto flex flex-col items-center justify-center shadow-inner">
                <span className="text-[10px] font-sans font-bold text-slate-600 mb-1 self-start">
                  লাইভ প্রিভিউ (MRZ ১ম ও ২য় লাইন, চেপা চিহ্ন এবং BGD সাইজ):
                </span>
                <div className="text-black py-1 flex flex-col gap-1.5 items-start">
                  <MrzLine
                    line={data.customMrzLine1 || formatMrzLine1Name(data.nameEnglish)}
                    chevronScaleY={currentChevronScaleY}
                    chevronScaleX={currentChevronScaleX}
                    strokeWidth={currentMrzStroke}
                    fontWeight={currentMrzWeight}
                    color={currentMrzColor}
                    opacity={currentMrzOpacity}
                  />
                  <MrzLine
                    line={data.customMrzLine2 || generateKuwaitMrz({
                      fullNameEnglish: data.nameEnglish,
                      visaNumber: data.visaNumber,
                      referenceNumber: data.referenceNumber,
                      nationalityEnglish: data.nationalityEnglish,
                      dateOfBirth: data.birthDate,
                      sex: data.sexEnglish,
                      issueDate: data.issueDate,
                    }).line2}
                    isLine2={true}
                    bgdScale={currentMrz2BgdScale}
                    chevronScaleY={currentChevronScaleY}
                    chevronScaleX={currentChevronScaleX}
                    strokeWidth={currentMrzStroke}
                    fontWeight={currentMrzWeight}
                    color={currentMrzColor}
                    opacity={currentMrzOpacity}
                  />
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-xs">
                {/* CONTROL 1: CHEVRON SQUASH (SCALE Y) */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                      <span>১. চিহ্নগুলো চেপা করা (Squash / Scale Y)</span>
                    </span>
                    <span className="text-[11px] font-mono font-bold text-amber-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                      {currentChevronScaleY === 0.75 ? '🔥 ০.৭৫x (চেপা)' : `${currentChevronScaleY.toFixed(2)}x`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateMrzCal({ mrzChevronScaleY: Math.max(0.4, Number((currentChevronScaleY - 0.05).toFixed(2))) })}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95"
                      title="চিহ্ন আরও চেপা করুন"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min={0.4}
                      max={1.4}
                      step={0.02}
                      value={currentChevronScaleY}
                      onChange={(e) => handleUpdateMrzCal({ mrzChevronScaleY: parseFloat(e.target.value) })}
                      className="flex-1 accent-amber-500 h-1.5 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateMrzCal({ mrzChevronScaleY: Math.min(1.4, Number((currentChevronScaleY + 0.05).toFixed(2))) })}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95"
                      title="চিহ্ন প্রসারিত করুন"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 pt-1 text-[10px]">
                    <span className="text-slate-500">প্রিসেট:</span>
                    {[
                      { label: '১.০০x (সাধারণ)', val: 1.0 },
                      { label: '০.৮৫x (হালকা)', val: 0.85 },
                      { label: '🔥 ০.৭৫x (পারফেক্ট চেপা)', val: 0.75 },
                      { label: '০.৬৫x (বেশি চেপা)', val: 0.65 },
                      { label: '০.৫০x (সর্বোচ্চ)', val: 0.5 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => handleUpdateMrzCal({ mrzChevronScaleY: p.val })}
                        className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                          Math.abs(currentChevronScaleY - p.val) < 0.02
                            ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CONTROL 2: CHEVRON WIDTH (SCALE X) */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                      <span>২. চিহ্নের প্রশস্ততা (Chevron Width / Scale X)</span>
                    </span>
                    <span className="text-[11px] font-mono font-bold text-sky-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                      {currentChevronScaleX.toFixed(2)}x
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateMrzCal({ mrzChevronScaleX: Math.max(0.5, Number((currentChevronScaleX - 0.05).toFixed(2))) })}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95"
                      title="চিহ্ন চিকন করুন"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min={0.5}
                      max={1.4}
                      step={0.02}
                      value={currentChevronScaleX}
                      onChange={(e) => handleUpdateMrzCal({ mrzChevronScaleX: parseFloat(e.target.value) })}
                      className="flex-1 accent-sky-500 h-1.5 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateMrzCal({ mrzChevronScaleX: Math.min(1.4, Number((currentChevronScaleX + 0.05).toFixed(2))) })}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-sky-300 font-bold flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95"
                      title="চিহ্ন প্রশস্ত করুন"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 pt-1 text-[10px]">
                    <span className="text-slate-500">প্রিসেট:</span>
                    {[
                      { label: '০.৮০x (সংকীর্ণ)', val: 0.8 },
                      { label: '০.৯০x (চিকন)', val: 0.9 },
                      { label: '১.০০x (সাধারণ)', val: 1.0 },
                      { label: '১.১৫x (প্রশস্ত)', val: 1.15 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => handleUpdateMrzCal({ mrzChevronScaleX: p.val })}
                        className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                          Math.abs(currentChevronScaleX - p.val) < 0.02
                            ? 'bg-sky-500 text-slate-950 border-sky-500 font-bold'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CONTROL 3: MRZ STROKE WIDTH */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                      <span>৩. MZ স্ট্রোক (Stroke Thickness)</span>
                    </span>
                    <span className="text-[11px] font-mono font-bold text-emerald-400 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                      {currentMrzStroke === 0 ? '০px (স্ট্রোকহীন)' : `${currentMrzStroke.toFixed(2)}px`}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <button
                      type="button"
                      onClick={() => handleUpdateMrzCal({ mrzStrokeWidth: Math.max(0, Number((currentMrzStroke - 0.02).toFixed(2))) })}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95"
                      title="স্ট্রোক কমান"
                    >
                      -
                    </button>
                    <input
                      type="range"
                      min={0}
                      max={0.4}
                      step={0.01}
                      value={currentMrzStroke}
                      onChange={(e) => handleUpdateMrzCal({ mrzStrokeWidth: parseFloat(e.target.value) })}
                      className="flex-1 accent-emerald-500 h-1.5 cursor-pointer"
                    />
                    <button
                      type="button"
                      onClick={() => handleUpdateMrzCal({ mrzStrokeWidth: Math.min(0.4, Number((currentMrzStroke + 0.02).toFixed(2))) })}
                      className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-emerald-300 font-bold flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95"
                      title="স্ট্রোক বাড়ান"
                    >
                      +
                    </button>
                  </div>
                  <div className="flex flex-wrap items-center gap-1 pt-1 text-[10px]">
                    <span className="text-slate-500">প্রিসেট:</span>
                    {[
                      { label: '০px (নেই)', val: 0 },
                      { label: '০.০৮px (হালকা)', val: 0.08 },
                      { label: '০.১৬px (মিডিয়াম)', val: 0.16 },
                      { label: '🔥 ০.২২px (বোল্ড)', val: 0.22 },
                      { label: '০.৩০px (গাঢ়)', val: 0.3 },
                    ].map((p) => (
                      <button
                        key={p.val}
                        type="button"
                        onClick={() => handleUpdateMrzCal({ mrzStrokeWidth: p.val })}
                        className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                          Math.abs(currentMrzStroke - p.val) < 0.015
                            ? 'bg-emerald-500 text-slate-950 border-emerald-500 font-bold'
                            : 'bg-slate-900 text-slate-400 border-slate-800 hover:text-white'
                        }`}
                      >
                        {p.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* CONTROL 4: MRZ BOLDNESS (FONT WEIGHT) */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1">
                      <span>৪. MZ বোল্ডনেস (Font Weight)</span>
                    </span>
                    <span className="text-[11px] font-mono font-bold text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700 uppercase">
                      {currentMrzWeight}
                    </span>
                  </div>
                  <div className="grid grid-cols-2 sm:grid-cols-4 gap-1.5 pt-1">
                    {[
                      { label: 'Normal (৪০০)', val: 'normal' },
                      { label: 'Medium (৬০০)', val: 'medium' },
                      { label: '🔥 Bold (৭০০)', val: 'bold' },
                      { label: 'Extra (৯০০)', val: 'extrabold' },
                    ].map((w) => (
                      <button
                        key={w.val}
                        type="button"
                        onClick={() => handleUpdateMrzCal({ mrzFontWeight: w.val })}
                        className={`py-1.5 px-1 rounded text-center text-[10px] font-bold border transition-all cursor-pointer ${
                          currentMrzWeight === w.val
                            ? 'bg-amber-500 text-slate-950 border-amber-500 shadow-2xs'
                            : 'bg-slate-900 text-slate-300 border-slate-800 hover:bg-slate-800'
                        }`}
                      >
                        {w.label}
                      </button>
                    ))}
                  </div>
                  <p className="text-[10px] text-slate-400 pt-0.5">
                    * নামের মতো চমৎকার বোল্ড করতে <strong>Bold (700)</strong> ও <strong>০.২২px স্ট্রোক</strong> রাখা হয়েছে
                  </p>
                </div>

                {/* CONTROL 5: MRZ COLOR TONE & LIGHTNESS */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full border border-white/20" style={{ backgroundColor: currentMrzColor, opacity: currentMrzOpacity }} />
                      <span>৫. MZ কালার ও হালকা/গাঢ় নিয়ন্ত্রণ (Color Tone & Lightness)</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-bold text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                        {currentMrzOpacity === 0.92 && currentMrzColor === '#222222'
                          ? '🔥 ৯২% (সামান্য হালকা - ডিফল্ট)'
                          : `${Math.round(currentMrzOpacity * 100)}% ডার্কনেস (${currentMrzColor})`}
                      </span>
                      {/* Direct Color Picker */}
                      <div className="flex items-center gap-1 bg-slate-900 border border-slate-700 rounded px-1.5 py-0.5" title="পছন্দমতো কাস্টম কালার বেছে নিন">
                        <input
                          type="color"
                          value={currentMrzColor.startsWith('#') ? currentMrzColor : '#222222'}
                          onChange={(e) => handleUpdateMrzCal({ mrzColor: e.target.value })}
                          className="w-4 h-4 rounded cursor-pointer border-none bg-transparent"
                        />
                        <span className="text-[10px] font-mono text-slate-400">{currentMrzColor}</span>
                      </div>
                    </div>
                  </div>

                  {/* Opacity / Lightness Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>কালারের গভীরতা (হালকা ↔ গাঢ়):</span>
                      <span className="font-mono text-amber-300 font-bold">{Math.round(currentMrzOpacity * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateMrzCal({ mrzOpacity: Math.max(0.50, Number((currentMrzOpacity - 0.03).toFixed(2))) })}
                        className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95 text-xs"
                        title="কালার আরও হালকা করুন"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min={0.50}
                        max={1.00}
                        step={0.01}
                        value={currentMrzOpacity}
                        onChange={(e) => handleUpdateMrzCal({ mrzOpacity: parseFloat(e.target.value) })}
                        className="flex-1 accent-amber-500 h-1.5 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateMrzCal({ mrzOpacity: Math.min(1.00, Number((currentMrzOpacity + 0.03).toFixed(2))) })}
                        className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95 text-xs"
                        title="কালার আরও গাঢ় করুন"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Color / Lightness Presets */}
                  <div className="flex flex-wrap items-center gap-1 pt-1 text-[10px]">
                    <span className="text-slate-500 font-medium">কালার প্রিসেট:</span>
                    {[
                      { label: '১০০% গভীর কালো (#000000)', color: '#000000', opacity: 1.0 },
                      { label: '🔥 ৯২% সামান্য হালকা (#222222 - ডিফল্ট)', color: '#222222', opacity: 0.92 },
                      { label: '৮৫% চারকোল ব্ল্যাক (#2e2e2e)', color: '#2e2e2e', opacity: 0.85 },
                      { label: '৭৫% সফট ডার্ক গ্রে (#444444)', color: '#444444', opacity: 0.75 },
                      { label: '৬৫% হালকা ছাই/গ্রে (#555555)', color: '#555555', opacity: 0.65 },
                    ].map((p) => {
                      const isSel = Math.abs(currentMrzOpacity - p.opacity) < 0.02 && currentMrzColor.toLowerCase() === p.color.toLowerCase();
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => handleUpdateMrzCal({ mrzColor: p.color, mrzOpacity: p.opacity })}
                          className={`px-2 py-0.5 rounded border transition-colors cursor-pointer flex items-center gap-1 ${
                            isSel
                              ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-2xs'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                          }`}
                        >
                          <span className="w-2 h-2 rounded-full inline-block border border-white/20" style={{ backgroundColor: p.color, opacity: p.opacity }} />
                          <span>{p.label}</span>
                        </button>
                      );
                    })}
                  </div>
                </div>

                {/* CONTROL 6: MRZ LINE 2 BGD SIZE CONTROL */}
                <div className="bg-slate-950 p-2.5 rounded-lg border border-slate-800 space-y-2 md:col-span-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-slate-300 flex items-center gap-1.5">
                      <span className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
                      <span>৬. MZ ২য় লাইনে BGD অক্ষরের সাইজ (MRZ Line 2 BGD Size)</span>
                    </span>
                    <span className="text-[11px] font-mono font-bold text-amber-300 bg-slate-900 px-1.5 py-0.5 rounded border border-slate-700">
                      {currentMrz2BgdScale === 0.82
                        ? '🔥 ০.৮২x (৮২% ছোট - রেফারেন্স)'
                        : `${currentMrz2BgdScale.toFixed(2)}x (${Math.round(currentMrz2BgdScale * 100)}% সাইজ)`}
                    </span>
                  </div>

                  {/* Slider */}
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-[10px] text-slate-400">
                      <span>BGD অক্ষরের আকার (ছোট ↔ বড়):</span>
                      <span className="font-mono text-amber-300 font-bold">{Math.round(currentMrz2BgdScale * 100)}%</span>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleUpdateMrzCal({ mrz2BgdScale: Math.max(0.50, Number((currentMrz2BgdScale - 0.03).toFixed(2))) })}
                        className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95 text-xs"
                        title="BGD আরও ছোট করুন"
                      >
                        -
                      </button>
                      <input
                        type="range"
                        min={0.50}
                        max={1.10}
                        step={0.01}
                        value={currentMrz2BgdScale}
                        onChange={(e) => handleUpdateMrzCal({ mrz2BgdScale: parseFloat(e.target.value) })}
                        className="flex-1 accent-amber-500 h-1.5 cursor-pointer"
                      />
                      <button
                        type="button"
                        onClick={() => handleUpdateMrzCal({ mrz2BgdScale: Math.min(1.10, Number((currentMrz2BgdScale + 0.03).toFixed(2))) })}
                        className="w-7 h-7 rounded bg-slate-800 hover:bg-slate-700 text-amber-300 font-bold flex items-center justify-center cursor-pointer border border-slate-700 active:scale-95 text-xs"
                        title="BGD বড় করুন"
                      >
                        +
                      </button>
                    </div>
                  </div>

                  {/* Presets */}
                  <div className="flex flex-wrap items-center gap-1 pt-1 text-[10px]">
                    <span className="text-slate-500 font-medium">সাইজ প্রিসেট:</span>
                    {[
                      { label: '🔥 ০.৮২x (পারফেক্ট ছোট - রেফারেন্স)', val: 0.82 },
                      { label: '০.৭৫x (আরও ছোট)', val: 0.75 },
                      { label: '০.৬৮x (মিনি)', val: 0.68 },
                      { label: '০.৮৮x (সামান্য ছোট)', val: 0.88 },
                      { label: '১.০০x (সমান সাইজ)', val: 1.0 },
                    ].map((p) => {
                      const isSel = Math.abs(currentMrz2BgdScale - p.val) < 0.015;
                      return (
                        <button
                          key={p.label}
                          type="button"
                          onClick={() => handleUpdateMrzCal({ mrz2BgdScale: p.val })}
                          className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                            isSel
                              ? 'bg-amber-500 text-slate-950 border-amber-500 font-bold shadow-2xs'
                              : 'bg-slate-900 text-slate-300 border-slate-800 hover:text-white'
                          }`}
                        >
                          {p.label}
                        </button>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* SECTION 5: GLOBAL FONT CONFIGURATION */}
      <div className="bg-slate-50 p-3 rounded-lg border border-slate-200">
        <div className="flex items-center justify-between mb-2">
          <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
            <TypeIcon className="w-3.5 h-3.5 text-sky-600" />
            <span>Document Font Style (গ্লোবাল ফন্ট):</span>
          </label>
          <span className="text-[11px] font-bold text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
            Selected: {data.fontFamily}
          </span>
        </div>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-2">
          {['Myanmar Text', 'Cairo', 'Amiri', 'Segoe UI'].map((font) => (
            <button
              key={font}
              type="button"
              onClick={() => onChange({ fontFamily: font })}
              className={`py-1.5 px-2 text-xs font-bold rounded border transition-all cursor-pointer ${
                data.fontFamily === font
                  ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                  : 'bg-white text-slate-700 border-slate-300 hover:bg-slate-100'
              }`}
            >
              {font === 'Myanmar Text' ? 'Myanmar Text (Official)' : font}
            </button>
          ))}
        </div>
        <p className="text-[10px] text-slate-500 mt-2">
          * Official Kuwait eVisa uses <span className="font-bold text-slate-700">Myanmar Text</span> typography
        </p>
      </div>

      {/* SECTION 6: INDIVIDUAL LINE-BY-LINE FONT CUSTOMIZER */}
      {calibration && onCalibrationChange && (
        <div className="bg-gradient-to-r from-purple-50/70 via-indigo-50/70 to-sky-50/70 p-3.5 rounded-xl border border-purple-200 shadow-xs space-y-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-purple-600 text-white flex items-center justify-center shadow-xs">
                <Sliders className="w-3.5 h-3.5" />
              </div>
              <div>
                <h3 className="text-xs font-bold text-purple-950 flex items-center gap-1.5">
                  <span>প্রতিটি লাইনের ফন্ট আলাদা পরিবর্তন</span>
                  {Object.keys(calibration.lineStyles || {}).length > 0 && (
                    <span className="text-[10px] font-mono bg-purple-200 text-purple-900 px-1.5 py-0.2 rounded-full font-bold">
                      {Object.keys(calibration.lineStyles || {}).length} টি কাস্টম
                    </span>
                  )}
                </h3>
                <p className="text-[10.5px] text-purple-800/80">
                  প্রত্যেক ফিল্ডের জন্য আলাদা ফন্ট, সাইজ, বোল্ডনেস ও প্রিন্ট অপশন
                </p>
              </div>
            </div>

            <div className="flex items-center gap-1.5">
              {onOpenLineFontsModal && (
                <button
                  type="button"
                  onClick={onOpenLineFontsModal}
                  className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-bold text-purple-700 bg-white border border-purple-300 rounded-lg hover:bg-purple-50 transition-colors shadow-2xs cursor-pointer"
                  title="ড্র্যাগেবল পপআপ উইন্ডোতে খুলুন"
                >
                  <Maximize2 className="w-3 h-3 text-purple-600" />
                  <span className="hidden sm:inline">পপআপ</span>
                </button>
              )}
              <button
                type="button"
                onClick={() => setShowLineFontManager(!showLineFontManager)}
                className="inline-flex items-center gap-1 px-2.5 py-1 text-[11px] font-bold text-white bg-purple-600 hover:bg-purple-700 rounded-lg transition-colors shadow-2xs cursor-pointer"
              >
                <span>{showLineFontManager ? 'লুকান' : 'ফন্ট পরিবর্তন করুন'}</span>
                {showLineFontManager ? (
                  <ChevronUp className="w-3 h-3" />
                ) : (
                  <ChevronDown className="w-3 h-3" />
                )}
              </button>
            </div>
          </div>

          {/* Embedded Line Font Manager Accordion */}
          {showLineFontManager && (
            <div className="mt-3 pt-3 border-t border-purple-200/80 bg-white p-3 rounded-xl border">
              <LineFontManager
                calibration={calibration}
                onCalibrationChange={onCalibrationChange}
                defaultDocFont={data.fontFamily}
              />
            </div>
          )}
        </div>
      )}
    </div>
  );
};
