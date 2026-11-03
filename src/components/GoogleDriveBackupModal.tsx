import React, { useState, useEffect } from 'react';
import {
  Cloud,
  X,
  UploadCloud,
  CheckCircle2,
  AlertCircle,
  ExternalLink,
  Trash2,
  RefreshCw,
  FolderCheck,
  FileText,
  UserCheck,
  LogOut,
} from 'lucide-react';
import { User } from 'firebase/auth';
import { googleSignIn, logout, getAccessToken } from '../services/auth';
import {
  uploadFileToDrive,
  listDriveBackups,
  deleteDriveFile,
  DriveFileItem,
} from '../services/driveService';
import { KuwaitEVisaData } from '../types';
import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';
import { formatToYYYYMMDD } from '../utils/dateFormatter';
import { saveVisaRecord } from '../services/recordsService';

interface GoogleDriveBackupModalProps {
  isOpen: boolean;
  onClose: () => void;
  visaData: KuwaitEVisaData;
  documentRef: React.RefObject<HTMLDivElement | null>;
  currentUser: User | null;
  onUserChange: (user: User | null) => void;
}

export const GoogleDriveBackupModal: React.FC<GoogleDriveBackupModalProps> = ({
  isOpen,
  onClose,
  visaData,
  documentRef,
  currentUser,
  onUserChange,
}) => {
  const [isSigningIn, setIsSigningIn] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [isLoadingBackups, setIsLoadingBackups] = useState(false);
  const [backups, setBackups] = useState<DriveFileItem[]>([]);
  const [statusMessage, setStatusMessage] = useState<{
    type: 'success' | 'error' | 'info';
    text: string;
  } | null>(null);

  // Load backups when open and signed in
  useEffect(() => {
    if (isOpen && currentUser) {
      loadBackups();
    }
  }, [isOpen, currentUser]);

  const loadBackups = async () => {
    const token = await getAccessToken();
    if (!token) return;
    setIsLoadingBackups(true);
    try {
      const files = await listDriveBackups(token);
      setBackups(files);
    } catch (err: any) {
      console.error('Error loading backups:', err);
    } finally {
      setIsLoadingBackups(false);
    }
  };

  const handleSignIn = async () => {
    setIsSigningIn(true);
    setStatusMessage(null);
    try {
      const result = await googleSignIn();
      if (result) {
        onUserChange(result.user);
        setStatusMessage({
          type: 'success',
          text: `কানেক্ট হয়েছে: ${result.user.displayName || result.user.email}`,
        });
        // Immediately load existing backups
        const files = await listDriveBackups(result.accessToken);
        setBackups(files);
      }
    } catch (err: any) {
      console.error('Sign-in error:', err);
      setStatusMessage({
        type: 'error',
        text: err.message || 'Google সাইন-ইন করতে ব্যর্থ হয়েছে',
      });
    } finally {
      setIsSigningIn(false);
    }
  };

  const handleSignOut = async () => {
    try {
      await logout();
      onUserChange(null);
      setBackups([]);
      setStatusMessage({
        type: 'info',
        text: 'Google ড্রাইভ সংযোগ বিচ্ছিন্ন করা হয়েছে',
      });
    } catch (err: any) {
      console.error('Sign out error:', err);
    }
  };

  // Generate PDF from documentRef and upload to Google Drive
  const handleBackupCurrentVisa = async () => {
    if (!documentRef.current) {
      setStatusMessage({
        type: 'error',
        text: 'ডকুমেন্ট রেফারেন্স পাওয়া যায়নি',
      });
      return;
    }

    const token = await getAccessToken();
    if (!token) {
      setStatusMessage({
        type: 'error',
        text: 'Google অ্যাকাউন্ট সাইন-ইন প্রয়োজন',
      });
      return;
    }

    setIsUploading(true);
    setStatusMessage({
      type: 'info',
      text: 'PDF ডকুমেন্ট প্রস্তুত এবং আপলোড হচ্ছে...',
    });

    try {
      // 1. Render document to high-quality image
      const element = documentRef.current;
      const imgData = await toPng(element, {
        quality: 0.98,
        pixelRatio: 2.2,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      // 2. Generate PDF
      const pdf = new jsPDF({
        orientation: 'portrait',
        unit: 'mm',
        format: 'a4',
      });
      const pdfWidth = pdf.internal.pageSize.getWidth();
      const pdfHeight = pdf.internal.pageSize.getHeight();
      pdf.addImage(imgData, 'PNG', 0, 0, pdfWidth, pdfHeight, undefined, 'FAST');

      const pdfBlob = pdf.output('blob');
      const issueYMD = formatToYYYYMMDD(visaData.issueDate);
      const rawPersonName = (visaData.nameEnglish || visaData.nameArabic || '').trim();
      const safePersonName = rawPersonName.replace(/[/\\?%*:|"<>]/g, '').trim();
      const fileName = safePersonName
        ? `${safePersonName}.pdf`
        : `Kuwait_eVisa_${visaData.visaNumber || 'Document'}.pdf`;

      // 3. Upload to Google Drive
      const uploadedFile = await uploadFileToDrive(token, {
        fileName,
        blob: pdfBlob,
        mimeType: 'application/pdf',
        description: `ভিসা নং: ${visaData.visaNumber} | পাসপোর্ট নং: ${visaData.passportNumber} | ইস্যু: ${issueYMD} | মেয়াদ: ${formatToYYYYMMDD(visaData.expiryDate)}`,
      });

      // 4. Also record in local storage history with drive link
      saveVisaRecord(visaData, undefined, {
        driveFileId: uploadedFile.id,
        driveFileName: uploadedFile.name,
        driveWebViewLink: uploadedFile.webViewLink,
      });

      setStatusMessage({
        type: 'success',
        text: `ড্রাইভে ব্যাকআপ সম্পন্ন হয়েছে: ${uploadedFile.name}`,
      });

      // Refresh file list
      await loadBackups();
    } catch (err: any) {
      console.error('Backup upload error:', err);
      setStatusMessage({
        type: 'error',
        text: `আপলোড ত্রুটি: ${err.message || 'অজানা ত্রুটি'}`,
      });
    } finally {
      setIsUploading(false);
    }
  };

  // Delete backup with explicit user confirmation
  const handleDeleteBackup = async (file: DriveFileItem) => {
    const confirmed = window.confirm(
      `আপনি কি নিশ্চিত যে "${file.name}" ফাইলটি ড্রাইভ থেকে মুছে ফেলতে চান?`
    );
    if (!confirmed) return;

    const token = await getAccessToken();
    if (!token) return;

    try {
      await deleteDriveFile(token, file.id);
      setBackups((prev) => prev.filter((f) => f.id !== file.id));
      setStatusMessage({
        type: 'info',
        text: `"${file.name}" ড্রাইভ থেকে মুছে ফেলা হয়েছে`,
      });
    } catch (err: any) {
      console.error('Delete backup error:', err);
      setStatusMessage({
        type: 'error',
        text: `ফাইল মুছতে ব্যর্থ: ${err.message}`,
      });
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-2xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8 max-h-[90vh]">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-sky-700 via-sky-600 to-blue-700 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-white/10 flex items-center justify-center border border-white/20">
              <Cloud className="w-5 h-5 text-sky-100" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>Google ড্রাইভ ব্যাকআপ</span>
                <span className="text-[10px] bg-white/20 px-2 py-0.5 rounded-full font-semibold">
                  ক্লাউড সিঙ্ক
                </span>
              </h2>
              <p className="text-xs text-sky-100">
                আপনার তৈরি করা সকল কুয়েত ই-ভিসা সরাসরি নিজস্ব Google ড্রাইভে ব্যাকআপ রাখুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-sky-100 hover:text-white hover:bg-white/10 rounded-lg transition-colors cursor-pointer"
            title="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Body */}
        <div className="p-6 overflow-y-auto space-y-6 flex-1 text-slate-800">
          {/* Status Message */}
          {statusMessage && (
            <div
              className={`p-3 rounded-xl border text-xs font-semibold flex items-start gap-2.5 ${
                statusMessage.type === 'success'
                  ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
                  : statusMessage.type === 'error'
                  ? 'bg-rose-50 border-rose-200 text-rose-800'
                  : 'bg-sky-50 border-sky-200 text-sky-800'
              }`}
            >
              {statusMessage.type === 'success' ? (
                <CheckCircle2 className="w-4 h-4 text-emerald-600 shrink-0 mt-0.5" />
              ) : statusMessage.type === 'error' ? (
                <AlertCircle className="w-4 h-4 text-rose-600 shrink-0 mt-0.5" />
              ) : (
                <RefreshCw className="w-4 h-4 text-sky-600 shrink-0 mt-0.5 animate-spin" />
              )}
              <span className="leading-relaxed">{statusMessage.text}</span>
            </div>
          )}

          {/* AUTH SECTION */}
          {!currentUser ? (
            <div className="bg-slate-50 border border-slate-200 rounded-xl p-6 text-center space-y-4">
              <div className="w-12 h-12 rounded-full bg-sky-100 text-sky-700 flex items-center justify-center mx-auto">
                <UploadCloud className="w-6 h-6" />
              </div>
              <div className="space-y-1">
                <h3 className="text-sm font-bold text-slate-900">
                  Google অ্যাকাউন্ট কানেক্ট করুন
                </h3>
                <p className="text-xs text-slate-600 max-w-md mx-auto leading-relaxed">
                  আপনার Google ড্রাইভে সরাসরি অ্যাক্সেস করে একটি বিশেষ ফোল্ডার
                  (<span className="font-semibold text-slate-800">কুয়েত ই-ভিসা ব্যাকআপ - Kuwait eVisas</span>) তৈরি হবে।
                </p>
              </div>

              {/* Official Google Sign-In Styled Button */}
              <div className="pt-2 flex justify-center">
                <button
                  type="button"
                  onClick={handleSignIn}
                  disabled={isSigningIn}
                  className="inline-flex items-center gap-3 px-5 py-2.5 bg-white border border-slate-300 hover:border-slate-400 text-slate-700 font-semibold text-xs rounded-xl shadow-xs hover:shadow-md transition-all active:scale-98 cursor-pointer disabled:opacity-60"
                >
                  <svg className="w-4 h-4" viewBox="0 0 48 48">
                    <path
                      fill="#EA4335"
                      d="M24 9.5c3.54 0 6.71 1.22 9.21 3.6l6.85-6.85C35.9 2.38 30.47 0 24 0 14.62 0 6.51 5.38 2.56 13.22l7.98 6.19C12.43 13.72 17.74 9.5 24 9.5z"
                    />
                    <path
                      fill="#4285F4"
                      d="M46.98 24.55c0-1.57-.15-3.09-.38-4.55H24v9.02h12.94c-.58 2.96-2.26 5.48-4.78 7.18l7.73 6c4.51-4.18 7.09-10.36 7.09-17.65z"
                    />
                    <path
                      fill="#FBBC05"
                      d="M10.53 28.59c-.48-1.45-.76-2.99-.76-4.59s.27-3.14.76-4.59l-7.98-6.19C.92 16.46 0 20.12 0 24c0 3.88.92 7.54 2.56 10.78l7.97-6.19z"
                    />
                    <path
                      fill="#34A853"
                      d="M24 48c6.48 0 11.93-2.13 15.89-5.81l-7.73-6c-2.15 1.45-4.92 2.3-8.16 2.3-6.26 0-11.57-4.22-13.47-9.91l-7.98 6.19C6.51 42.62 14.62 48 24 48z"
                    />
                  </svg>
                  <span>{isSigningIn ? 'সাইন-ইন হচ্ছে...' : 'Sign in with Google'}</span>
                </button>
              </div>
            </div>
          ) : (
            <div className="space-y-5">
              {/* Profile Card */}
              <div className="bg-slate-50 border border-slate-200 rounded-xl p-4 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  {currentUser.photoURL ? (
                    <img
                      src={currentUser.photoURL}
                      alt={currentUser.displayName || 'User'}
                      className="w-10 h-10 rounded-full border border-slate-300"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-sky-600 text-white flex items-center justify-center font-bold text-sm">
                      <UserCheck className="w-5 h-5" />
                    </div>
                  )}
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-slate-900">
                        {currentUser.displayName || 'Google User'}
                      </span>
                      <span className="text-[10px] bg-emerald-100 text-emerald-800 font-semibold px-2 py-0.2 rounded-full">
                        কানেক্টেড
                      </span>
                    </div>
                    <p className="text-[11px] text-slate-500 font-mono">
                      {currentUser.email}
                    </p>
                  </div>
                </div>

                <button
                  type="button"
                  onClick={handleSignOut}
                  className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-rose-700 hover:bg-rose-50 border border-rose-200 rounded-lg transition-colors cursor-pointer"
                  title="Sign out"
                >
                  <LogOut className="w-3.5 h-3.5" />
                  <span>লগআউট</span>
                </button>
              </div>

              {/* ACTION: BACKUP CURRENT VISA */}
              <div className="bg-gradient-to-br from-sky-50 to-blue-50 border border-sky-200 rounded-xl p-4">
                <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                  <div>
                    <h4 className="text-xs font-bold text-sky-950 flex items-center gap-1.5">
                      <FolderCheck className="w-4 h-4 text-sky-600" />
                      <span>বর্তমান ভিসা ব্যাকআপ করুন</span>
                    </h4>
                    <p className="text-[11px] text-sky-800 mt-0.5">
                      ভিসা নং: <span className="font-mono font-bold text-slate-900">{visaData.visaNumber}</span> | 
                      নাম: <span className="font-semibold text-slate-900">{visaData.nameEnglish || 'N/A'}</span>
                    </p>
                    <p className="text-[10px] text-slate-500 font-mono mt-0.5">
                      ইস্যু: {formatToYYYYMMDD(visaData.issueDate)} (আজকের তারিখ) | মেয়াদ: {formatToYYYYMMDD(visaData.expiryDate)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={handleBackupCurrentVisa}
                    disabled={isUploading}
                    className="inline-flex items-center justify-center gap-2 px-4 py-2 bg-gradient-to-r from-sky-600 to-blue-600 hover:from-sky-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-md shadow-sky-600/20 active:scale-98 transition-all disabled:opacity-60 cursor-pointer whitespace-nowrap"
                  >
                    {isUploading ? (
                      <RefreshCw className="w-4 h-4 animate-spin" />
                    ) : (
                      <UploadCloud className="w-4 h-4" />
                    )}
                    <span>{isUploading ? 'আপলোড হচ্ছে...' : 'ড্রাইভে সেভ করুন'}</span>
                  </button>
                </div>
              </div>

              {/* LIST: GOOGLE DRIVE BACKUPS */}
              <div className="space-y-2">
                <div className="flex items-center justify-between border-b border-slate-200 pb-2">
                  <div className="flex items-center gap-2">
                    <Cloud className="w-4 h-4 text-sky-600" />
                    <h4 className="text-xs font-bold text-slate-900">
                      Google ড্রাইভে সংরক্ষিত ফাইলসমূহ ({backups.length})
                    </h4>
                  </div>
                  <button
                    type="button"
                    onClick={loadBackups}
                    disabled={isLoadingBackups}
                    className="inline-flex items-center gap-1 text-[11px] font-semibold text-sky-700 hover:text-sky-800 cursor-pointer"
                  >
                    <RefreshCw className={`w-3 h-3 ${isLoadingBackups ? 'animate-spin' : ''}`} />
                    <span>রিফ্রেশ</span>
                  </button>
                </div>

                {isLoadingBackups ? (
                  <div className="py-8 text-center text-xs text-slate-400 flex items-center justify-center gap-2">
                    <RefreshCw className="w-4 h-4 animate-spin text-sky-600" />
                    <span>ফাইল লোড হচ্ছে...</span>
                  </div>
                ) : backups.length === 0 ? (
                  <div className="py-8 text-center border border-dashed border-slate-200 rounded-xl bg-slate-50/50 space-y-1">
                    <FileText className="w-6 h-6 text-slate-400 mx-auto" />
                    <p className="text-xs font-medium text-slate-600">
                      কোনো ব্যাকআপ ফাইল পাওয়া যায়নি
                    </p>
                    <p className="text-[11px] text-slate-400">
                      উপরে "ড্রাইভে সেভ করুন" বাটনে ক্লিক করে প্রথম ব্যাকআপ রাখুন
                    </p>
                  </div>
                ) : (
                  <div className="space-y-2 max-h-64 overflow-y-auto pr-1">
                    {backups.map((file) => (
                      <div
                        key={file.id}
                        className="bg-white border border-slate-200 hover:border-sky-300 rounded-xl p-3 flex items-center justify-between transition-colors shadow-2xs"
                      >
                        <div className="flex items-center gap-2.5 overflow-hidden">
                          <div className="w-8 h-8 rounded-lg bg-red-50 text-red-600 flex items-center justify-center shrink-0 border border-red-100">
                            <FileText className="w-4 h-4" />
                          </div>
                          <div className="truncate">
                            <h5 className="text-xs font-bold text-slate-900 truncate">
                              {file.name}
                            </h5>
                            <div className="flex items-center gap-2 text-[10px] text-slate-500 font-mono mt-0.5">
                              <span>
                                {file.createdTime
                                  ? new Date(file.createdTime).toLocaleDateString('bn-BD', {
                                      year: 'numeric',
                                      month: 'short',
                                      day: 'numeric',
                                    })
                                  : ''}
                              </span>
                              {file.size && (
                                <span>• {(Number(file.size) / 1024).toFixed(1)} KB</span>
                              )}
                            </div>
                          </div>
                        </div>

                        <div className="flex items-center gap-1.5 shrink-0 ml-2">
                          {file.webViewLink && (
                            <a
                              href={file.webViewLink}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="inline-flex items-center gap-1 px-2 py-1 text-[11px] font-semibold text-sky-700 hover:bg-sky-50 border border-sky-200 rounded-lg transition-colors cursor-pointer"
                              title="Open in Google Drive"
                            >
                              <ExternalLink className="w-3 h-3" />
                              <span>ড্রাইভ লিংক</span>
                            </a>
                          )}

                          <button
                            type="button"
                            onClick={() => handleDeleteBackup(file)}
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                            title="Delete backup file"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}
        </div>

        {/* Modal Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span className="flex items-center gap-1.5">
            <FolderCheck className="w-4 h-4 text-emerald-600" />
            <span>ফোল্ডার: কুয়েত ই-ভিসা ব্যাকআপ - Kuwait eVisas</span>
          </span>
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 bg-slate-200 hover:bg-slate-300 text-slate-800 font-semibold rounded-lg transition-colors cursor-pointer"
          >
            বন্ধ করুন
          </button>
        </div>
      </div>
    </div>
  );
};
