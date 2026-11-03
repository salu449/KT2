import React, { useRef, useState } from 'react';
import { UploadCloud, FileText, Sparkles, AlertCircle, RefreshCw, CheckCircle2, Image as ImageIcon } from 'lucide-react';
import { ExtractionState, PassportData } from '../types';
import { extractPassportFromAPI, fileToBase64, optimizeImageFile } from '../services/apiPassportExtractor';
import { extractPassportProgrammatically } from '../services/programmaticPassportExtractor';

interface UploaderProps {
  extractionState: ExtractionState;
  onExtractSuccess: (data: PassportData, previewUrl: string, fileName: string) => void;
  onExtractStart: (fileName: string, previewUrl: string) => void;
  onExtractError: (errorMsg: string) => void;
  onLoadSample: () => void;
}

export const PassportUploader: React.FC<UploaderProps> = ({
  extractionState,
  onExtractSuccess,
  onExtractStart,
  onExtractError,
  onLoadSample,
}) => {
  const [isDragOver, setIsDragOver] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const processFile = async (file: File) => {
    if (!file) return;

    const isPdf = file.type === 'application/pdf' || file.name.toLowerCase().endsWith('.pdf');
    const isImage = file.type.startsWith('image/') || /\.(jpe?g|png|webp|bmp)$/i.test(file.name);

    if (!isPdf && !isImage) {
      onExtractError('অনুগ্রহ করে একটি বৈধ PDF অথবা ইমেজ ফাইল (JPG, PNG) আপলোড করুন');
      return;
    }

    if (file.size > 20 * 1024 * 1024) {
      onExtractError('ফাইলের আকার অনেক বড় (সর্বোচ্চ ২০MB)। অনুগ্রহ করে ছোট বা কম্প্রেস করা ফাইল আপলোড করুন।');
      return;
    }

    try {
      const isPdfFile = isPdf;
      const base64Data = isPdfFile ? await fileToBase64(file) : await optimizeImageFile(file);
      onExtractStart(file.name, isPdfFile ? '' : base64Data);

      // Strategy:
      // 1. First attempt Server-Side High-Accuracy Extractor with Gemini 3.8 Flash
      // 2. If server API fails and it's an image, fallback to client-side OCR
      try {
        const passportData = await extractPassportFromAPI(file, base64Data);
        onExtractSuccess(passportData, base64Data, file.name);
        return;
      } catch (apiErr: any) {
        console.warn('API extraction attempt failed, trying local fallback if image:', apiErr);
        if (isImage) {
          try {
            const fallbackData = await extractPassportProgrammatically(file);
            onExtractSuccess(fallbackData, base64Data, file.name);
            return;
          } catch (localErr: any) {
            console.warn('Local OCR fallback also failed:', localErr);
          }
        }
        // Throw user-friendly message
        throw apiErr;
      }
    } catch (err: any) {
      console.error('Passport Process Error:', err);
      let errorMsg = err?.message || 'পাসপোর্ট ডেটা পড়তে ব্যর্থ হয়েছে।';
      if (errorMsg.includes('Failed to fetch') || errorMsg.includes('NetworkError')) {
        errorMsg = 'সার্ভার সংযোগে সমস্যা হয়েছে বা নেটওয়ার্ক দুর্বল। অনুগ্রহ করে পুনরায় চেষ্টা করুন।';
      } else if (errorMsg.includes('সময় বেশি লেগেছে') || errorMsg.includes('AbortError') || errorMsg.includes('aborted') || errorMsg.includes('signal is aborted')) {
        errorMsg = 'পাসপোর্ট প্রসেস করতে সময় বেশি লেগেছে। অনুগ্রহ করে পুনরায় চেষ্টা করুন অথবা সরাসরি ডেমো পাসপোর্ট লোড করুন।';
      }
      onExtractError(errorMsg);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragOver(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      processFile(e.target.files[0]);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-slate-200 shadow-xs p-5 mb-5">
      <div className="flex items-center justify-between mb-3">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-700 flex items-center justify-center font-bold">
            <UploadCloud className="w-5 h-5" />
          </div>
          <div>
            <h2 className="text-base font-bold text-slate-900 leading-tight">
              Passport Scanner & Auto-Extractor
            </h2>
            <p className="text-xs text-slate-500">
              PDF অথবা JPEG/PNG আপলোড করলেই নাম, পাসপোর্ট নম্বর ও জন্মতারিখ স্বয়ংক্রিয়ভাবে পূরণ হবে
            </p>
          </div>
        </div>

        {/* Quick Sample Button */}
        <button
          type="button"
          onClick={onLoadSample}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold text-sky-700 bg-sky-50 hover:bg-sky-100 rounded-lg border border-sky-200 transition-colors cursor-pointer"
        >
          <Sparkles className="w-3.5 h-3.5 text-amber-500" />
          <span>ডেমো ডেটা</span>
        </button>
      </div>

      {/* Drag & Drop Zone */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setIsDragOver(true);
        }}
        onDragLeave={() => setIsDragOver(false)}
        onDrop={handleDrop}
        onClick={() => fileInputRef.current?.click()}
        className={`relative border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all duration-200 ${
          isDragOver
            ? 'border-sky-500 bg-sky-50/50'
            : extractionState.isExtracting
            ? 'border-sky-500 bg-sky-50/30'
            : 'border-slate-300 hover:border-sky-400 hover:bg-slate-50/80 bg-slate-50/40'
        }`}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*,application/pdf,.pdf"
          className="hidden"
          onChange={handleFileInputChange}
        />

        {extractionState.isExtracting ? (
          <div className="flex flex-col items-center justify-center py-3">
            <RefreshCw className="w-9 h-9 text-sky-600 animate-spin mb-3" />
            <p className="text-sm font-bold text-slate-900">
              পাসপোর্ট বিশ্লেষণ ও ডেটা নিষ্কাশন হচ্ছে...
            </p>
            <p className="text-xs text-slate-500 mt-1">
              PDF এবং ইমেজ থেকে নাম, পিতার নাম ও অন্যান্য তথ্য অটো রিড করা হচ্ছে
            </p>
          </div>
        ) : extractionState.uploadedFileName && !extractionState.error ? (
          <div className="flex flex-col items-center justify-center py-2">
            <div className="flex items-center gap-2 text-emerald-600 font-bold text-sm mb-1">
              <CheckCircle2 className="w-5 h-5" />
              <span>পাসপোর্ট স্ক্যান সম্পন্ন হয়েছে</span>
            </div>
            <div className="flex items-center gap-2 text-xs font-mono text-slate-600 bg-white px-3 py-1 rounded-md border border-slate-200">
              <FileText className="w-3.5 h-3.5 text-slate-400" />
              <span>{extractionState.uploadedFileName}</span>
            </div>
            <p className="text-[11px] text-slate-400 mt-2">
              অন্য পাসপোর্ট আপলোড করতে ক্লিক করুন
            </p>
          </div>
        ) : (
          <div className="flex flex-col items-center justify-center py-3">
            <div className="w-12 h-12 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center mb-3">
              <ImageIcon className="w-6 h-6 text-sky-600" />
            </div>
            <p className="text-sm font-bold text-slate-800">
              এখানে পাসপোর্ট PDF অথবা ছবি (JPG / PNG) ড্র্যাগ বা সিলেক্ট করুন
            </p>
            <p className="text-xs text-slate-500 mt-1">
              বাংলাদেশি ও আন্তর্জাতিক সকল ই-পাসপোর্ট PDF ও স্ক্যান সাপোর্ট করে
            </p>
          </div>
        )}
      </div>

      {/* Error Display */}
      {extractionState.error && (
        <div className="mt-3 p-3.5 bg-rose-50 border border-rose-200 rounded-xl text-xs text-rose-900 shadow-2xs">
          <div className="flex items-start gap-2">
            <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
            <div className="flex-1">
              <span className="font-bold text-rose-800">সমস্যা হয়েছে: </span>
              {extractionState.error}
            </div>
          </div>
          <div className="mt-2.5 flex items-center gap-2 pl-6">
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              className="inline-flex items-center gap-1 px-3 py-1 bg-rose-600 hover:bg-rose-700 text-white font-semibold rounded-lg text-[11px] transition-colors cursor-pointer"
            >
              <RefreshCw className="w-3 h-3" />
              <span>পুনরায় আপলোড করুন</span>
            </button>
            <button
              type="button"
              onClick={onLoadSample}
              className="inline-flex items-center gap-1 px-3 py-1 bg-white hover:bg-rose-100/60 border border-rose-300 text-rose-800 font-semibold rounded-lg text-[11px] transition-colors cursor-pointer"
            >
              <Sparkles className="w-3 h-3 text-amber-500" />
              <span>ডেমো পাসপোর্ট লোড করুন</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
