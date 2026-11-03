import React from 'react';
import { Wifi, WifiOff, Cloud, RefreshCw, CheckCircle2 } from 'lucide-react';
import { useOnlineStatus } from '../hooks/useOnlineStatus';

interface SyncIndicatorProps {
  isDriveConnected: boolean;
  pendingCount: number;
  isSyncing: boolean;
  onTriggerSync?: () => void;
  onOpenDriveModal?: () => void;
}

export const NetworkSyncIndicator: React.FC<SyncIndicatorProps> = ({
  isDriveConnected,
  pendingCount,
  isSyncing,
  onTriggerSync,
  onOpenDriveModal,
}) => {
  const isOnline = useOnlineStatus();

  return (
    <div className="flex items-center gap-1.5 sm:gap-2">
      {/* Network Status Badge */}
      <div
        className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-bold border transition-colors ${
          isOnline
            ? 'bg-emerald-50 text-emerald-700 border-emerald-200'
            : 'bg-amber-50 text-amber-800 border-amber-300'
        }`}
        title={isOnline ? 'ইন্টারনেট সংযুক্ত' : 'অফলাইন মোড (ইন্টারনেট নেই)'}
      >
        {isOnline ? (
          <>
            <Wifi className="w-3.5 h-3.5 text-emerald-600" />
            <span className="hidden sm:inline">অনলাইন</span>
          </>
        ) : (
          <>
            <WifiOff className="w-3.5 h-3.5 text-amber-600 animate-pulse" />
            <span>অফলাইন</span>
          </>
        )}
      </div>

      {/* Drive Sync Status Badge */}
      {isDriveConnected ? (
        <button
          type="button"
          onClick={onTriggerSync}
          disabled={!isOnline || isSyncing || pendingCount === 0}
          className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full text-[11px] font-semibold border transition-all cursor-pointer ${
            isSyncing
              ? 'bg-sky-50 text-sky-700 border-sky-300'
              : pendingCount > 0
              ? 'bg-amber-50 text-amber-800 border-amber-300 hover:bg-amber-100'
              : 'bg-slate-50 text-slate-600 border-slate-200'
          }`}
          title={
            isSyncing
              ? 'ড্রাইভে ব্যাকআপ সিঙ্ক হচ্ছে...'
              : pendingCount > 0
              ? `${pendingCount} টি আনসিঙ্কড রেকর্ড ড্রাইভে পাঠানোর জন্য ক্লিক করুন`
              : 'ড্রাইভের সাথে সম্পূর্ণ সিঙ্কড'
          }
        >
          {isSyncing ? (
            <>
              <RefreshCw className="w-3.5 h-3.5 text-sky-600 animate-spin" />
              <span>সিঙ্ক হচ্ছে...</span>
            </>
          ) : pendingCount > 0 ? (
            <>
              <Cloud className="w-3.5 h-3.5 text-amber-600" />
              <span>
                {pendingCount} পেন্ডিং {isOnline && 'সিঙ্ক'}
              </span>
            </>
          ) : (
            <>
              <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
              <span className="hidden md:inline">সিঙ্কড</span>
            </>
          )}
        </button>
      ) : (
        <button
          type="button"
          onClick={onOpenDriveModal}
          className="inline-flex items-center gap-1 px-2 py-1 rounded-full text-[11px] font-medium bg-slate-100 hover:bg-slate-200 text-slate-600 border border-slate-200 transition-colors cursor-pointer"
          title="Google ড্রাইভ কানেক্ট করুন"
        >
          <Cloud className="w-3.5 h-3.5 text-slate-500" />
          <span className="hidden sm:inline">ড্রাইভ অফ</span>
        </button>
      )}
    </div>
  );
};
