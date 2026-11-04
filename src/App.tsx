/**
 * Kuwait eVisa Generator & Pad Printer Application
 * @license Apache-2.0
 */
import { useState, useRef, useEffect, useCallback } from 'react';
import {
  FileText,
  History,
  BookmarkCheck,
  Upload,
  Type,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { KuwaitEVisaData, ExtractionState, PassportData } from './types';
import { sampleEVisaData, padReferenceSampleData } from './utils/sampleData';
import {
  generateVisaNumber,
  generateReferenceNumber,
  calculate4MonthsExpiry,
  getTodayDateString,
} from './utils/numberGenerator';
import { formatToYYYYMMDD } from './utils/dateFormatter';
import { KuwaitEVisaDocument } from './components/KuwaitEVisaDocument';
import { PassportUploader } from './components/PassportUploader';
import { VisaEditorForm } from './components/VisaEditorForm';
import { ActionToolbar } from './components/ActionToolbar';
import { GoogleDriveBackupModal } from './components/GoogleDriveBackupModal';
import { SavedRecordsModal } from './components/SavedRecordsModal';
import { PadManagerModal } from './components/PadManagerModal';
import { PWAInstallPrompt } from './components/PWAInstallPrompt';
import { NetworkSyncIndicator } from './components/NetworkSyncIndicator';
import { initAuth, getAccessToken } from './services/auth';
import { saveVisaRecord } from './services/recordsService';
import {
  getPendingBackupRecords,
  syncPendingRecordsToDrive,
} from './services/autoSyncService';
import { useOnlineStatus } from './hooks/useOnlineStatus';
import {
  getSavedPadImage,
  getSavedPadSettings,
  savePadSettings,
  PadCalibration,
} from './services/padService';

export default function App() {
  const [visaData, setVisaData] = useState<KuwaitEVisaData>(() => {
    return padReferenceSampleData;
  });
  const [zoom, setZoom] = useState<number>(0.85);
  const [activeTab, setActiveTab] = useState<'editor' | 'preview'>('editor');
  const documentRef = useRef<HTMLDivElement>(null);

  // Authentication & Modals State
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [isDriveModalOpen, setIsDriveModalOpen] = useState<boolean>(false);
  const [isHistoryModalOpen, setIsHistoryModalOpen] = useState<boolean>(false);
  const [isPadModalOpen, setIsPadModalOpen] = useState<boolean>(false);
  const [padModalInitialTab, setPadModalInitialTab] = useState<'line_fonts' | 'individual' | 'global' | 'upload'>('line_fonts');
  const [toastMessage, setToastMessage] = useState<string | null>(null);

  // Pad Settings & Calibration State
  const [padImageUrl, setPadImageUrl] = useState<string | null>(() => getSavedPadImage());
  const [showPadBackground, setShowPadBackground] = useState<boolean>(() => getSavedPadSettings().showPadBackground);
  const [documentMode, setDocumentMode] = useState<'pad' | 'full'>(() => getSavedPadSettings().documentMode);
  const [calibration, setCalibration] = useState<PadCalibration>(() => getSavedPadSettings().calibration);

  // Auto-Sync & Offline State
  const isOnline = useOnlineStatus();
  const [pendingSyncCount, setPendingSyncCount] = useState<number>(() => getPendingBackupRecords().length);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);

  const [extractionState, setExtractionState] = useState<ExtractionState>({
    isExtracting: false,
    progressMessage: '',
    error: null,
    uploadedFileName: null,
    uploadedImagePreview: null,
  });

  // Listen to Google Auth state
  useEffect(() => {
    const unsubscribe = initAuth(
      (user) => setCurrentUser(user),
      () => setCurrentUser(null)
    );
    return () => {
      if (typeof unsubscribe === 'function') unsubscribe();
    };
  }, []);

  // Update pending sync count
  const refreshPendingCount = useCallback(() => {
    const pending = getPendingBackupRecords();
    setPendingSyncCount(pending.length);
  }, []);

  // Automatic Background Sync to Google Drive when internet comes online
  const triggerAutoSync = useCallback(async () => {
    if (!isOnline || isSyncing) return;
    const token = await getAccessToken();
    if (!token) return;

    const pending = getPendingBackupRecords();
    if (pending.length === 0) {
      setPendingSyncCount(0);
      return;
    }

    try {
      setIsSyncing(true);
      const res = await syncPendingRecordsToDrive(token);
      refreshPendingCount();
      if (res.successCount > 0) {
        setToastMessage(`স্বয়ংক্রিয় ব্যাকআপ: ${res.successCount} টি রেকর্ড সিঙ্ক হয়েছে!`);
        setTimeout(() => setToastMessage(null), 4000);
      }
    } catch (err) {
      console.warn('Auto-sync execution error:', err);
    } finally {
      setIsSyncing(false);
    }
  }, [isOnline, isSyncing, refreshPendingCount]);

  // When connection status switches from offline to online, auto-sync
  useEffect(() => {
    refreshPendingCount();
    if (isOnline) {
      const timer = setTimeout(() => {
        triggerAutoSync();
      }, 1500);
      return () => clearTimeout(timer);
    }
  }, [isOnline, triggerAutoSync, refreshPendingCount]);

  // Calculate default auto-zoom based on screen width
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 640) {
        setZoom(0.42);
      } else if (window.innerWidth < 1024) {
        setZoom(0.65);
      } else if (window.innerWidth < 1440) {
        setZoom(0.8);
      } else {
        setZoom(0.88);
      }
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const showToast = (msg: string) => {
    setToastMessage(msg);
    setTimeout(() => setToastMessage(null), 3500);
  };

  // Update Visa Form Data
  const handleVisaDataChange = (updates: Partial<KuwaitEVisaData>) => {
    setVisaData((prev) => ({ ...prev, ...updates }));
  };

  // Re-roll both numbers (Visa: 35xxxxxxx, Ref: 37xxxxxxx)
  const handleGenerateNewNumbers = () => {
    setVisaData((prev) => ({
      ...prev,
      visaNumber: generateVisaNumber(),
      referenceNumber: generateReferenceNumber(),
    }));
  };

  // Save current record locally to history
  const handleSaveCurrentRecord = () => {
    saveVisaRecord(visaData);
    refreshPendingCount();
    showToast(`রেকর্ড সংরক্ষিত (${visaData.nameEnglish || visaData.visaNumber}) সফলভাবে!`);
    if (isOnline) {
      triggerAutoSync();
    }
  };

  // Toggle Pad Background
  const handleTogglePadBackground = () => {
    setShowPadBackground((prev) => {
      const next = !prev;
      savePadSettings({ showPadBackground: next });
      return next;
    });
  };

  // Toggle Document Mode (Pad vs Full)
  const handleToggleDocumentMode = () => {
    setDocumentMode((prev) => {
      const next = prev === 'pad' ? 'full' : 'pad';
      savePadSettings({ documentMode: next });
      return next;
    });
  };

  // When extraction starts
  const handleExtractStart = (fileName: string, previewUrl: string) => {
    setExtractionState({
      isExtracting: true,
      progressMessage: 'Processing passport...',
      error: null,
      uploadedFileName: fileName,
      uploadedImagePreview: previewUrl,
    });
  };

  // Extraction error
  const handleExtractError = (error: string) => {
    setExtractionState((prev) => ({
      ...prev,
      isExtracting: false,
      error,
      progressMessage: '',
    }));
  };

  // Successful extraction from passport
  const handleExtractSuccess = (passport: PassportData) => {
    const today = getTodayDateString();
    const fourMonthsLater = calculate4MonthsExpiry(today);

    const given = (passport.givenName || '').trim();
    const surname = (passport.surname || '').trim();
    const father = (passport.fatherName || '').trim();

    let fullEnglish = (passport.fullNameEnglish || '').trim();
    if (given && surname) {
      if (!fullEnglish.includes(given) || !fullEnglish.includes(surname)) {
        fullEnglish = [given, surname, father].filter(Boolean).join(' ');
      }
    } else if (given && !fullEnglish.includes(given)) {
      fullEnglish = `${given} ${fullEnglish}`.trim();
    } else if (surname && !fullEnglish.includes(surname)) {
      fullEnglish = `${fullEnglish} ${surname}`.trim();
    }

    if (father && !fullEnglish.includes(father)) {
      fullEnglish = `${fullEnglish} ${father}`.trim();
    }
    fullEnglish = fullEnglish.replace(/\s+/g, ' ').trim();

    setVisaData((prev) => ({
      ...prev,
      nameEnglish: fullEnglish || prev.nameEnglish,
      nameArabic: passport.fullNameArabic || prev.nameArabic,
      givenName: given || prev.givenName,
      surname: surname || prev.surname,
      fatherName: father || prev.fatherName,
      motherName: passport.motherName || prev.motherName,
      passportNumber: passport.passportNumber || prev.passportNumber,
      nationalityEnglish: passport.nationalityEnglish || prev.nationalityEnglish,
      nationalityArabic: passport.nationalityArabic || prev.nationalityArabic,
      birthDate: passport.dateOfBirth ? formatToYYYYMMDD(passport.dateOfBirth) : prev.birthDate,
      birthPlace: passport.placeOfBirth || prev.birthPlace,
      sexEnglish: passport.sex || prev.sexEnglish,
      sexArabic: passport.sex === 'F' ? 'أنثى' : 'ذكر',
      passportTypeEnglish: passport.passportType || prev.passportTypeEnglish,
      passportIssueDate: passport.passportIssueDate ? formatToYYYYMMDD(passport.passportIssueDate) : prev.passportIssueDate,
      passportExpiryDate: passport.passportExpiryDate ? formatToYYYYMMDD(passport.passportExpiryDate) : prev.passportExpiryDate,
      issueDate: today,
      expiryDate: fourMonthsLater,
      visaNumber: generateVisaNumber(),
      referenceNumber: generateReferenceNumber(),
      customMrzLine1: undefined,
      customMrzLine2: undefined,
    }));

    setExtractionState((prev) => ({
      ...prev,
      isExtracting: false,
      progressMessage: 'Completed successfully!',
      error: null,
    }));

    if (window.innerWidth < 1024) {
      setActiveTab('preview');
    }
  };

  // Load sample dataset
  const handleLoadSample = () => {
    const today = getTodayDateString();
    const fourMonthsLater = calculate4MonthsExpiry(today);
    setVisaData({
      ...sampleEVisaData,
      visaNumber: generateVisaNumber(),
      referenceNumber: generateReferenceNumber(),
      issueDate: today,
      expiryDate: fourMonthsLater,
      autoCalculateExpiry: true,
    });
    setExtractionState({
      isExtracting: false,
      progressMessage: '',
      error: null,
      uploadedFileName: 'Sample_Bangladesh_Passport_AlAmin.pdf',
      uploadedImagePreview: null,
    });
  };

  return (
    <div className="min-h-screen bg-slate-100/90 text-slate-900 flex flex-col font-sans pb-12 sm:pb-0">
      {/* Mobile PWA Install Banner */}
      <PWAInstallPrompt />

      {/* Toast Notification */}
      {toastMessage && (
        <div className="fixed bottom-5 right-5 z-50 bg-slate-900 text-white px-4 py-3 rounded-xl shadow-2xl border border-slate-700 text-xs font-semibold flex items-center gap-2 animate-fade-in">
          <BookmarkCheck className="w-4 h-4 text-emerald-400" />
          <span>{toastMessage}</span>
        </div>
      )}

      {/* TOP NAVBAR */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-2xs">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 h-16 flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 sm:gap-3">
            <div className="w-9 h-9 sm:w-10 sm:h-10 rounded-xl bg-gradient-to-tr from-sky-600 to-blue-700 text-white flex items-center justify-center shadow-md shadow-sky-600/20 font-black shrink-0">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-black text-slate-900 tracking-tight leading-none">
                  Kuwait eVisa Generator & Pad Printer
                </h1>
                <span className="text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded bg-sky-100 text-sky-800 hidden sm:inline-block">
                  PWA Mobile
                </span>
              </div>
              <p className="text-[11px] text-slate-500 font-medium hidden sm:block mt-0.5">
                কুয়েত ই-ভিসা জেনারেটর, পাসপোর্ট অটো-স্ক্যানার ও প্যাড প্রিন্টার
              </p>
            </div>
          </div>

          {/* Right Header Navigation */}
          <div className="flex items-center gap-2">
            {/* Online / Offline & Sync Indicator */}
            <NetworkSyncIndicator
              isDriveConnected={!!currentUser}
              pendingCount={pendingSyncCount}
              isSyncing={isSyncing}
              onTriggerSync={triggerAutoSync}
              onOpenDriveModal={() => setIsDriveModalOpen(true)}
            />

            {/* Individual Line Fonts Customizer Trigger */}
            <button
              type="button"
              onClick={() => {
                setPadModalInitialTab('line_fonts');
                setIsPadModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-purple-200 bg-purple-50 hover:bg-purple-100 text-purple-700 shadow-2xs cursor-pointer"
              title="প্রতিটি লাইনের ফন্ট, সাইজ ও স্টাইল আলাদাভাবে পরিবর্তন করুন"
            >
              <Type className="w-4 h-4 text-purple-600" />
              <span className="hidden sm:inline">লাইনের ফন্ট</span>
            </button>

            {/* Pad Upload & Settings Trigger */}
            <button
              type="button"
              onClick={() => {
                setPadModalInitialTab('upload');
                setIsPadModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold transition-all border border-slate-200 hover:bg-slate-50 bg-white text-slate-700 shadow-2xs cursor-pointer"
            >
              <Upload className="w-4 h-4 text-slate-600" />
              <span className="hidden sm:inline">প্যাড সেটিংস</span>
            </button>

            {/* History Modal Trigger */}
            <button
              type="button"
              onClick={() => {
                refreshPendingCount();
                setIsHistoryModalOpen(true);
              }}
              className="inline-flex items-center gap-1.5 px-2.5 sm:px-3 py-1.5 rounded-xl text-xs font-bold bg-white text-slate-700 border border-slate-200 hover:bg-slate-50 transition-colors shadow-2xs cursor-pointer"
            >
              <History className="w-4 h-4 text-amber-500" />
              <span className="hidden sm:inline">হিস্ট্রি</span>
            </button>

            {/* Mobile View Toggle */}
            <div className="flex lg:hidden bg-slate-100 p-1 rounded-xl border border-slate-200">
              <button
                onClick={() => setActiveTab('editor')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'editor'
                    ? 'bg-white text-sky-700 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                Editor
              </button>
              <button
                onClick={() => setActiveTab('preview')}
                className={`px-3 py-1 text-xs font-bold rounded-lg transition-colors cursor-pointer ${
                  activeTab === 'preview'
                    ? 'bg-white text-sky-700 shadow-2xs'
                    : 'text-slate-600'
                }`}
              >
                Document
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* MAIN CONTAINER */}
      <main className="max-w-7xl w-full mx-auto px-4 sm:px-6 lg:px-8 py-5 flex-1">
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* LEFT COLUMN: UPLOADER & EDITABLE CONTROLS */}
          <div
            className={`lg:col-span-5 space-y-5 ${
              activeTab === 'preview' ? 'hidden lg:block' : 'block'
            }`}
          >
            {/* Passport Scanner */}
            <PassportUploader
              extractionState={extractionState}
              onExtractSuccess={handleExtractSuccess}
              onExtractStart={handleExtractStart}
              onExtractError={handleExtractError}
              onLoadSample={handleLoadSample}
            />

            {/* Comprehensive Visa Editor Form */}
            <VisaEditorForm
              data={visaData}
              onChange={handleVisaDataChange}
              onGenerateNewNumbers={handleGenerateNewNumbers}
              calibration={calibration}
              onCalibrationChange={(newCal) => {
                setCalibration(newCal);
                savePadSettings({ calibration: newCal });
              }}
              onOpenLineFontsModal={() => {
                setPadModalInitialTab('line_fonts');
                setIsPadModalOpen(true);
              }}
            />
          </div>

          {/* RIGHT COLUMN: INTERACTIVE PREVIEW & TOOLBAR */}
          <div
            className={`lg:col-span-7 flex flex-col items-center ${
              activeTab === 'editor' ? 'hidden lg:flex' : 'flex'
            }`}
          >
            {/* Floating Quick Action Toolbar */}
            <div className="w-full max-w-[850px]">
              <ActionToolbar
                documentRef={documentRef}
                zoom={zoom}
                onZoomIn={() => setZoom((z) => Math.min(1.4, Number((z + 0.05).toFixed(2))))}
                onZoomOut={() => setZoom((z) => Math.max(0.35, Number((z - 0.05).toFixed(2))))}
                onZoomReset={() => setZoom(0.85)}
                visaNumber={visaData.visaNumber}
                applicantName={visaData.nameEnglish}
                isDriveConnected={!!currentUser}
                onOpenDriveModal={() => setIsDriveModalOpen(true)}
                onSaveCurrentRecord={handleSaveCurrentRecord}
                onOpenHistoryModal={() => {
                  refreshPendingCount();
                  setIsHistoryModalOpen(true);
                }}
                padImageUrl={padImageUrl}
                showPadBackground={showPadBackground}
                onTogglePadBackground={handleTogglePadBackground}
                documentMode={documentMode}
                onToggleDocumentMode={handleToggleDocumentMode}
                onOpenPadSettings={() => {
                  setPadModalInitialTab('upload');
                  setIsPadModalOpen(true);
                }}
                onOpenLineFonts={() => {
                  setPadModalInitialTab('line_fonts');
                  setIsPadModalOpen(true);
                }}
              />
            </div>

            {/* Kuwait e-Visa Authentic Document View */}
            <div className="w-full flex justify-center overflow-x-auto py-2">
              <KuwaitEVisaDocument
                documentRef={documentRef}
                data={visaData}
                zoom={zoom}
                padImageUrl={padImageUrl}
                showPadBackground={showPadBackground}
                documentMode={documentMode}
                calibration={calibration}
              />
            </div>
          </div>
        </div>
      </main>

      {/* FOOTER */}
      <footer className="bg-white border-t border-slate-200 mt-auto py-4">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center text-xs text-slate-500 flex flex-col sm:flex-row items-center justify-between gap-2">
          <p>© {new Date().getFullYear()} কুয়েত ই-ভিসা জেনারেটর (PWA Ready)</p>
          <div className="flex items-center gap-4 text-slate-500 text-xs">
            <span>অফলাইন সাপোর্ট</span>
            <span>Google ড্রাইভ ব্যাকআপ</span>
            <span>স্বয়ংক্রিয় MRZ ও ৩৫/৩৭ কোড</span>
          </div>
        </div>
      </footer>

      {/* Google Drive Backup Modal */}
      <GoogleDriveBackupModal
        isOpen={isDriveModalOpen}
        onClose={() => {
          setIsDriveModalOpen(false);
          refreshPendingCount();
        }}
        visaData={visaData}
        documentRef={documentRef}
        currentUser={currentUser}
        onUserChange={setCurrentUser}
      />

      {/* Saved Records History Modal */}
      <SavedRecordsModal
        isOpen={isHistoryModalOpen}
        onClose={() => {
          setIsHistoryModalOpen(false);
          refreshPendingCount();
        }}
        onLoadRecord={(loadedData) => {
          setVisaData(loadedData);
          showToast(`রেকর্ড লোড হয়েছে (${loadedData.nameEnglish || loadedData.visaNumber}) সফলভাবে!`);
        }}
        onOpenDriveModal={() => {
          setIsHistoryModalOpen(false);
          setIsDriveModalOpen(true);
        }}
      />

      {/* Pad Upload & Settings Modal */}
      <PadManagerModal
        isOpen={isPadModalOpen}
        onClose={() => setIsPadModalOpen(false)}
        padImageUrl={padImageUrl}
        onPadImageChange={setPadImageUrl}
        showPadBackground={showPadBackground}
        onShowPadBackgroundChange={setShowPadBackground}
        documentMode={documentMode}
        onDocumentModeChange={setDocumentMode}
        calibration={calibration}
        onCalibrationChange={setCalibration}
        initialTab={padModalInitialTab}
        onLoadReferenceSample={(data) => {
          setVisaData(data);
          showToast('রেফারেন্স স্যাম্পল লোড হয়েছে!');
        }}
      />
    </div>
  );
}
