import React, { useState, useEffect } from 'react';
import {
  History,
  X,
  Search,
  ExternalLink,
  Trash2,
  Copy,
  CheckCircle2,
  Cloud,
  FileText,
  Calendar,
  CreditCard,
  User,
} from 'lucide-react';
import {
  getAllSavedRecords,
  deleteSavedRecord,
  SavedVisaRecord,
} from '../services/recordsService';
import { KuwaitEVisaData } from '../types';
import { formatToYYYYMMDD } from '../utils/dateFormatter';
import { generateVisaNumber, generateReferenceNumber } from '../utils/numberGenerator';

interface SavedRecordsModalProps {
  isOpen: boolean;
  onClose: () => void;
  onLoadRecord: (data: KuwaitEVisaData) => void;
  onOpenDriveModal: () => void;
}

export const SavedRecordsModal: React.FC<SavedRecordsModalProps> = ({
  isOpen,
  onClose,
  onLoadRecord,
  onOpenDriveModal,
}) => {
  const [records, setRecords] = useState<SavedVisaRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  useEffect(() => {
    if (isOpen) {
      refreshRecords();
    }
  }, [isOpen]);

  const refreshRecords = () => {
    setRecords(getAllSavedRecords());
  };

  const handleDelete = (record: SavedVisaRecord) => {
    const ok = window.confirm(
      `আপনি কি নিশ্চিত যে "${record.data.nameEnglish || record.data.visaNumber}"-এর রেকর্ড মুছে ফেলতে চান?`
    );
    if (!ok) return;

    deleteSavedRecord(record.id);
    refreshRecords();
    setSuccessMessage('রেকর্ড মুছে ফেলা হয়েছে');
    setTimeout(() => setSuccessMessage(null), 2500);
  };

  const handleDuplicate = (record: SavedVisaRecord) => {
    const visaNumber = generateVisaNumber();
    const referenceNumber = generateReferenceNumber();
    const duplicatedData: KuwaitEVisaData = {
      ...record.data,
      visaNumber,
      referenceNumber,
    };
    onLoadRecord(duplicatedData);
    onClose();
  };

  const handleSelect = (record: SavedVisaRecord) => {
    onLoadRecord(record.data);
    onClose();
  };

  const filteredRecords = records.filter((r) => {
    const query = searchQuery.toLowerCase();
    return (
      (r.data.nameEnglish && r.data.nameEnglish.toLowerCase().includes(query)) ||
      (r.data.visaNumber && r.data.visaNumber.toLowerCase().includes(query)) ||
      (r.data.passportNumber && r.data.passportNumber.toLowerCase().includes(query)) ||
      (r.data.referenceNumber && r.data.referenceNumber.toLowerCase().includes(query))
    );
  });

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/70 backdrop-blur-xs p-4 overflow-y-auto animate-fade-in">
      <div className="bg-white w-full max-w-3xl rounded-2xl shadow-2xl border border-slate-200 overflow-hidden flex flex-col my-8 max-h-[90vh]">
        {/* Header */}
        <div className="bg-gradient-to-r from-slate-900 via-slate-800 to-slate-900 text-white px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-sky-500/20 text-sky-400 flex items-center justify-center border border-sky-400/30">
              <History className="w-5 h-5" />
            </div>
            <div>
              <h2 className="text-base font-black tracking-tight flex items-center gap-2">
                <span>সংরক্ষিত ভিসা হিস্ট্রি</span>
                <span className="text-[10px] bg-sky-500/20 text-sky-300 px-2 py-0.5 rounded-full font-semibold">
                  {records.length} টি রেকর্ড
                </span>
              </h2>
              <p className="text-xs text-slate-400">
                পূর্বে তৈরি করা সকল কুয়েত ই-ভিসা রেকর্ড দেখুন ও পুনরায় লোড করুন
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-slate-400 hover:text-white hover:bg-slate-800 rounded-lg transition-colors cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Search & Actions Bar */}
        <div className="p-4 bg-slate-50 border-b border-slate-200 flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="relative w-full sm:w-80">
            <Search className="w-4 h-4 text-slate-400 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="নাম, ভিসা বা পাসপোর্ট নং খুঁজুন..."
              className="w-full pl-9 pr-3 py-1.5 bg-white border border-slate-200 focus:border-sky-500 focus:ring-1 focus:ring-sky-500 text-xs rounded-xl outline-none font-medium placeholder:text-slate-400"
            />
          </div>

          <button
            type="button"
            onClick={onOpenDriveModal}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-sky-50 hover:bg-sky-100 text-sky-700 font-bold text-xs rounded-xl border border-sky-200 transition-colors cursor-pointer whitespace-nowrap"
          >
            <Cloud className="w-3.5 h-3.5 text-sky-600" />
            <span>Google ড্রাইভ ব্যাকআপ</span>
          </button>
        </div>

        {/* Success Alert */}
        {successMessage && (
          <div className="mx-6 mt-4 p-2.5 bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs font-semibold rounded-xl flex items-center gap-2">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span>{successMessage}</span>
          </div>
        )}

        {/* Record List */}
        <div className="p-6 overflow-y-auto space-y-3 flex-1">
          {filteredRecords.length === 0 ? (
            <div className="py-12 text-center space-y-2">
              <FileText className="w-10 h-10 text-slate-300 mx-auto" />
              <p className="text-sm font-semibold text-slate-600">কোনো রেকর্ড পাওয়া যায়নি</p>
              <p className="text-xs text-slate-400">
                ভিসা তৈরি করে "সংরক্ষণ করুন" অথবা "Google ড্রাইভে ব্যাকআপ" রাখুন
              </p>
            </div>
          ) : (
            filteredRecords.map((record) => {
              const issueYMD = formatToYYYYMMDD(record.data.issueDate);
              const expiryYMD = formatToYYYYMMDD(record.data.expiryDate);

              return (
                <div
                  key={record.id}
                  className="bg-white border border-slate-200 hover:border-sky-300 rounded-xl p-4 transition-all shadow-xs hover:shadow-md flex flex-col sm:flex-row sm:items-center justify-between gap-4"
                >
                  <div className="space-y-1.5">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="text-xs font-bold text-slate-950 flex items-center gap-1.5">
                        <User className="w-3.5 h-3.5 text-sky-600" />
                        <span>{record.data.nameEnglish || 'Unknown Applicant'}</span>
                      </span>
                      {record.driveWebViewLink && (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 bg-sky-100 text-sky-800 text-[10px] font-bold rounded-md">
                          <Cloud className="w-3 h-3 text-sky-600" />
                          <span>Google Drive Synced</span>
                        </span>
                      )}
                    </div>

                    <div className="flex items-center gap-3 text-xs text-slate-600 flex-wrap font-mono">
                      <span className="flex items-center gap-1 text-slate-700 font-bold">
                        <CreditCard className="w-3.5 h-3.5 text-slate-400" />
                        <span>ভিসা: {record.data.visaNumber}</span>
                      </span>
                      <span>•</span>
                      <span>পাসপোর্ট: {record.data.passportNumber || 'N/A'}</span>
                      <span>•</span>
                      <span>রেফারেন্স: {record.data.referenceNumber}</span>
                    </div>

                    <div className="flex items-center gap-2 text-[11px] text-slate-500 font-mono">
                      <Calendar className="w-3 h-3 text-slate-400" />
                      <span>ইস্যু: {issueYMD} (আজকের তারিখ)</span>
                      <span>|</span>
                      <span>মেয়াদ (৪ মাস): {expiryYMD}</span>
                    </div>
                  </div>

                  {/* Actions */}
                  <div className="flex items-center gap-2 shrink-0 self-end sm:self-center">
                    <button
                      type="button"
                      onClick={() => handleSelect(record)}
                      className="px-3 py-1.5 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl shadow-xs active:scale-98 transition-all cursor-pointer"
                    >
                      ডকুমেন্ট লোড করুন
                    </button>

                    <button
                      type="button"
                      onClick={() => handleDuplicate(record)}
                      className="inline-flex items-center gap-1 px-2.5 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs rounded-xl transition-colors cursor-pointer"
                      title="নতুন র‍্যান্ডম ৩৫/৩৭ নম্বর দিয়ে ডুপ্লিকেট করুন"
                    >
                      <Copy className="w-3.5 h-3.5 text-slate-500" />
                      <span className="hidden md:inline">নতুন নম্বর</span>
                    </button>

                    {record.driveWebViewLink && (
                      <a
                        href={record.driveWebViewLink}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="p-1.5 text-sky-600 hover:bg-sky-50 border border-sky-200 rounded-lg transition-colors"
                        title="Google ড্রাইভে দেখুন"
                      >
                        <ExternalLink className="w-4 h-4" />
                      </a>
                    )}

                    <button
                      type="button"
                      onClick={() => handleDelete(record)}
                      className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors cursor-pointer"
                      title="ডিলিট করুন"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer */}
        <div className="bg-slate-50 border-t border-slate-200 px-6 py-3 flex items-center justify-between text-xs text-slate-500">
          <span>মোট সংরক্ষিত: {records.length}</span>
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
