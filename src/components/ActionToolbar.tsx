import React, { useState } from 'react';
import {
  Download,
  Printer,
  FileImage,
  ZoomIn,
  ZoomOut,
  Maximize2,
  RefreshCw,
  Sparkles,
  Check,
  Cloud,
  History,
  BookmarkPlus,
  Upload,
  Eye,
  EyeOff,
  Layers,
  Type,
} from 'lucide-react';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

interface ToolbarProps {
  documentRef: React.RefObject<HTMLDivElement | null>;
  zoom: number;
  onZoomIn: () => void;
  onZoomOut: () => void;
  onZoomReset: () => void;
  onGenerateNewNumbers?: () => void;
  visaNumber: string;
  applicantName: string;
  onOpenDriveModal: () => void;
  onOpenHistoryModal: () => void;
  onSaveCurrentRecord: () => void;
  isDriveConnected?: boolean;
  onOpenPadModal?: () => void;
  onOpenPadSettings?: () => void;
  showPadBackground?: boolean;
  onTogglePadBackground?: () => void;
  documentMode?: 'pad' | 'full';
  onToggleDocumentMode?: () => void;
  hasCustomPad?: boolean;
  padImageUrl?: string | null;
  onOpenLineFonts?: () => void;
}

export const ActionToolbar: React.FC<ToolbarProps> = ({
  documentRef,
  zoom,
  onZoomIn,
  onZoomOut,
  onZoomReset,
  onGenerateNewNumbers,
  visaNumber,
  applicantName,
  onOpenDriveModal,
  onOpenHistoryModal,
  onSaveCurrentRecord,
  isDriveConnected,
  onOpenPadModal,
  onOpenPadSettings,
  showPadBackground = true,
  onTogglePadBackground,
  documentMode = 'pad',
  onToggleDocumentMode,
  hasCustomPad = false,
  padImageUrl,
  onOpenLineFonts,
}) => {
  const [isExporting, setIsExporting] = useState(false);
  const [exportSuccess, setExportSuccess] = useState<string | null>(null);

  const openPadHandler = onOpenPadSettings || onOpenPadModal;
  const isPadCustomized = hasCustomPad || !!padImageUrl;

  // Helper to generate filename based on the person's name in the document
  const getPersonFileName = (extension: 'pdf' | 'png' = 'pdf') => {
    const raw = (applicantName || '').trim();
    // Remove characters that are illegal in filenames across OS
    const sanitized = raw.replace(/[/\\?%*:|"<>]/g, '').trim();
    if (sanitized) {
      return `${sanitized}.${extension}`;
    }
    return `Kuwait_eVisa_${visaNumber || 'Document'}.${extension}`;
  };

  // Generate A4 PDF with high resolution
  const handleDownloadPdf = async () => {
    if (!documentRef.current) return;
    setIsExporting(true);
    try {
      const element = documentRef.current;
      const imgData = await toPng(element, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: true,
        skipFonts: true,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      const fileName = getPersonFileName('pdf');
      pdf.save(fileName);
      setExportSuccess(`PDF সফলভাবে তৈরি হয়েছে (${fileName})`);
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (err) {
      console.error('PDF export error:', err);
      alert('PDF তৈরি করতে সমস্যা হয়েছে। আপনি ব্রাউজারের Print অপশন ব্যবহার করেও PDF সেভ করতে পারেন।');
    } finally {
      setIsExporting(false);
    }
  };

  // Download High-Res PNG Image
  const handleDownloadImage = async () => {
    if (!documentRef.current) return;
    setIsExporting(true);
    try {
      const imgData = await toPng(documentRef.current, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: true,
        skipFonts: true,
      });
      const fileName = getPersonFileName('png');
      const link = document.createElement('a');
      link.download = fileName;
      link.href = imgData;
      link.click();
      setExportSuccess(`ইমেজ ডাউনলোড সম্পন্ন (${fileName})`);
      setTimeout(() => setExportSuccess(null), 3000);
    } catch (err) {
      console.error('Image export error:', err);
      alert('ইমেজ এক্সপোর্ট করতে সমস্যা হয়েছে।');
    } finally {
      setIsExporting(false);
    }
  };

  // Direct Browser Print (Formatted for A4)
  const handlePrint = () => {
    window.print();
  };

  // WhatsApp Share Handler
  const handleShareWhatsApp = async () => {
    if (!documentRef.current) return;
    setIsExporting(true);
    try {
      const element = documentRef.current;
      const imgData = await toPng(element, {
        quality: 0.98,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: true,
        skipFonts: true,
      });

      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });

      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');
      const fileName = getPersonFileName('pdf');
      const pdfBlob = pdf.output('blob');
      const pdfFile = new File([pdfBlob], fileName, { type: 'application/pdf' });

      // Try native Web Share API with File (Mobile / Supported Desktops)
      if (
        typeof navigator !== 'undefined' &&
        navigator.canShare &&
        navigator.canShare({ files: [pdfFile] })
      ) {
        try {
          await navigator.share({
            title: `Kuwait e-Visa - ${applicantName || visaNumber}`,
            text: `কুয়েত ই-ভিসা ডকুমেন্ট (${applicantName || visaNumber})`,
            files: [pdfFile],
          });
          setExportSuccess('WhatsApp শেয়ার সম্পন্ন হয়েছে!');
          setTimeout(() => setExportSuccess(null), 3500);
          return;
        } catch (shareErr: unknown) {
          if (shareErr instanceof Error && shareErr.name === 'AbortError') {
            return;
          }
          console.warn('Navigator share error, using WhatsApp fallback:', shareErr);
        }
      }

      // Fallback: Download PDF file & Open WhatsApp Web/App
      pdf.save(fileName);
      const messageText = encodeURIComponent(
        `*কুয়েত ই-ভিসা ডকুমেন্ট (Kuwait e-Visa Document)*\n` +
        `নাম: ${applicantName || 'Applicant'}\n` +
        `ভিসা নং: ${visaNumber || 'N/A'}\n\n` +
        `সংযুক্ত A4 PDF ফাইলটি চেক করুন।`
      );
      const isMobile = /Android|iPhone|iPad|iPod/i.test(navigator.userAgent);
      const waUrl = isMobile
        ? `whatsapp://send?text=${messageText}`
        : `https://api.whatsapp.com/send?text=${messageText}`;
      window.open(waUrl, '_blank');
      setExportSuccess('PDF ডাউনলোড ও WhatsApp খোলা হয়েছে!');
      setTimeout(() => setExportSuccess(null), 4000);
    } catch (err) {
      console.error('WhatsApp share error:', err);
      alert('WhatsApp শেয়ার করতে ব্যর্থ হয়েছে। আপনি Download PDF ব্যবহার করতে পারেন।');
    } finally {
      setIsExporting(false);
    }
  };

  return (
    <div className="sticky top-3 z-30 bg-slate-900/95 backdrop-blur-md text-white px-4 py-3 rounded-2xl shadow-xl border border-slate-800 mb-6 flex flex-wrap items-center justify-between gap-3">
      {/* Left Group: Action Buttons */}
      <div className="flex flex-wrap items-center gap-2">
        {/* PDF Download Button */}
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isExporting}
          className="inline-flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-500 to-blue-600 hover:from-sky-400 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-sky-500/20 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
        >
          {isExporting ? (
            <RefreshCw className="w-4 h-4 animate-spin" />
          ) : (
            <Download className="w-4 h-4" />
          )}
          <span>Download PDF (A4)</span>
        </button>

        {/* WhatsApp Share Button */}
        <button
          type="button"
          onClick={handleShareWhatsApp}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-[#25D366] hover:bg-[#20bd5a] text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-emerald-500/20 active:scale-98 transition-all disabled:opacity-50 cursor-pointer"
          title="হোয়াটসঅ্যাপে ডকুমেন্ট শেয়ার করুন"
        >
          <svg className="w-4 h-4 fill-current shrink-0" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.074-.124-.272-.198-.57-.347-.297-.149-1.758-.868-2.031-.967-.272-.099-.47-.149-.669.149-.198.297-.768.967-.941 1.165-.173.198-.347.223-.644.074-.297-.149-1.255-.462-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.297-.347.446-.521.151-.172.2-.296.3-.495.099-.198.05-.372-.025-.521-.075-.148-.669-1.611-.916-2.206-.242-.579-.487-.501-.669-.51l-.57-.01c-.198 0-.52.074-.792.372s-1.04 1.016-1.04 2.479 1.065 2.876 1.213 3.074c.149.198 2.095 3.2 5.076 4.487.709.306 1.263.489 1.694.626.712.226 1.36.194 1.872.118.571-.085 1.758-.719 2.006-1.413.248-.695.248-1.29.173-1.414z"/>
          </svg>
          <span>WhatsApp শেয়ার</span>
        </button>

        {/* Print Button */}
        <button
          type="button"
          onClick={handlePrint}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-100 font-semibold text-xs rounded-xl border border-slate-700 active:scale-98 transition-all cursor-pointer"
        >
          <Printer className="w-4 h-4 text-sky-400" />
          <span>Print Document</span>
        </button>

        {/* PNG Export */}
        <button
          type="button"
          onClick={handleDownloadImage}
          disabled={isExporting}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
        >
          <FileImage className="w-4 h-4 text-emerald-400" />
          <span>Save Image (PNG)</span>
        </button>

        {/* Re-roll numbers button */}
        {onGenerateNewNumbers && (
          <button
            type="button"
            onClick={onGenerateNewNumbers}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
            title="Re-generate random 35/37 numbers"
          >
            <Sparkles className="w-4 h-4 text-amber-400" />
            <span>Re-roll (35 & 37)</span>
          </button>
        )}

        <div className="h-6 w-px bg-slate-800 hidden sm:block" />

        {/* Individual Line Fonts Customizer Button */}
        {onOpenLineFonts && (
          <button
            type="button"
            onClick={onOpenLineFonts}
            className="inline-flex items-center gap-1.5 px-3 py-2 bg-purple-950/70 hover:bg-purple-900/80 text-purple-300 font-semibold text-xs rounded-xl border border-purple-600/70 transition-all cursor-pointer shadow-xs"
            title="প্রত্যেকটি লাইনের ফন্ট, সাইজ ও স্টাইল আলাদাভাবে পরিবর্তন করুন"
          >
            <Type className="w-4 h-4 text-purple-400" />
            <span>লাইনের ফন্ট</span>
          </button>
        )}

        {/* Pad Manager / Upload Button */}
        {openPadHandler && (
          <button
            type="button"
            onClick={openPadHandler}
            className={`inline-flex items-center gap-1.5 px-3 py-2 font-semibold text-xs rounded-xl border transition-all cursor-pointer ${
              isPadCustomized
                ? 'bg-emerald-950/70 border-emerald-600 text-emerald-300 hover:bg-emerald-900/80'
                : 'bg-amber-950/60 border-amber-700 text-amber-300 hover:bg-amber-900/70'
            }`}
            title="প্যাড সেটিংস ও ক্যালিবারেশন (Letterhead)"
          >
            <Upload className="w-4 h-4 text-amber-400" />
            <span>{isPadCustomized ? 'প্যাড সেটিংস' : 'প্যাড আপলোড'}</span>
            {isPadCustomized && <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />}
          </button>
        )}

        {/* Toggle Pad Background (Show/Hide Pad for printing) */}
        {onTogglePadBackground && documentMode === 'pad' && (
          <button
            type="button"
            onClick={onTogglePadBackground}
            className={`inline-flex items-center gap-1.5 px-2.5 py-2 font-medium text-xs rounded-xl border transition-all cursor-pointer ${
              showPadBackground
                ? 'bg-slate-800 hover:bg-slate-700 text-slate-200 border-slate-700'
                : 'bg-sky-950/80 border-sky-600 text-sky-300 hover:bg-sky-900'
            }`}
            title={
              showPadBackground
                ? 'প্যাড ব্যাকগ্রাউন্ড হাইড করুন (ফাঁকা প্যাডে প্রিন্টের জন্য)'
                : 'প্যাড ব্যাকগ্রাউন্ড প্রদর্শন করুন'
            }
          >
            {showPadBackground ? (
              <>
                <Eye className="w-4 h-4 text-sky-400" />
                <span>প্যাড দৃশ্যমান</span>
              </>
            ) : (
              <>
                <EyeOff className="w-4 h-4 text-amber-400" />
                <span>প্যাড লুকানো</span>
              </>
            )}
          </button>
        )}

        {/* Mode Switch (Pad Mode vs Full Official Mode) */}
        {onToggleDocumentMode && (
          <button
            type="button"
            onClick={onToggleDocumentMode}
            className="inline-flex items-center gap-1.5 px-2.5 py-2 bg-slate-800 hover:bg-slate-700 text-slate-300 font-medium text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
            title="প্যাড মোড (হেডিং ছাড়া) / ফুল অফিসিয়াল মোড পরিবর্তন"
          >
            <Layers className="w-4 h-4 text-purple-400" />
            <span className="hidden md:inline">
              {documentMode === 'pad' ? 'প্যাড মোড' : 'ফুল অফিসিয়াল মোড'}
            </span>
          </button>
        )}

        <div className="h-6 w-px bg-slate-800 hidden sm:block" />

        {/* Google Drive Backup Button */}
        <button
          type="button"
          onClick={onOpenDriveModal}
          className="inline-flex items-center gap-1.5 px-3.5 py-2 bg-gradient-to-r from-sky-600 to-indigo-600 hover:from-sky-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/20 active:scale-98 transition-all cursor-pointer"
          title="Google ড্রাইভ ব্যাকআপ"
        >
          <Cloud className="w-4 h-4 text-sky-200" />
          <span>Google ড্রাইভ</span>
          {isDriveConnected && (
            <span className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
          )}
        </button>

        {/* Save to History Button */}
        <button
          type="button"
          onClick={onSaveCurrentRecord}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
          title="রেকর্ড সংরক্ষণ করুন"
        >
          <BookmarkPlus className="w-4 h-4 text-emerald-400" />
          <span className="hidden sm:inline">সেভ</span>
        </button>

        {/* History Modal Button */}
        <button
          type="button"
          onClick={onOpenHistoryModal}
          className="inline-flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-slate-200 font-semibold text-xs rounded-xl border border-slate-700 transition-all cursor-pointer"
          title="সংরক্ষিত রেকর্ড তালিকা"
        >
          <History className="w-4 h-4 text-amber-400" />
          <span>হিস্ট্রি</span>
        </button>
      </div>

      {/* Success Notification */}
      {exportSuccess && (
        <div className="flex items-center gap-1.5 text-xs text-emerald-400 font-bold bg-emerald-950/60 border border-emerald-700 px-3 py-1 rounded-lg animate-fade-in">
          <Check className="w-3.5 h-3.5" />
          <span>{exportSuccess}</span>
        </div>
      )}

      {/* Right Group: Zoom Controls */}
      <div className="flex items-center gap-1.5 bg-slate-800/80 px-2 py-1 rounded-xl border border-slate-700">
        <button
          type="button"
          onClick={onZoomOut}
          className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700 transition-colors cursor-pointer"
          title="Zoom Out"
        >
          <ZoomOut className="w-4 h-4" />
        </button>
        <span className="text-xs font-mono font-bold text-slate-200 min-w-[42px] text-center">
          {Math.round(zoom * 100)}%
        </span>
        <button
          type="button"
          onClick={onZoomIn}
          className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700 transition-colors cursor-pointer"
          title="Zoom In"
        >
          <ZoomIn className="w-4 h-4" />
        </button>
        <button
          type="button"
          onClick={onZoomReset}
          className="p-1 text-slate-300 hover:text-white rounded hover:bg-slate-700 transition-colors ml-1 cursor-pointer"
          title="Reset Zoom"
        >
          <Maximize2 className="w-3.5 h-3.5" />
        </button>
      </div>
    </div>
  );
};
