import React, { useState } from 'react';
import {
  Type,
  RotateCcw,
  Eye,
  EyeOff,
  Sparkles,
  Search,
  Check,
  ChevronDown,
  ChevronUp,
  MoveVertical,
} from 'lucide-react';
import {
  PadCalibration,
  AVAILABLE_FONTS,
  LINE_DEFINITIONS,
  LineKey,
  LineFontConfig,
  getLineStyle,
  savePadSettings,
} from '../services/padService';
import { MrzLine } from './MrzRenderer';

interface LineFontManagerProps {
  calibration: PadCalibration;
  onCalibrationChange: (cal: PadCalibration) => void;
  onSavePermanently?: () => void;
  defaultDocFont?: string;
}

export const LineFontManager: React.FC<LineFontManagerProps> = ({
  calibration,
  onCalibrationChange,
  onSavePermanently,
  defaultDocFont = 'Myanmar Text',
}) => {
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedCategory, setSelectedCategory] = useState<string>('all');
  const [expandedKey, setExpandedKey] = useState<LineKey | null>(null);

  const lineStyles = calibration.lineStyles || {};
  const nameLineSpacing = calibration.nameLineSpacing || 0;

  const handleUpdateNameSpacing = (newVal: number) => {
    const clamped = Math.max(-25, Math.min(50, newVal));
    const nextCal = {
      ...calibration,
      nameLineSpacing: clamped,
    };
    onCalibrationChange(nextCal);
    savePadSettings({ calibration: nextCal });
    if (onSavePermanently) onSavePermanently();
  };

  const handleUpdateMrz = (updates: Partial<PadCalibration>) => {
    const nextCal = {
      ...calibration,
      ...updates,
    };
    onCalibrationChange(nextCal);
    savePadSettings({ calibration: nextCal });
    if (onSavePermanently) onSavePermanently();
  };

  const handleUpdateMrzStroke = (newVal: number) => {
    const clamped = Math.max(0, Math.min(0.40, Number(newVal.toFixed(2))));
    handleUpdateMrz({ mrzStrokeWidth: clamped });
  };

  const handleUpdateLine = (key: LineKey, updates: Partial<LineFontConfig>) => {
    const current = lineStyles[key] || {};
    const updatedLineStyles = {
      ...lineStyles,
      [key]: {
        ...current,
        ...updates,
      },
    };
    const nextCal = {
      ...calibration,
      lineStyles: updatedLineStyles,
    };
    onCalibrationChange(nextCal);
    savePadSettings({ calibration: nextCal });
    if (onSavePermanently) onSavePermanently();
  };

  const handleResetLine = (key: LineKey) => {
    const nextStyles = { ...lineStyles };
    delete nextStyles[key];
    const nextCal = {
      ...calibration,
      lineStyles: nextStyles,
    };
    onCalibrationChange(nextCal);
    savePadSettings({ calibration: nextCal });
    if (onSavePermanently) onSavePermanently();
  };

  const handleResetAllLines = () => {
    const ok = window.confirm('আপনি কি সব লাইনের ফন্ট সেটিংস ডিফল্ট মানে রিসেট করতে চান?');
    if (!ok) return;
    const nextCal = {
      ...calibration,
      lineStyles: {},
    };
    onCalibrationChange(nextCal);
    savePadSettings({ calibration: nextCal });
    if (onSavePermanently) onSavePermanently();
  };

  const filteredLines = LINE_DEFINITIONS.filter((item) => {
    const matchesSearch =
      item.labelBn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.labelEn.toLowerCase().includes(searchQuery.toLowerCase()) ||
      item.key.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesCategory = selectedCategory === 'all' || item.category === selectedCategory;
    return matchesSearch && matchesCategory;
  });

  const categories = [
    { id: 'all', label: 'সকল লাইন' },
    { id: 'primary', label: 'নম্বর ও তারিখ' },
    { id: 'passport', label: 'পাসপোর্ট ফিল্ড' },
    { id: 'name', label: 'নাম ও পরিচয়' },
    { id: 'details', label: 'অন্যান্য তথ্য' },
    { id: 'mrz', label: 'MRZ কোড' },
  ];

  return (
    <div className="space-y-4">
      {/* Informative Header Banner */}
      <div className="bg-gradient-to-r from-sky-50 via-indigo-50 to-purple-50 border border-sky-200 p-3 rounded-2xl flex items-start gap-2.5">
        <div className="w-8 h-8 rounded-xl bg-sky-600 text-white flex items-center justify-center shrink-0 shadow-xs">
          <Type className="w-4 h-4" />
        </div>
        <div className="text-xs text-sky-950 flex-1">
          <div className="flex items-center gap-1.5 font-bold text-sky-900">
            <span>লাইনভিত্তিক ফন্ট ও প্রিন্ট কাস্টমাইজার</span>
            <span className="bg-sky-200/80 text-sky-800 text-[10px] px-1.5 py-0.2 rounded-full font-mono">
              Individual Font Control
            </span>
          </div>
          <p className="text-[11px] text-sky-800/80 mt-0.5 leading-relaxed">
            এখানে প্রতিটা লাইনের জন্য আলাদাভাবে <strong>ফন্ট ফ্যামিলি (Font Family)</strong>,{' '}
            <strong>ফন্ট সাইজ (Size)</strong>, <strong>বোল্ডনেস (Bold/Normal)</strong> ও{' '}
            <strong>প্রিন্ট দৃশ্যমানতা (Print Toggle)</strong> পরিবর্তন করতে পারবেন।
          </p>
        </div>
      </div>

      {/* Filter and Search Bar */}
      <div className="flex flex-col sm:flex-row gap-2 items-center justify-between">
        <div className="relative w-full sm:w-64">
          <Search className="w-3.5 h-3.5 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="লাইন বা ফিল্ড খুঁজুন..."
            className="w-full pl-8 pr-3 py-1.5 bg-slate-50 border border-slate-200 focus:bg-white focus:border-sky-500 rounded-xl text-xs outline-none"
          />
        </div>

        <div className="flex items-center gap-1.5 overflow-x-auto w-full sm:w-auto pb-1 sm:pb-0">
          {categories.map((c) => (
            <button
              key={c.id}
              type="button"
              onClick={() => setSelectedCategory(c.id)}
              className={`px-2.5 py-1 rounded-lg text-[11px] font-semibold transition-all cursor-pointer whitespace-nowrap ${
                selectedCategory === c.id
                  ? 'bg-sky-600 text-white shadow-2xs'
                  : 'bg-slate-100 text-slate-600 hover:bg-slate-200'
              }`}
            >
              {c.label}
            </button>
          ))}
        </div>
      </div>

      {/* Action Header */}
      <div className="flex items-center justify-between text-xs border-b border-slate-200 pb-2">
        <span className="text-slate-500 font-medium">
          মোট {filteredLines.length} টি লাইনের ফন্ট নিয়ন্ত্রণ
        </span>
        <div className="flex items-center gap-2">
          {Object.keys(lineStyles).length > 0 && (
            <button
              type="button"
              onClick={handleResetAllLines}
              className="text-[11px] text-rose-600 hover:text-rose-700 font-semibold flex items-center gap-1 cursor-pointer"
            >
              <RotateCcw className="w-3 h-3" />
              <span>সব ফন্ট ডিফল্ট করুন</span>
            </button>
          )}
        </div>
      </div>

      {/* Name Line Spacing Quick Tool if viewing 'all' or 'name' */}
      {(selectedCategory === 'all' || selectedCategory === 'name') && !searchQuery && (
        <div className="bg-gradient-to-r from-sky-50 via-indigo-50 to-blue-50 border border-sky-200/90 rounded-xl p-3 shadow-2xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-indigo-600 animate-pulse" />
              <span>আরবি ও ইংরেজি নামের মাঝের স্পেস (Line Spacing)</span>
            </span>
            <div className="flex items-center gap-1.5">
              <span className="text-[11px] font-mono font-bold text-indigo-800 bg-white px-2 py-0.5 rounded border border-indigo-200">
                {nameLineSpacing > 0 ? `+${nameLineSpacing}` : nameLineSpacing} px
              </span>
              {nameLineSpacing !== 0 && (
                <button
                  type="button"
                  onClick={() => handleUpdateNameSpacing(0)}
                  className="text-[10px] text-slate-500 hover:text-rose-600 underline cursor-pointer"
                >
                  রিসেট
                </button>
              )}
            </div>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => handleUpdateNameSpacing(nameLineSpacing - 1)}
              className="w-7 h-7 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs shadow-2xs cursor-pointer select-none active:scale-95"
              title="১ পিক্সেল কমান"
            >
              -
            </button>
            <input
              type="range"
              min={-20}
              max={40}
              step={1}
              value={nameLineSpacing}
              onChange={(e) => handleUpdateNameSpacing(parseInt(e.target.value, 10))}
              className="flex-1 accent-indigo-600 h-1.5 cursor-pointer"
            />
            <button
              type="button"
              onClick={() => handleUpdateNameSpacing(nameLineSpacing + 1)}
              className="w-7 h-7 rounded-lg bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 text-xs shadow-2xs cursor-pointer select-none active:scale-95"
              title="১ পিক্সেল বাড়ান"
            >
              +
            </button>
          </div>
          <div className="flex flex-wrap items-center gap-1 pt-1 border-t border-indigo-100/70 text-[10px]">
            <span className="text-slate-500 font-medium">প্রিসেট:</span>
            {[
              { label: 'টাইট (-4px)', val: -4 },
              { label: 'ডিফল্ট (0px)', val: 0 },
              { label: 'সামান্য (+3px)', val: 3 },
              { label: 'মিডিয়াম (+6px)', val: 6 },
              { label: 'বেশি (+10px)', val: 10 },
              { label: 'প্রশস্ত (+16px)', val: 16 },
            ].map((p) => (
              <button
                key={p.val}
                type="button"
                onClick={() => handleUpdateNameSpacing(p.val)}
                className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                  nameLineSpacing === p.val
                    ? 'bg-indigo-600 text-white border-indigo-600'
                    : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                }`}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>
      )}

      {/* MRZ Full Control (Chevron Squash, Width, Stroke, Boldness) if viewing 'all' or 'mrz' */}
      {(selectedCategory === 'all' || selectedCategory === 'mrz') && !searchQuery && (
        <div className="bg-gradient-to-r from-emerald-50 via-teal-50 to-slate-50 border border-emerald-300 rounded-xl p-3.5 shadow-2xs space-y-3">
          <div className="flex items-center justify-between border-b border-emerald-200/80 pb-2">
            <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
              <span className="w-2.5 h-2.5 rounded-full bg-emerald-600 animate-pulse" />
              <span>MRZ চিহ্ন চেপাকরণ, স্ট্রোক ও বোল্ডনেস (Squash, Stroke & Boldness)</span>
            </span>
            <button
              type="button"
              onClick={() => handleUpdateMrz({
                mrzChevronScaleY: 0.75,
                mrzChevronScaleX: 1.0,
                mrzStrokeWidth: 0.22,
                mrzFontWeight: 'bold',
                mrzColor: '#222222',
                mrzOpacity: 0.92,
                mrz2BgdScale: 0.82,
              })}
              className="text-[10px] text-emerald-700 hover:text-emerald-900 underline font-semibold cursor-pointer"
            >
              ডিফল্ট রিসেট (০.৭৫x / ০.২২px / ৯২% ডার্ক / BGD ০.৮২x)
            </button>
          </div>

          {/* Quick Live Preview */}
          <div className="bg-white p-2.5 rounded-lg border border-emerald-200 overflow-x-auto flex flex-col items-center justify-center">
            <span className="text-[10px] text-slate-500 font-semibold mb-1 self-start">
              লাইভ প্রিভিউ (MRZ ১ম ও ২য় লাইন এবং BGD সাইজ):
            </span>
            <div className="py-0.5 flex flex-col gap-1.5 items-start">
              <MrzLine
                line="VHKWISLAM<<MD<ABDUL<GAFFAR<<<<<<<<<<<<<<"
                chevronScaleY={calibration.mrzChevronScaleY ?? 0.75}
                chevronScaleX={calibration.mrzChevronScaleX ?? 1.0}
                strokeWidth={calibration.mrzStrokeWidth ?? 0.22}
                fontWeight={calibration.mrzFontWeight ?? 'bold'}
                color={calibration.mrzColor}
                opacity={calibration.mrzOpacity}
              />
              <MrzLine
                line="2835517761BGD8802013M2609233373538093<<<<<<<<<<<<"
                isLine2={true}
                bgdScale={calibration.mrz2BgdScale ?? 0.82}
                chevronScaleY={calibration.mrzChevronScaleY ?? 0.75}
                chevronScaleX={calibration.mrzChevronScaleX ?? 1.0}
                strokeWidth={calibration.mrzStrokeWidth ?? 0.22}
                fontWeight={calibration.mrzFontWeight ?? 'bold'}
                color={calibration.mrzColor}
                opacity={calibration.mrzOpacity}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
            {/* 1. Chevron Squash (Scale Y) */}
            <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px]">১. চিহ্ন চেপা করা (Scale Y):</span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.2 rounded text-[11px]">
                  {(calibration.mrzChevronScaleY ?? 0.75).toFixed(2)}x
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateMrz({ mrzChevronScaleY: Math.max(0.4, Number(((calibration.mrzChevronScaleY ?? 0.75) - 0.05).toFixed(2))) })}
                  className="w-7 h-7 rounded bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 cursor-pointer text-xs"
                  title="আরও চেপা করুন"
                >
                  -
                </button>
                <input
                  type="range"
                  min={0.4}
                  max={1.4}
                  step={0.02}
                  value={calibration.mrzChevronScaleY ?? 0.75}
                  onChange={(e) => handleUpdateMrz({ mrzChevronScaleY: parseFloat(e.target.value) })}
                  className="flex-1 accent-emerald-600 h-1.5 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateMrz({ mrzChevronScaleY: Math.min(1.4, Number(((calibration.mrzChevronScaleY ?? 0.75) + 0.05).toFixed(2))) })}
                  className="w-7 h-7 rounded bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 cursor-pointer text-xs"
                  title="প্রসারিত করুন"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-1 pt-0.5 text-[10px]">
                {[
                  { label: '১.০০x', val: 1.0 },
                  { label: '০.৮৫x', val: 0.85 },
                  { label: '🔥 ০.৭৫x (চেপা)', val: 0.75 },
                  { label: '০.৬৫x', val: 0.65 },
                  { label: '০.৫০x', val: 0.5 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => handleUpdateMrz({ mrzChevronScaleY: p.val })}
                    className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                      Math.abs((calibration.mrzChevronScaleY ?? 0.75) - p.val) < 0.02
                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 2. Chevron Width (Scale X) */}
            <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px]">২. চিহ্নের প্রস্থ (Scale X):</span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.2 rounded text-[11px]">
                  {(calibration.mrzChevronScaleX ?? 1.0).toFixed(2)}x
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateMrz({ mrzChevronScaleX: Math.max(0.5, Number(((calibration.mrzChevronScaleX ?? 1.0) - 0.05).toFixed(2))) })}
                  className="w-7 h-7 rounded bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 cursor-pointer text-xs"
                  title="চিকন করুন"
                >
                  -
                </button>
                <input
                  type="range"
                  min={0.5}
                  max={1.4}
                  step={0.02}
                  value={calibration.mrzChevronScaleX ?? 1.0}
                  onChange={(e) => handleUpdateMrz({ mrzChevronScaleX: parseFloat(e.target.value) })}
                  className="flex-1 accent-emerald-600 h-1.5 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateMrz({ mrzChevronScaleX: Math.min(1.4, Number(((calibration.mrzChevronScaleX ?? 1.0) + 0.05).toFixed(2))) })}
                  className="w-7 h-7 rounded bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 cursor-pointer text-xs"
                  title="চওড়া করুন"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-1 pt-0.5 text-[10px]">
                {[
                  { label: '০.৮০x', val: 0.8 },
                  { label: '০.৯০x', val: 0.9 },
                  { label: '১.০০x (ডিফল্ট)', val: 1.0 },
                  { label: '১.১৫x', val: 1.15 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => handleUpdateMrz({ mrzChevronScaleX: p.val })}
                    className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                      Math.abs((calibration.mrzChevronScaleX ?? 1.0) - p.val) < 0.02
                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 3. Stroke Width */}
            <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px]">৩. স্ট্রোকের ঘনত্ব (Stroke):</span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.2 rounded text-[11px]">
                  {(calibration.mrzStrokeWidth ?? 0.22).toFixed(2)}px
                </span>
              </div>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateMrz({ mrzStrokeWidth: Math.max(0, Number(((calibration.mrzStrokeWidth ?? 0.22) - 0.02).toFixed(2))) })}
                  className="w-7 h-7 rounded bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 cursor-pointer text-xs"
                  title="স্ট্রোক কমান"
                >
                  -
                </button>
                <input
                  type="range"
                  min={0}
                  max={0.40}
                  step={0.01}
                  value={calibration.mrzStrokeWidth ?? 0.22}
                  onChange={(e) => handleUpdateMrz({ mrzStrokeWidth: parseFloat(e.target.value) })}
                  className="flex-1 accent-emerald-600 h-1.5 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateMrz({ mrzStrokeWidth: Math.min(0.40, Number(((calibration.mrzStrokeWidth ?? 0.22) + 0.02).toFixed(2))) })}
                  className="w-7 h-7 rounded bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 cursor-pointer text-xs"
                  title="স্ট্রোক বাড়ান"
                >
                  +
                </button>
              </div>
              <div className="flex flex-wrap gap-1 pt-0.5 text-[10px]">
                {[
                  { label: '০px (হালকা)', val: 0 },
                  { label: '০.০৮px', val: 0.08 },
                  { label: '০.১৬px', val: 0.16 },
                  { label: '🔥 ০.২২px (বোল্ড)', val: 0.22 },
                  { label: '০.৩০px (গাঢ়)', val: 0.30 },
                ].map((p) => (
                  <button
                    key={p.val}
                    type="button"
                    onClick={() => handleUpdateMrz({ mrzStrokeWidth: p.val })}
                    className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                      Math.abs((calibration.mrzStrokeWidth ?? 0.22) - p.val) < 0.02
                        ? 'bg-emerald-600 text-white border-emerald-600 font-bold'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    {p.label}
                  </button>
                ))}
              </div>
            </div>

            {/* 4. Font Weight */}
            <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px]">৪. ফন্ট বোল্ডনেস (Weight):</span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.2 rounded text-[11px]">
                  {String(calibration.mrzFontWeight) === '400' || calibration.mrzFontWeight === 'normal'
                    ? 'নরমাল'
                    : String(calibration.mrzFontWeight) === '600' || calibration.mrzFontWeight === 'medium'
                    ? 'মিডিয়াম'
                    : String(calibration.mrzFontWeight) === '900' || calibration.mrzFontWeight === 'extrabold'
                    ? 'এক্সট্রা'
                    : 'বোল্ড'}
                </span>
              </div>
              <div className="grid grid-cols-4 gap-1 pt-1">
                {[
                  { label: 'নরমাল', val: 'normal' },
                  { label: 'মিডিয়াম', val: 'medium' },
                  { label: '🔥 বোল্ড', val: 'bold' },
                  { label: 'এক্সট্রা', val: 'extrabold' },
                ].map((w) => {
                  const isActive =
                    w.val === 'bold'
                      ? (calibration.mrzFontWeight === 'bold' || String(calibration.mrzFontWeight) === '700' || !calibration.mrzFontWeight)
                      : (calibration.mrzFontWeight === w.val || (w.val === 'normal' && String(calibration.mrzFontWeight) === '400') || (w.val === 'medium' && String(calibration.mrzFontWeight) === '600') || (w.val === 'extrabold' && String(calibration.mrzFontWeight) === '900'));
                  return (
                    <button
                      key={w.val}
                      type="button"
                      onClick={() => handleUpdateMrz({ mrzFontWeight: w.val })}
                      className={`py-1 text-[11px] font-semibold rounded border transition-all cursor-pointer ${
                        isActive
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      {w.label}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 5. Color Tone & Lightness */}
            <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                  <span
                    className="w-2.5 h-2.5 rounded-full border border-slate-300"
                    style={{ backgroundColor: calibration.mrzColor || '#222222', opacity: calibration.mrzOpacity ?? 0.92 }}
                  />
                  <span>৫. কালার শেড ও লাইটনেস (MRZ Color & Tone):</span>
                </span>
                <div className="flex items-center gap-2">
                  <span className="font-mono font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.2 rounded text-[11px]">
                    {(calibration.mrzOpacity ?? 0.92) === 0.92 && (calibration.mrzColor || '#222222') === '#222222'
                      ? '🔥 ৯২% (সামান্য হালকা - ডিফল্ট)'
                      : `${Math.round((calibration.mrzOpacity ?? 0.92) * 100)}% ডার্কনেস (${calibration.mrzColor || '#222222'})`}
                  </span>
                  <div className="flex items-center gap-1 bg-white border border-slate-200 rounded px-1.5 py-0.5">
                    <input
                      type="color"
                      value={(calibration.mrzColor || '#222222').startsWith('#') ? (calibration.mrzColor || '#222222') : '#222222'}
                      onChange={(e) => handleUpdateMrz({ mrzColor: e.target.value })}
                      className="w-4 h-4 rounded cursor-pointer border-none bg-transparent"
                    />
                    <span className="text-[10px] font-mono text-slate-500">{calibration.mrzColor || '#222222'}</span>
                  </div>
                </div>
              </div>

              {/* Slider */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateMrz({ mrzOpacity: Math.max(0.50, Number(((calibration.mrzOpacity ?? 0.92) - 0.03).toFixed(2))) })}
                  className="w-7 h-7 rounded bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 cursor-pointer text-xs"
                  title="কালার আরও হালকা করুন"
                >
                  -
                </button>
                <input
                  type="range"
                  min={0.50}
                  max={1.00}
                  step={0.01}
                  value={calibration.mrzOpacity ?? 0.92}
                  onChange={(e) => handleUpdateMrz({ mrzOpacity: parseFloat(e.target.value) })}
                  className="flex-1 accent-emerald-600 h-1.5 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateMrz({ mrzOpacity: Math.min(1.00, Number(((calibration.mrzOpacity ?? 0.92) + 0.03).toFixed(2))) })}
                  className="w-7 h-7 rounded bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 cursor-pointer text-xs"
                  title="কালার আরও গাঢ় করুন"
                >
                  +
                </button>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1 pt-1 text-[10px]">
                <span className="text-slate-500 font-medium">প্রিসেট:</span>
                {[
                  { label: '১০০% গভীর কালো (#000000)', color: '#000000', opacity: 1.0 },
                  { label: '🔥 ৯২% সামান্য হালকা (#222222 - ডিফল্ট)', color: '#222222', opacity: 0.92 },
                  { label: '৮৫% চারকোল ব্ল্যাক (#2e2e2e)', color: '#2e2e2e', opacity: 0.85 },
                  { label: '৭৫% সফট ডার্ক গ্রে (#444444)', color: '#444444', opacity: 0.75 },
                  { label: '৬৫% হালকা ছাই (#555555)', color: '#555555', opacity: 0.65 },
                ].map((p) => {
                  const currentCol = calibration.mrzColor || '#222222';
                  const currentOp = calibration.mrzOpacity ?? 0.92;
                  const isSel = Math.abs(currentOp - p.opacity) < 0.02 && currentCol.toLowerCase() === p.color.toLowerCase();
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleUpdateMrz({ mrzColor: p.color, mrzOpacity: p.opacity })}
                      className={`px-2 py-0.5 rounded border transition-colors cursor-pointer flex items-center gap-1 ${
                        isSel
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                      }`}
                    >
                      <span className="w-2 h-2 rounded-full inline-block border border-black/20" style={{ backgroundColor: p.color, opacity: p.opacity }} />
                      <span>{p.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* 6. MRZ Line 2 BGD Size Control */}
            <div className="bg-white/80 p-2.5 rounded-lg border border-emerald-200 space-y-2 sm:col-span-2">
              <div className="flex items-center justify-between">
                <span className="font-bold text-slate-800 text-[11px] flex items-center gap-1.5">
                  <span className="w-2.5 h-2.5 rounded-full bg-emerald-700" />
                  <span>৬. ২য় লাইনে BGD অক্ষরের সাইজ (MRZ Line 2 BGD Size):</span>
                </span>
                <span className="font-mono font-bold text-emerald-800 bg-emerald-100/70 px-1.5 py-0.2 rounded text-[11px]">
                  {(calibration.mrz2BgdScale ?? 0.82) === 0.82
                    ? '🔥 ০.৮২x (৮২% ছোট - রেফারেন্স)'
                    : `${(calibration.mrz2BgdScale ?? 0.82).toFixed(2)}x (${Math.round((calibration.mrz2BgdScale ?? 0.82) * 100)}% সাইজ)`}
                </span>
              </div>

              {/* Slider */}
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => handleUpdateMrz({ mrz2BgdScale: Math.max(0.50, Number(((calibration.mrz2BgdScale ?? 0.82) - 0.03).toFixed(2))) })}
                  className="w-7 h-7 rounded bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 cursor-pointer text-xs"
                  title="BGD আরও ছোট করুন"
                >
                  -
                </button>
                <input
                  type="range"
                  min={0.50}
                  max={1.10}
                  step={0.01}
                  value={calibration.mrz2BgdScale ?? 0.82}
                  onChange={(e) => handleUpdateMrz({ mrz2BgdScale: parseFloat(e.target.value) })}
                  className="flex-1 accent-emerald-600 h-1.5 cursor-pointer"
                />
                <button
                  type="button"
                  onClick={() => handleUpdateMrz({ mrz2BgdScale: Math.min(1.10, Number(((calibration.mrz2BgdScale ?? 0.82) + 0.03).toFixed(2))) })}
                  className="w-7 h-7 rounded bg-white border border-slate-300 hover:bg-slate-100 flex items-center justify-center font-bold text-slate-700 cursor-pointer text-xs"
                  title="BGD বড় করুন"
                >
                  +
                </button>
              </div>

              {/* Presets */}
              <div className="flex flex-wrap items-center gap-1 pt-0.5 text-[10px]">
                <span className="text-slate-500 font-medium">প্রিসেট:</span>
                {[
                  { label: '🔥 ০.৮২x (পারফেক্ট ছোট - রেফারেন্স)', val: 0.82 },
                  { label: '০.৭৫x (আরও ছোট)', val: 0.75 },
                  { label: '০.৬৮x (মিনি)', val: 0.68 },
                  { label: '০.৮৮x (সামান্য ছোট)', val: 0.88 },
                  { label: '১.০০x (সমান সাইজ)', val: 1.0 },
                ].map((p) => {
                  const currentScale = calibration.mrz2BgdScale ?? 0.82;
                  const isSel = Math.abs(currentScale - p.val) < 0.015;
                  return (
                    <button
                      key={p.label}
                      type="button"
                      onClick={() => handleUpdateMrz({ mrz2BgdScale: p.val })}
                      className={`px-2 py-0.5 rounded border transition-colors cursor-pointer ${
                        isSel
                          ? 'bg-emerald-600 text-white border-emerald-600 font-bold shadow-2xs'
                          : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
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

      {/* Line Items List */}
      <div className="space-y-2.5 max-h-[52vh] overflow-y-auto pr-1">
        {filteredLines.map((def) => {
          const custom = lineStyles[def.key] || {};
          const isCustomized = Object.keys(custom).length > 0;
          const currentFont = custom.fontFamily || (def.arabicField ? 'Cairo' : def.defaultFontFamily || defaultDocFont);
          const currentSize = custom.fontSize !== undefined ? custom.fontSize : def.defaultFontSize + (calibration.fontSizeOffset || 0);
          const currentWeight = custom.fontWeight || def.defaultFontWeight;
          const currentSpacing = custom.letterSpacing || (def.category === 'mrz' ? '0.08em' : 'normal');
          const currentYOffset = custom.yOffset || 0;
          const currentXOffset = custom.xOffset || 0;
          const isVisible = custom.visible !== false;
          const isExpanded = expandedKey === def.key;

          const previewStyle = getLineStyle(def.key, calibration, defaultDocFont);

          return (
            <div
              key={def.key}
              className={`bg-white rounded-xl border transition-all shadow-2xs ${
                isCustomized
                  ? 'border-sky-300 ring-1 ring-sky-100'
                  : 'border-slate-200 hover:border-slate-300'
              }`}
            >
              {/* Card Header / Summary Row */}
              <div className="p-3 flex items-center justify-between gap-3">
                <div className="flex items-center gap-2.5 min-w-0">
                  <button
                    type="button"
                    onClick={() => handleUpdateLine(def.key, { visible: !isVisible })}
                    className={`p-1.5 rounded-lg transition-colors cursor-pointer shrink-0 ${
                      isVisible
                        ? 'text-sky-600 hover:bg-sky-50'
                        : 'text-slate-400 bg-slate-100 hover:bg-slate-200'
                    }`}
                    title={isVisible ? 'প্রিন্টে এই লাইনটি প্রিন্ট হবে (ক্লিক করলে হাইড হবে)' : 'এই লাইনটি প্রিন্ট হবে না (ক্লিক করলে শো হবে)'}
                  >
                    {isVisible ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4 text-amber-600" />}
                  </button>

                  <div className="truncate">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-slate-900 truncate">
                        {def.labelBn}
                      </span>
                      {isCustomized && (
                        <span className="text-[9px] bg-sky-100 text-sky-800 font-bold px-1.5 py-0.2 rounded font-mono shrink-0">
                          কাস্টম
                        </span>
                      )}
                    </div>
                    <div className="flex items-center gap-2 text-[10px] text-slate-500 mt-0.5">
                      <span className="font-semibold text-slate-700">{currentFont}</span>
                      <span>•</span>
                      <span className="font-mono font-bold text-sky-700">{currentSize}px</span>
                      <span>•</span>
                      <span>{currentWeight === 'bold' ? 'বোল্ড' : currentWeight === 'normal' ? 'নরমাল' : 'মোটা'}</span>
                      {currentYOffset !== 0 && (
                        <>
                          <span className="text-slate-300">•</span>
                          <span className="font-mono text-indigo-700 font-bold bg-indigo-50 px-1 rounded">
                            Y: {currentYOffset > 0 ? `+${currentYOffset}` : currentYOffset}px
                          </span>
                        </>
                      )}
                    </div>
                  </div>
                </div>

                {/* Right Quick Controls */}
                <div className="flex items-center gap-1.5 shrink-0">
                  {/* Quick Y-Offset Stepper (Up/Down) */}
                  <div
                    className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200"
                    title="এই লাইনের পজিশন উপরে/নিচে সরান (Y-Offset)"
                  >
                    <button
                      type="button"
                      onClick={() => handleUpdateLine(def.key, { yOffset: currentYOffset - 1 })}
                      className="w-6 h-6 rounded bg-white hover:bg-sky-50 active:bg-sky-100 font-bold text-slate-800 flex items-center justify-center text-xs cursor-pointer shadow-2xs select-none"
                      title="১ পিক্সেল উপরে তুলুন (-1px)"
                    >
                      ↑
                    </button>
                    <span
                      className={`text-[10px] font-mono font-bold min-w-[38px] text-center px-0.5 select-none ${
                        currentYOffset !== 0 ? 'text-indigo-700 font-extrabold' : 'text-slate-600'
                      }`}
                      title={`বর্তমান Y অফসেট: ${currentYOffset}px`}
                    >
                      {currentYOffset > 0 ? `+${currentYOffset}` : currentYOffset}px
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateLine(def.key, { yOffset: currentYOffset + 1 })}
                      className="w-6 h-6 rounded bg-white hover:bg-sky-50 active:bg-sky-100 font-bold text-slate-800 flex items-center justify-center text-xs cursor-pointer shadow-2xs select-none"
                      title="১ পিক্সেল নিচে নামান (+1px)"
                    >
                      ↓
                    </button>
                  </div>

                  {/* Quick Font Size Stepper */}
                  <div className="flex items-center bg-slate-100 rounded-lg p-0.5 border border-slate-200">
                    <button
                      type="button"
                      onClick={() => handleUpdateLine(def.key, { fontSize: Math.max(8, Number((currentSize - 0.5).toFixed(1))) })}
                      className="w-6 h-6 rounded bg-white hover:bg-slate-200 active:bg-slate-300 font-bold text-slate-800 flex items-center justify-center text-xs cursor-pointer shadow-2xs select-none"
                      title="ফন্ট সাইজ ০.৫ কমান"
                    >
                      -
                    </button>
                    <span className="text-[11px] font-mono font-bold text-slate-800 min-w-[36px] text-center px-1">
                      {currentSize}
                    </span>
                    <button
                      type="button"
                      onClick={() => handleUpdateLine(def.key, { fontSize: Math.min(36, Number((currentSize + 0.5).toFixed(1))) })}
                      className="w-6 h-6 rounded bg-white hover:bg-slate-200 active:bg-slate-300 font-bold text-slate-800 flex items-center justify-center text-xs cursor-pointer shadow-2xs select-none"
                      title="ফন্ট সাইজ ০.৫ বাড়ান"
                    >
                      +
                    </button>
                  </div>

                  {/* Expand / Customize Details */}
                  <button
                    type="button"
                    onClick={() => setExpandedKey(isExpanded ? null : def.key)}
                    className={`p-1.5 rounded-lg border transition-colors cursor-pointer ${
                      isExpanded
                        ? 'bg-sky-50 border-sky-300 text-sky-700'
                        : 'bg-white border-slate-200 text-slate-600 hover:bg-slate-50'
                    }`}
                    title="বিস্তারিত ফন্ট ও পজিশন সেটিংস খুলুন"
                  >
                    {isExpanded ? <ChevronUp className="w-4 h-4" /> : <ChevronDown className="w-4 h-4" />}
                  </button>
                </div>
              </div>

              {/* Live Mini Preview Bar */}
              <div className="px-3 pb-2 pt-0.5 flex items-center justify-between border-t border-slate-100 bg-slate-50/50 rounded-b-xl">
                <span className="text-[10px] text-slate-400">লাইভ ভিউ:</span>
                <span
                  style={previewStyle}
                  className="truncate max-w-[340px] text-slate-900 select-all"
                >
                  {def.key === 'visaNumber'
                    ? '354210309'
                    : def.key === 'referenceNumber'
                    ? '376554492'
                    : def.key === 'nameArabic'
                    ? 'محمد عبد الغفار محمد'
                    : def.key === 'nameEnglish'
                    ? 'MD ABDUL GAFFAR'
                    : def.key === 'mrzLine1'
                    ? 'VHKWISLAM<<MD<ABDUL<GAFFAR<<<<<<<<<<<<<<'
                    : def.key === 'mrzLine2'
                    ? '3527690440BGD8910200M2609153372711511<<<<<<<<'
                    : 'Sample Value 2026-09-15'}
                </span>
                {isCustomized && (
                  <button
                    type="button"
                    onClick={() => handleResetLine(def.key)}
                    className="text-[10px] text-slate-400 hover:text-rose-600 underline cursor-pointer ml-2 shrink-0"
                    title="এই লাইনের ফন্ট ডিফল্টে ফেরান"
                  >
                    রিসেট
                  </button>
                )}
              </div>

              {/* Expanded Detailed Settings Panel */}
              {isExpanded && (
                <div className="p-3 bg-slate-50 border-t border-slate-200 space-y-3 rounded-b-xl">
                  {/* Font Family Selector */}
                  <div>
                    <label className="text-[11px] font-bold text-slate-700 block mb-1">
                      ফন্ট ফ্যামিলি (Font Family):
                    </label>
                    <select
                      value={currentFont}
                      onChange={(e) => handleUpdateLine(def.key, { fontFamily: e.target.value })}
                      className="w-full bg-white border border-slate-300 rounded-lg px-2.5 py-1.5 text-xs font-semibold text-slate-900 focus:ring-1 focus:ring-sky-500 outline-none"
                    >
                      {AVAILABLE_FONTS.map((font) => (
                        <option key={font.id} value={font.id}>
                          {font.label}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Font Size & Weight Grid */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {/* Size Slider */}
                    <div>
                      <div className="flex items-center justify-between text-[11px] mb-1">
                        <span className="font-bold text-slate-700">ফন্ট সাইজ (px):</span>
                        <span className="font-mono font-bold text-sky-700 bg-sky-50 px-1.5 py-0.2 rounded border border-sky-200">
                          {currentSize} px
                        </span>
                      </div>
                      <input
                        type="range"
                        min={8}
                        max={34}
                        step={0.5}
                        value={currentSize}
                        onChange={(e) => handleUpdateLine(def.key, { fontSize: parseFloat(e.target.value) })}
                        className="w-full accent-sky-600 h-1.5 cursor-pointer"
                      />
                    </div>

                    {/* Font Weight */}
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block mb-1">
                        বোল্ডনেস (Weight):
                      </span>
                      <div className="grid grid-cols-3 gap-1">
                        {[
                          { id: 'normal', label: 'নরমাল' },
                          { id: 'bold', label: 'বোল্ড' },
                          { id: 'extrabold', label: 'মোটা' },
                        ].map((w) => (
                          <button
                            key={w.id}
                            type="button"
                            onClick={() => handleUpdateLine(def.key, { fontWeight: w.id })}
                            className={`py-1 text-[11px] font-semibold rounded-md border transition-all cursor-pointer ${
                              currentWeight === w.id
                                ? 'bg-sky-600 text-white border-sky-600 shadow-2xs'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {w.label}
                          </button>
                        ))}
                      </div>
                    </div>
                  </div>

                  {/* Letter Spacing & Color */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
                    <div>
                      <span className="text-[11px] font-bold text-slate-700 block mb-1">
                        অক্ষরের ফাঁক (Letter Spacing):
                      </span>
                      <div className="flex items-center gap-1">
                        {[
                          { id: 'normal', label: 'ডিফল্ট' },
                          { id: '0.04em', label: 'মিডিয়াম' },
                          { id: '0.08em', label: 'প্রশস্ত' },
                          { id: '0.12em', label: 'বেশি' },
                        ].map((sp) => (
                          <button
                            key={sp.id}
                            type="button"
                            onClick={() => handleUpdateLine(def.key, { letterSpacing: sp.id })}
                            className={`flex-1 py-1 text-[10px] font-semibold rounded-md border transition-all cursor-pointer ${
                              currentSpacing === sp.id
                                ? 'bg-sky-600 text-white border-sky-600'
                                : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                            }`}
                          >
                            {sp.label}
                          </button>
                        ))}
                      </div>
                    </div>

                    <div className="flex items-center justify-between pt-4 sm:pt-2">
                      <label className="flex items-center gap-2 cursor-pointer text-xs font-semibold text-slate-700">
                        <input
                          type="checkbox"
                          checked={isVisible}
                          onChange={(e) => handleUpdateLine(def.key, { visible: e.target.checked })}
                          className="rounded text-sky-600 focus:ring-sky-500"
                        />
                        <span>প্রিন্টে এই লাইনটি প্রদর্শন করুন</span>
                      </label>
                    </div>
                  </div>

                  {/* Individual Line Position Adjustment (Up/Down Y-Offset & Left/Right X-Offset) */}
                  <div className="bg-white p-3 rounded-xl border border-sky-200/90 shadow-2xs space-y-2.5 mt-2">
                    <div className="flex items-center justify-between border-b border-sky-100 pb-1.5">
                      <span className="text-[11px] font-bold text-slate-900 flex items-center gap-1.5">
                        <MoveVertical className="w-3.5 h-3.5 text-sky-600" />
                        <span>এই লাইনের নির্দিষ্ট পজিশন (উপরে / নিচে ও ডানে / বামে)</span>
                      </span>
                      {(currentYOffset !== 0 || currentXOffset !== 0) && (
                        <button
                          type="button"
                          onClick={() => handleUpdateLine(def.key, { yOffset: 0, xOffset: 0 })}
                          className="text-[10px] text-slate-500 hover:text-rose-600 underline font-semibold cursor-pointer"
                        >
                          পজিশন রিসেট (০px)
                        </button>
                      )}
                    </div>

                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 text-xs">
                      {/* Vertical Y-Offset (Up/Down) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700">১. উপরে / নিচে (Y-Offset):</span>
                          <span className={`font-mono font-bold px-1.5 py-0.2 rounded border text-[11px] ${
                            currentYOffset !== 0
                              ? 'text-indigo-800 bg-indigo-50 border-indigo-200'
                              : 'text-slate-700 bg-slate-50 border-slate-200'
                          }`}>
                            {currentYOffset > 0 ? `+${currentYOffset}` : currentYOffset} px
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateLine(def.key, { yOffset: Math.max(-60, currentYOffset - 1) })}
                            className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 active:bg-slate-300 font-bold text-slate-800 flex items-center justify-center text-xs cursor-pointer shadow-2xs select-none"
                            title="উপরে তুলুন (-1px)"
                          >
                            ↑
                          </button>
                          <input
                            type="range"
                            min={-60}
                            max={60}
                            step={1}
                            value={currentYOffset}
                            onChange={(e) => handleUpdateLine(def.key, { yOffset: parseInt(e.target.value, 10) || 0 })}
                            className="flex-1 accent-sky-600 h-1.5 cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateLine(def.key, { yOffset: Math.min(60, currentYOffset + 1) })}
                            className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 active:bg-slate-300 font-bold text-slate-800 flex items-center justify-center text-xs cursor-pointer shadow-2xs select-none"
                            title="নিচে নামান (+1px)"
                          >
                            ↓
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-0.5 text-[9px]">
                          {[
                            { label: '-8px উপরে', val: -8 },
                            { label: '-4px উপরে', val: -4 },
                            { label: '০px ডিফল্ট', val: 0 },
                            { label: '+4px নিচে', val: 4 },
                            { label: '+8px নিচে', val: 8 },
                          ].map((p) => (
                            <button
                              key={p.val}
                              type="button"
                              onClick={() => handleUpdateLine(def.key, { yOffset: p.val })}
                              className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                currentYOffset === p.val
                                  ? 'bg-sky-600 text-white border-sky-600 font-bold'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>

                      {/* Horizontal X-Offset (Left/Right) */}
                      <div className="space-y-1">
                        <div className="flex items-center justify-between text-[11px]">
                          <span className="font-semibold text-slate-700">২. ডানে / বামে (X-Offset):</span>
                          <span className={`font-mono font-bold px-1.5 py-0.2 rounded border text-[11px] ${
                            currentXOffset !== 0
                              ? 'text-indigo-800 bg-indigo-50 border-indigo-200'
                              : 'text-slate-700 bg-slate-50 border-slate-200'
                          }`}>
                            {currentXOffset > 0 ? `+${currentXOffset}` : currentXOffset} px
                          </span>
                        </div>
                        <div className="flex items-center gap-1.5">
                          <button
                            type="button"
                            onClick={() => handleUpdateLine(def.key, { xOffset: Math.max(-100, currentXOffset - 1) })}
                            className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 active:bg-slate-300 font-bold text-slate-800 flex items-center justify-center text-xs cursor-pointer shadow-2xs select-none"
                            title="বামে সরান (-1px)"
                          >
                            ←
                          </button>
                          <input
                            type="range"
                            min={-100}
                            max={100}
                            step={1}
                            value={currentXOffset}
                            onChange={(e) => handleUpdateLine(def.key, { xOffset: parseInt(e.target.value, 10) || 0 })}
                            className="flex-1 accent-sky-600 h-1.5 cursor-pointer"
                          />
                          <button
                            type="button"
                            onClick={() => handleUpdateLine(def.key, { xOffset: Math.min(100, currentXOffset + 1) })}
                            className="w-7 h-7 rounded bg-slate-100 hover:bg-slate-200 active:bg-slate-300 font-bold text-slate-800 flex items-center justify-center text-xs cursor-pointer shadow-2xs select-none"
                            title="ডানে সরান (+1px)"
                          >
                            →
                          </button>
                        </div>
                        <div className="flex flex-wrap gap-1 pt-0.5 text-[9px]">
                          {[
                            { label: '-10px বামে', val: -10 },
                            { label: '-4px বামে', val: -4 },
                            { label: '০px ডিফল্ট', val: 0 },
                            { label: '+4px ডানে', val: 4 },
                            { label: '+10px ডানে', val: 10 },
                          ].map((p) => (
                            <button
                              key={p.val}
                              type="button"
                              onClick={() => handleUpdateLine(def.key, { xOffset: p.val })}
                              className={`px-1.5 py-0.5 rounded border transition-colors cursor-pointer ${
                                currentXOffset === p.val
                                  ? 'bg-sky-600 text-white border-sky-600 font-bold'
                                  : 'bg-slate-50 text-slate-700 border-slate-200 hover:bg-slate-100'
                              }`}
                            >
                              {p.label}
                            </button>
                          ))}
                        </div>
                      </div>
                    </div>
                  </div>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {/* Bottom Save Reminder */}
      {onSavePermanently && (
        <div className="pt-2 flex justify-end">
          <button
            type="button"
            onClick={onSavePermanently}
            className="inline-flex items-center gap-1.5 px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow-md cursor-pointer transition-colors"
          >
            <Check className="w-4 h-4" />
            <span>সকল ফন্ট সেটিংস স্থায়ীভাবে সেভ করুন</span>
          </button>
        </div>
      )}
    </div>
  );
};
