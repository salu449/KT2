import React, { useRef, useState, useEffect } from 'react';
import {
  Upload,
  Image as ImageIcon,
  RotateCcw,
  Check,
  Eye,
  EyeOff,
  Trash2,
  X,
  FileCheck,
  Sparkles,
  Move,
  Save,
  Type,
} from 'lucide-react';
import {
  PadCalibration,
  defaultCalibration,
  savePadImage,
  removePadImage,
  savePadSettings,
} from '../services/padService';
import { padReferenceSampleData, imageReferenceSampleData } from '../utils/sampleData';
import { KuwaitEVisaData } from '../types';
import { LineFontManager } from './LineFontManager';

interface PadManagerModalProps {
  isOpen: boolean;
  onClose: () => void;
  padImageUrl: string | null;
  onPadImageChange: (url: string | null) => void;
  showPadBackground: boolean;
  onShowPadBackgroundChange: (show: boolean) => void;
  documentMode: 'pad' | 'full';
  onDocumentModeChange: (mode: 'pad' | 'full') => void;
  calibration: PadCalibration;
  onCalibrationChange: (cal: PadCalibration) => void;
  onLoadReferenceSample: (data: KuwaitEVisaData) => void;
  initialTab?: 'line_fonts' | 'individual' | 'global' | 'upload';
}

export const PadManagerModal: React.FC<PadManagerModalProps> = ({
  isOpen,
  onClose,
  padImageUrl,
  onPadImageChange,
  showPadBackground,
  onShowPadBackgroundChange,
  documentMode,
  onDocumentModeChange,
  calibration,
  onCalibrationChange,
  onLoadReferenceSample,
  initialTab = 'line_fonts',
}) => {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isDraggingFile, setIsDraggingFile] = useState(false);
  const [successToast, setSuccessToast] = useState<string | null>(null);
  const [isTranslucent, setIsTranslucent] = useState(false);
  const [activeTab, setActiveTab] = useState<'line_fonts' | 'individual' | 'global' | 'upload'>(initialTab);

  useEffect(() => {
    if (isOpen && initialTab) {
      setActiveTab(initialTab);
    }
  }, [isOpen, initialTab]);
  const [savedTime, setSavedTime] = useState<string | null>(() => {
    try {
      const s = localStorage.getItem('bitik_pad_settings_v1');
      return s ? 'সেভ করা হয়েছে' : null;
    } catch {
      return null;
    }
  });

  // Draggable window state
  const [modalPos, setModalPos] = useState<{ x: number; y: number } | null>(null);
  const [isDraggingModal, setIsDraggingModal] = useState(false);
  const modalContainerRef = useRef<HTMLDivElement>(null);
  const dragStartRef = useRef<{ startX: number; startY: number; initPosX: number; initPosY: number }>({
    startX: 0,
    startY: 0,
    initPosX: 0,
    initPosY: 0,
  });

  // Reset modal position to center if reopened or on resize
  useEffect(() => {
    if (isOpen && modalPos === null) {
      if (window.innerWidth > 1200) {
        setModalPos({
          x: Math.max(20, window.innerWidth - 620),
          y: 70,
        });
      }
    }
  }, [isOpen]);

  if (!isOpen) return null;

  const showNotification = (msg: string) => {
    setSuccessToast(msg);
    setTimeout(() => setSuccessToast(null), 3500);
  };

  // Drag modal with mouse handler
  const handlePointerDown = (e: React.PointerEvent) => {
    if (e.button !== 0) return;
    if ((e.target as HTMLElement).closest('button, input, a')) return;
    const rect = modalContainerRef.current?.getBoundingClientRect();
    if (!rect) return;

    setIsDraggingModal(true);
    dragStartRef.current = {
      startX: e.clientX,
      startY: e.clientY,
      initPosX: modalPos ? modalPos.x : rect.left,
      initPosY: modalPos ? modalPos.y : rect.top,
    };

    const handlePointerMove = (moveEvent: PointerEvent) => {
      const deltaX = moveEvent.clientX - dragStartRef.current.startX;
      const deltaY = moveEvent.clientY - dragStartRef.current.startY;
      const maxX = Math.max(10, window.innerWidth - 320);
      const maxY = Math.max(10, window.innerHeight - 120);
      const nextX = Math.max(10, Math.min(maxX, dragStartRef.current.initPosX + deltaX));
      const nextY = Math.max(10, Math.min(maxY, dragStartRef.current.initPosY + deltaY));
      setModalPos({ x: nextX, y: nextY });
    };

    const handlePointerUp = () => {
      setIsDraggingModal(false);
      window.removeEventListener('pointermove', handlePointerMove);
      window.removeEventListener('pointerup', handlePointerUp);
    };

    window.addEventListener('pointermove', handlePointerMove);
    window.addEventListener('pointerup', handlePointerUp);
  };

  const handleDock = (position: 'left' | 'center' | 'right') => {
    if (position === 'left') {
      setModalPos({ x: 20, y: 70 });
    } else if (position === 'right') {
      setModalPos({ x: Math.max(20, window.innerWidth - 620), y: 70 });
    } else {
      setModalPos(null);
    }
  };

  // File Upload
  const handleFileProcess = (file: File) => {
    if (!file.type.startsWith('image/')) {
      alert('অনুগ্রহ করে একটি ছবি ফাইল আপলোড করুন (JPG, PNG, WebP)');
      return;
    }
    const reader = new FileReader();
    reader.onload = (e) => {
      const result = e.target?.result as string;
      if (result) {
        savePadImage(result);
        onPadImageChange(result);
        onShowPadBackgroundChange(true);
        savePadSettings({ showPadBackground: true });
        showNotification('প্যাড ইমেজ সফলভাবে সেভ হয়েছে!');
      }
    };
    reader.readAsDataURL(file);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDraggingFile(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      handleFileProcess(e.dataTransfer.files[0]);
    }
  };

  const handleRemovePad = () => {
    const ok = window.confirm('আপনি কি নিশ্চিত প্যাড ইমেজটি রিমুভ করতে চান?');
    if (!ok) return;
    removePadImage();
    onPadImageChange(null);
    showNotification('প্যাড ইমেজ মুছে ফেলা হয়েছে');
  };

  // Update calibration helper
  const updateCalibration = (partial: Partial<PadCalibration>) => {
    const updated = {
      ...calibration,
      ...partial,
    };
    onCalibrationChange(updated);
    savePadSettings({ calibration: updated });
  };

  // Permanent explicit save button
  const handleSavePermanently = () => {
    savePadSettings({
      calibration,
      showPadBackground,
      documentMode,
    });
    const now = new Date();
    const timeStr = now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' });
    setSavedTime(`স্থায়ীভাবে সেভ করা হয়েছে (${timeStr})`);
    showNotification('সকল সেটিংস ও পজিশন সফলভাবে স্থায়ীভাবে সংরক্ষিত হয়েছে');
  };

  const handleResetCalibration = () => {
    const ok = window.confirm('আপনি কি সকল পজিশন ডিফল্ট মানে রিসেট করতে চান?');
    if (!ok) return;
    onCalibrationChange(defaultCalibration);
    savePadSettings({ calibration: defaultCalibration });
    showNotification('ডিফল্ট পজিশনে রিসেট করা হয়েছে');
  };

  // Slider control helper with direct number editing and wide ranges
  const renderSlider = (
    label: string,
    value: number,
    field: keyof PadCalibration,
    min = -60,
    max = 60,
    step = 1,
    unit = 'px'
  ) => {
    return (
      <div className="bg-white p-2.5 rounded-xl border border-slate-200/80 shadow-2xs hover:border-sky-300 transition-colors">
        <div className="flex items-center justify-between text-xs mb-1.5">
          <span className="text-slate-700 font-semibold flex items-center gap-1">
            <span>{label}</span>
          </span>
          <div className="flex items-center gap-1.5">
            <div className="flex items-center bg-sky-50 border border-sky-200 rounded px-1.5 py-0.5" title="সরাসরি মান লিখে দিন">
              <input
                type="number"
                min={min}
                max={max}
                step={step}
                value={value}
                onChange={(e) => {
                  const val = parseFloat(e.target.value);
                  updateCalibration({ [field]: isNaN(val) ? 0 : val });
                }}
                className="w-16 bg-transparent text-right font-mono font-bold text-sky-800 text-[11px] focus:outline-none"
              />
              <span className="font-mono text-sky-600 text-[10px] ml-0.5">{unit}</span>
            </div>
            {value !== 0 && (
              <button
                type="button"
                onClick={() => updateCalibration({ [field]: 0 })}
                className="text-[10px] text-slate-400 hover:text-slate-700 underline cursor-pointer"
                title="০ এ রিসেট করুন"
              >
                রিসেট
              </button>
            )}
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => updateCalibration({ [field]: Number((value - step).toFixed(2)) })}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold flex items-center justify-center text-xs cursor-pointer select-none"
            title="১ কমান"
          >
            -
          </button>
          <input
            type="range"
            min={min}
            max={max}
            step={step}
            value={value}
            onChange={(e) => updateCalibration({ [field]: parseFloat(e.target.value) })}
            className="flex-1 accent-sky-600 h-1.5 cursor-pointer"
          />
          <button
            type="button"
            onClick={() => updateCalibration({ [field]: Number((value + step).toFixed(2)) })}
            className="w-7 h-7 rounded-lg bg-slate-100 hover:bg-slate-200 active:bg-slate-300 text-slate-800 font-bold flex items-center justify-center text-xs cursor-pointer select-none"
            title="১ বাড়ান"
          >
            +
          </button>
        </div>
      </div>
    );
  };

  return (
    <div
      className={`fixed inset-0 z-50 transition-colors ${
        isTranslucent
          ? 'bg-black/10 backdrop-blur-none pointer-events-none'
          : 'bg-black/40 backdrop-blur-2xs'
      } flex items-center justify-center p-2 sm:p-4 overflow-y-auto`}
    >
      <div
        ref={modalContainerRef}
        style={
          modalPos
            ? {
                position: 'fixed',
                left: `${modalPos.x}px`,
                top: `${modalPos.y}px`,
                margin: 0,
              }
            : undefined
        }
        className={`bg-white rounded-2xl shadow-2xl max-w-xl w-full border border-slate-300 overflow-hidden flex flex-col pointer-events-auto transition-shadow ${
          isDraggingModal ? 'shadow-sky-500/30 ring-2 ring-sky-500 cursor-grabbing' : ''
        } ${isTranslucent ? 'opacity-92' : 'opacity-100'}`}
      >
        {/* ================= HEADER (DRAGGABLE HANDLE) ================= */}
        <div
          onPointerDown={handlePointerDown}
          className="bg-gradient-to-r from-slate-900 via-sky-950 to-slate-900 text-white px-4 py-3 flex items-center justify-between select-none cursor-grab active:cursor-grabbing border-b border-sky-900/50"
          title="ড্র্যাগ করে স্ক্রিনের যেকোনো জায়গায় সরান"
        >
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-sky-500/20 border border-sky-400/30 flex items-center justify-center text-sky-400 shrink-0">
              <Move className="w-4 h-4" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h2 className="text-sm font-bold tracking-tight">
                  প্যাড প্রিন্টিং ক্যালিবারেশন
                </h2>
                <span className="text-[10px] px-1.5 py-0.5 rounded bg-sky-500/30 text-sky-200 border border-sky-400/30 font-mono">
                  ড্র্যাগেবল
                </span>
              </div>
              <p className="text-[11px] text-sky-200/80">
                ফাঁকা প্যাডে হুবহু সঠিক জায়গায় প্রিন্ট করার ফাইন এডজাস্টমেন্ট
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1">
            {/* Translucent / See-through Toggle */}
            <button
              type="button"
              onClick={() => setIsTranslucent(!isTranslucent)}
              className={`p-1.5 rounded-lg transition-colors cursor-pointer text-xs flex items-center gap-1 ${
                isTranslucent
                  ? 'bg-amber-400 text-slate-950 font-bold'
                  : 'text-slate-300 hover:text-white hover:bg-white/10'
              }`}
              title={isTranslucent ? 'স্বচ্ছ মোড বন্ধ করুন' : 'স্বচ্ছ মোড চালু করুন (পেছনের ডকুমেন্ট দেখতে)'}
            >
              {isTranslucent ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>

            {/* Dock buttons */}
            <button
              type="button"
              onClick={() => handleDock('left')}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg text-xs hidden sm:block cursor-pointer"
              title="বামে ডক করুন"
            >
              বামে
            </button>
            <button
              type="button"
              onClick={() => handleDock('center')}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg text-xs hidden sm:block cursor-pointer"
              title="মাঝখানে আনুন"
            >
              মাঝে
            </button>
            <button
              type="button"
              onClick={() => handleDock('right')}
              className="p-1.5 text-slate-300 hover:text-white hover:bg-white/10 rounded-lg text-xs hidden sm:block cursor-pointer"
              title="ডানে ডক করুন"
            >
              ডানে
            </button>

            {/* Close */}
            <button
              type="button"
              onClick={onClose}
              className="p-1.5 text-slate-400 hover:text-white rounded-lg hover:bg-white/10 transition-colors cursor-pointer"
              title="বন্ধ করুন"
            >
              <X className="w-5 h-5" />
            </button>
          </div>
        </div>

        {/* ================= PERMANENT SAVE STATUS BAR ================= */}
        <div className="bg-emerald-950 text-white px-4 py-2 border-b border-emerald-800 flex items-center justify-between gap-2 text-xs">
          <div className="flex items-center gap-1.5 text-emerald-200 font-medium">
            <Check className="w-4 h-4 text-emerald-400 shrink-0" />
            <span className="truncate">
              {savedTime
                ? `${savedTime} • রিফ্রেশ বা রিলোড করলেও একই থাকবে`
                : 'সকল পরিবর্তন ব্রাউজারে স্বয়ংক্রিয় সেভ হচ্ছে'}
            </span>
          </div>
          <button
            type="button"
            onClick={handleSavePermanently}
            className="inline-flex items-center gap-1.5 px-3 py-1 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold rounded-lg shadow-xs text-xs transition-colors shrink-0 cursor-pointer"
          >
            <Save className="w-3.5 h-3.5" />
            <span>স্থায়ীভাবে সেভ</span>
          </button>
        </div>

        {/* ================= TABS ================= */}
        <div className="flex border-b border-slate-200 bg-slate-50 text-xs font-bold overflow-x-auto">
          <button
            type="button"
            onClick={() => setActiveTab('line_fonts')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 transition-colors cursor-pointer whitespace-nowrap flex items-center justify-center gap-1.5 ${
              activeTab === 'line_fonts'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            <Type className="w-3.5 h-3.5 text-sky-600" />
            <span>লাইনভিত্তিক ফন্ট</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('individual')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'individual'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            ফিল্ডভিত্তিক পজিশন
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('global')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'global'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            সামগ্রিক অফসেট ও ডেমো
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('upload')}
            className={`flex-1 py-2.5 px-3 text-center border-b-2 transition-colors cursor-pointer whitespace-nowrap ${
              activeTab === 'upload'
                ? 'border-sky-600 text-sky-700 bg-white'
                : 'border-transparent text-slate-600 hover:text-slate-900'
            }`}
          >
            প্যাড ইমেজ ও মোড
          </button>
        </div>

        {/* ================= CONTENT BODY ================= */}
        <div className="p-4 space-y-4 max-h-[68vh] overflow-y-auto">
          {/* Toast Notification */}
          {successToast && (
            <div className="bg-emerald-50 border border-emerald-300 text-emerald-800 text-xs px-3 py-2 rounded-xl flex items-center gap-2 font-medium animate-fadeIn">
              <Check className="w-4 h-4 text-emerald-600 shrink-0" />
              <span>{successToast}</span>
            </div>
          )}

          {/* TAB 0: LINE FONTS MANAGER */}
          {activeTab === 'line_fonts' && (
            <LineFontManager
              calibration={calibration}
              onCalibrationChange={(updated) => {
                onCalibrationChange(updated);
                savePadSettings({ calibration: updated });
              }}
              onSavePermanently={handleSavePermanently}
            />
          )}

          {/* TAB 1: INDIVIDUAL POSITION CONTROLS */}
          {activeTab === 'individual' && (
            <div className="space-y-4">
              <div className="bg-sky-50 border border-sky-200 p-2.5 rounded-xl text-[11px] text-sky-900 flex items-start gap-2">
                <Sparkles className="w-4 h-4 text-sky-600 shrink-0 mt-0.5" />
                <span>
                  প্রতিটি ফিল্ডের জন্য আলাদাভাবে <strong>X (ডানে-বামে)</strong> এবং{' '}
                  <strong>Y (উপরে-নিচে)</strong> অফসেট এডজাস্ট করুন।
                </span>
              </div>

              {/* 1. EXPIRY DATE CONTROLS */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-amber-500" />
                    <span>১. Expiry Date (মেয়াদ শেষ তারিখ)</span>
                  </span>
                  <span className="text-[11px] text-amber-700 font-bold bg-amber-50 px-2 py-0.5 rounded border border-amber-200">
                    বামে-ডানে ৩০০px রেঞ্জ
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {renderSlider(
                    'Expiry Date ডানে/বামে (X)',
                    calibration.expiryDateXOffset || 0,
                    'expiryDateXOffset',
                    -300,
                    300
                  )}
                  {renderSlider(
                    'Expiry Date উপরে/নিচে (Y)',
                    calibration.expiryDateYOffset || 0,
                    'expiryDateYOffset',
                    -100,
                    100
                  )}
                </div>
              </div>

              {/* 2. PASSPORT NUMBER CONTROLS */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-blue-500" />
                    <span>২. Passport No (পাসপোর্ট নম্বর)</span>
                  </span>
                  <span className="text-[11px] text-emerald-700 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200 font-medium">
                    সেন্টার্ড কলাম
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {renderSlider(
                    'Passport No ডানে/বামে (X)',
                    calibration.passportNoXOffset || 0,
                    'passportNoXOffset',
                    -150,
                    150
                  )}
                  {renderSlider(
                    'Passport No উপরে/নিচে (Y)',
                    calibration.passportNoYOffset || 0,
                    'passportNoYOffset',
                    -100,
                    100
                  )}
                </div>
              </div>

              {/* 3. PASSPORT ISSUE DATE (2023-06-07) CONTROLS */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-emerald-500" />
                    <span>৩. Passport Issue Date (যেমন: 2023-06-07)</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">YYYY-MM-DD</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {renderSlider(
                    'Issue Date ডানে/বামে (X)',
                    calibration.passportIssueDateXOffset || 0,
                    'passportIssueDateXOffset',
                    -150,
                    150
                  )}
                  {renderSlider(
                    'Issue Date উপরে/নিচে (Y)',
                    calibration.passportIssueDateYOffset || 0,
                    'passportIssueDateYOffset',
                    -100,
                    100
                  )}
                </div>
              </div>

              {/* 4. PASSPORT EXPIRY DATE (2033-06-06) CONTROLS */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-purple-500" />
                    <span>৪. Passport Expiry Date (যেমন: 2033-06-06)</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">YYYY-MM-DD</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {renderSlider(
                    'Expiry Date ডানে/বামে (X)',
                    calibration.passportExpiryDateXOffset || 0,
                    'passportExpiryDateXOffset',
                    -150,
                    150
                  )}
                  {renderSlider(
                    'Expiry Date উপরে/নিচে (Y)',
                    calibration.passportExpiryDateYOffset || 0,
                    'passportExpiryDateYOffset',
                    -100,
                    100
                  )}
                </div>
              </div>

              {/* 5. MRZ ZONE CONTROLS */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-rose-500" />
                    <span>৫. MRZ জোন (Orator Std & Chevron)</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">Image 4 Alignment</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {renderSlider(
                    'MRZ ডানে/বামে (X)',
                    calibration.mrzXOffset || 0,
                    'mrzXOffset',
                    -150,
                    150
                  )}
                  {renderSlider(
                    'MRZ উপরে/নিচে (Y)',
                    calibration.mrzYOffset || 0,
                    'mrzYOffset',
                    -100,
                    100
                  )}
                  {renderSlider(
                    'MRZ ফন্ট সাইজ (+/-)',
                    calibration.mrzFontSizeOffset || 0,
                    'mrzFontSizeOffset',
                    -6,
                    8,
                    0.5,
                    'pt'
                  )}
                  {renderSlider(
                    'MRZ < চ্যাপ্টাকরণ (Scale Y)',
                    calibration.mrzChevronScaleY ?? 0.75,
                    'mrzChevronScaleY',
                    0.4,
                    1.4,
                    0.02,
                    'x'
                  )}
                  {renderSlider(
                    'MRZ < চিহ্নের প্রস্থ (Scale X)',
                    calibration.mrzChevronScaleX ?? 1.0,
                    'mrzChevronScaleX',
                    0.5,
                    1.4,
                    0.02,
                    'x'
                  )}
                  {renderSlider(
                    'MRZ স্ট্রোক ঘনত্ব (Stroke px)',
                    calibration.mrzStrokeWidth ?? 0.22,
                    'mrzStrokeWidth',
                    0,
                    0.40,
                    0.01,
                    'px'
                  )}
                  {renderSlider(
                    'MRZ কালার হালকা/গাঢ় (Tone / Opacity)',
                    calibration.mrzOpacity ?? 0.92,
                    'mrzOpacity',
                    0.50,
                    1.00,
                    0.01,
                    'x'
                  )}
                </div>
              </div>

              {/* 6. NAME & RIGHT COLUMN CONTROLS */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-indigo-500" />
                    <span>৬. নাম ও ডান কলাম অফসেট</span>
                  </span>
                  <span className="text-[11px] text-slate-500 font-mono">Image 3 Alignment</span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {renderSlider(
                    'দুই নামের মাঝের স্পেস (Line Spacing)',
                    calibration.nameLineSpacing || 0,
                    'nameLineSpacing',
                    -30,
                    60,
                    1,
                    'px'
                  )}
                  {renderSlider(
                    'নাম ডানে/বামে (X)',
                    calibration.nameXOffset || 0,
                    'nameXOffset',
                    -150,
                    150
                  )}
                  {renderSlider(
                    'নাম উপরে/নিচে (সামগ্রিক Y)',
                    calibration.nameYOffset || 0,
                    'nameYOffset',
                    -100,
                    100
                  )}
                  {renderSlider(
                    'আরবি নাম উপরে/নিচে (Y)',
                    calibration.nameArabicYOffset || 0,
                    'nameArabicYOffset',
                    -60,
                    60
                  )}
                  {renderSlider(
                    'ইংরেজি নাম উপরে/নিচে (Y)',
                    calibration.nameEnglishYOffset || 0,
                    'nameEnglishYOffset',
                    -60,
                    60
                  )}
                  {renderSlider(
                    'ডান কলাম মার্জিন',
                    calibration.rightColumnOffset || 0,
                    'rightColumnOffset',
                    -150,
                    150
                  )}
                  {renderSlider(
                    'পাসপোর্ট কলাম সেন্টারিং (X)',
                    calibration.passportCenterXOffset || 0,
                    'passportCenterXOffset',
                    -150,
                    150
                  )}
                </div>
              </div>

              {/* 7. INDIVIDUAL RIGHT COLUMN DATA FIELDS & MRZ LINES */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2.5">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-slate-900 flex items-center gap-1.5">
                    <span className="w-2 h-2 rounded-full bg-cyan-500" />
                    <span>৭. ডান কলামের নির্দিষ্ট লাইনসমূহ (Visa No, Issue Date, Reference, Birth Date)</span>
                  </span>
                  <span className="text-[11px] text-cyan-700 bg-cyan-50 px-2 py-0.5 rounded border border-cyan-200 font-medium">
                    আলাদা আলাদা উপর/নিচ
                  </span>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {renderSlider(
                    'Visa Number উপরে/নিচে (Y)',
                    calibration.visaNumberYOffset || 0,
                    'visaNumberYOffset',
                    -60,
                    60
                  )}
                  {renderSlider(
                    'Visa Number ডানে/বামে (X)',
                    calibration.visaNumberXOffset || 0,
                    'visaNumberXOffset',
                    -100,
                    100
                  )}
                  {renderSlider(
                    'Issue Date উপরে/নিচে (Y)',
                    calibration.issueDateYOffset || 0,
                    'issueDateYOffset',
                    -60,
                    60
                  )}
                  {renderSlider(
                    'Issue Date ডানে/বামে (X)',
                    calibration.issueDateXOffset || 0,
                    'issueDateXOffset',
                    -100,
                    100
                  )}
                  {renderSlider(
                    'Reference No. উপরে/নিচে (Y)',
                    calibration.referenceNumberYOffset || 0,
                    'referenceNumberYOffset',
                    -60,
                    60
                  )}
                  {renderSlider(
                    'Reference No. ডানে/বামে (X)',
                    calibration.referenceNumberXOffset || 0,
                    'referenceNumberXOffset',
                    -100,
                    100
                  )}
                  {renderSlider(
                    'Birth Date উপরে/নিচে (Y)',
                    calibration.birthDateYOffset || 0,
                    'birthDateYOffset',
                    -60,
                    60
                  )}
                  {renderSlider(
                    'Birth Date ডানে/বামে (X)',
                    calibration.birthDateXOffset || 0,
                    'birthDateXOffset',
                    -100,
                    100
                  )}
                  {renderSlider(
                    'MRZ লাইন ১ উপরে/নিচে (Y)',
                    calibration.mrzLine1YOffset || 0,
                    'mrzLine1YOffset',
                    -40,
                    40
                  )}
                  {renderSlider(
                    'MRZ লাইন ২ উপরে/নিচে (Y)',
                    calibration.mrzLine2YOffset || 0,
                    'mrzLine2YOffset',
                    -40,
                    40
                  )}
                </div>
              </div>
            </div>
          )}

          {/* TAB 2: GLOBAL OFFSET & SCALE */}
          {activeTab === 'global' && (
            <div className="space-y-4">
              <div className="bg-slate-50 border border-slate-200 p-4 rounded-xl space-y-3">
                <span className="text-xs font-bold text-slate-800 block">
                  সকল ফিল্ডের সামগ্রিক অফসেট (Global Offsets):
                </span>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {renderSlider(
                    'সামগ্রিক X (ডানে/বামে)',
                    calibration.offsetX || 0,
                    'offsetX',
                    -50,
                    50
                  )}
                  {renderSlider(
                    'সামগ্রিক Y (উপরে/নিচে)',
                    calibration.offsetY || 0,
                    'offsetY',
                    -50,
                    50
                  )}
                  {renderSlider(
                    'সামগ্রিক ফন্ট সাইজ (Font Size)',
                    calibration.fontSizeOffset || 0,
                    'fontSizeOffset',
                    -5,
                    5,
                    0.5,
                    'pt'
                  )}
                  {renderSlider(
                    'সামগ্রিক স্কেল (Scale)',
                    calibration.scale || 1.0,
                    'scale',
                    0.85,
                    1.15,
                    0.01,
                    'x'
                  )}
                </div>
              </div>

              {/* Quick Sample Data Buttons */}
              <div className="space-y-2">
                <span className="text-xs font-bold text-slate-700 block">
                  রেফারেন্স স্যাম্পল লোড করুন:
                </span>
                <div className="bg-sky-50 border border-sky-200 p-3 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-sky-900 block">
                      MD ABDUL GAFFAR (ছবি রেফারেন্স)
                    </span>
                    <span className="text-[11px] text-sky-700 block mt-0.5">
                      পাসপোর্ট A07980174, মেয়াদ 2027-01-14 ও Orator Std MRZ
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onLoadReferenceSample(imageReferenceSampleData);
                      onDocumentModeChange('pad');
                      showNotification('রেফারেন্স স্যাম্পল লোড হয়েছে!');
                    }}
                    className="px-3 py-1.5 bg-sky-600 hover:bg-sky-700 text-white text-xs font-bold rounded-lg shrink-0 cursor-pointer"
                  >
                    লোড করুন
                  </button>
                </div>

                <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl flex items-center justify-between gap-3">
                  <div>
                    <span className="text-xs font-bold text-slate-800 block">
                      MD TOFAZZAL HOSSAN (0000.jpg রেফারেন্স)
                    </span>
                    <span className="text-[11px] text-slate-500 block mt-0.5">
                      অরিজিনাল কুয়েত প্যাড 0000.jpg স্যাম্পল ডেটা
                    </span>
                  </div>
                  <button
                    type="button"
                    onClick={() => {
                      onLoadReferenceSample(padReferenceSampleData);
                      onDocumentModeChange('pad');
                      showNotification('0000.jpg স্যাম্পল লোড হয়েছে!');
                    }}
                    className="px-3 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 text-xs font-semibold rounded-lg shrink-0 cursor-pointer"
                  >
                    লোড করুন
                  </button>
                </div>
              </div>

              {/* Reset to Factory Default */}
              <div className="pt-2 flex justify-between items-center text-xs">
                <span className="text-slate-500">পজিশন সমস্যা হলে:</span>
                <button
                  type="button"
                  onClick={handleResetCalibration}
                  className="px-3 py-1.5 text-rose-600 hover:bg-rose-50 border border-rose-200 rounded-lg font-semibold flex items-center gap-1 cursor-pointer transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>ডিফল্ট রিসেট</span>
                </button>
              </div>
            </div>
          )}

          {/* TAB 3: PAD BACKGROUND & UPLOAD */}
          {activeTab === 'upload' && (
            <div className="space-y-4">
              {/* Mode Selection */}
              <div className="bg-slate-50 border border-slate-200 p-3 rounded-xl space-y-2">
                <label className="text-xs font-bold text-slate-800 block">
                  ডকুমেন্ট ডিসপ্লে মোড
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      onDocumentModeChange('pad');
                      savePadSettings({ documentMode: 'pad' });
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border text-left cursor-pointer flex flex-col gap-0.5 ${
                      documentMode === 'pad'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <FileCheck className="w-4 h-4" />
                      <span>প্যাড মোড (হেডিং ছাড়া)</span>
                    </span>
                    <span className={`text-[10px] ${documentMode === 'pad' ? 'text-sky-100' : 'text-slate-500'}`}>
                      ফাঁকা প্যাডে প্রিন্ট করার জন্য
                    </span>
                  </button>

                  <button
                    type="button"
                    onClick={() => {
                      onDocumentModeChange('full');
                      savePadSettings({ documentMode: 'full' });
                    }}
                    className={`px-3 py-2.5 rounded-xl text-xs font-bold transition-all border text-left cursor-pointer flex flex-col gap-0.5 ${
                      documentMode === 'full'
                        ? 'bg-sky-600 text-white border-sky-600 shadow-sm'
                        : 'bg-white text-slate-700 border-slate-200 hover:bg-slate-100'
                    }`}
                  >
                    <span className="flex items-center gap-1.5">
                      <ImageIcon className="w-4 h-4" />
                      <span>ফুল অফিসিয়াল মোড</span>
                    </span>
                    <span className={`text-[10px] ${documentMode === 'full' ? 'text-sky-100' : 'text-slate-500'}`}>
                      হেডিং ও বক্স সহ পূর্ণাঙ্গ রূপ
                    </span>
                  </button>
                </div>
              </div>

              {/* Pad Background Upload */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="text-xs font-bold text-slate-800 flex items-center gap-1.5">
                    <Upload className="w-4 h-4 text-sky-600" />
                    <span>প্যাড ব্যাকগ্রাউন্ড (Letterhead) ইমেজ:</span>
                  </label>
                  {padImageUrl && (
                    <button
                      type="button"
                      onClick={handleRemovePad}
                      className="text-rose-600 hover:text-rose-700 text-xs font-semibold flex items-center gap-1 cursor-pointer"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                      <span>রিমুভ</span>
                    </button>
                  )}
                </div>

                <input
                  type="file"
                  ref={fileInputRef}
                  accept="image/*"
                  className="hidden"
                  onChange={(e) => {
                    if (e.target.files && e.target.files[0]) {
                      handleFileProcess(e.target.files[0]);
                    }
                  }}
                />

                <div
                  onDragOver={(e) => {
                    e.preventDefault();
                    setIsDraggingFile(true);
                  }}
                  onDragLeave={() => setIsDraggingFile(false)}
                  onDrop={handleDrop}
                  onClick={() => fileInputRef.current?.click()}
                  className={`border-2 border-dashed rounded-2xl p-5 text-center cursor-pointer transition-all ${
                    isDraggingFile
                      ? 'border-sky-500 bg-sky-50/70'
                      : padImageUrl
                      ? 'border-emerald-300 bg-emerald-50/30 hover:bg-emerald-50/50'
                      : 'border-slate-300 bg-slate-50/60 hover:bg-slate-100/70'
                  }`}
                >
                  {padImageUrl ? (
                    <div className="flex flex-col items-center gap-2">
                      <div className="w-16 h-20 border border-slate-300 rounded shadow-md overflow-hidden bg-white relative">
                        <img
                          src={padImageUrl}
                          alt="Uploaded Pad Preview"
                          className="w-full h-full object-cover"
                        />
                      </div>
                      <span className="text-xs font-bold text-emerald-800">
                        প্যাড ইমেজ সংরক্ষিত আছে
                      </span>
                      <span className="text-[11px] text-slate-500">
                        নতুন প্যাড দিতে এখানে ক্লিক করুন
                      </span>
                    </div>
                  ) : (
                    <div className="flex flex-col items-center gap-2 py-4">
                      <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-600 flex items-center justify-center">
                        <Upload className="w-6 h-6" />
                      </div>
                      <span className="text-xs font-bold text-slate-800">
                        এখানে ফাঁকা প্যাডের স্ক্যান কপি দিন
                      </span>
                      <span className="text-[11px] text-slate-500">
                        A4 সাইজের ছবি (JPG, PNG, WebP)
                      </span>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* ================= FOOTER ================= */}
        <div className="bg-slate-50 border-t border-slate-200 px-4 py-3 flex items-center justify-between gap-3">
          <div className="text-[11px] text-slate-500 hidden sm:block">
            সকল এডজাস্টমেন্ট তাৎক্ষণিকভাবে কার্যকর হয়
          </div>
          <div className="flex items-center gap-2 ml-auto">
            <button
              type="button"
              onClick={handleSavePermanently}
              className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-colors flex items-center gap-1.5"
            >
              <Save className="w-4 h-4" />
              <span>সেভ করুন</span>
            </button>
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold rounded-xl shadow-md cursor-pointer transition-colors"
            >
              সম্পন্ন
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};
