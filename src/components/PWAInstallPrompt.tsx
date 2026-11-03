import React, { useState } from 'react';
import { Download, Smartphone, X } from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

export const PWAInstallPrompt: React.FC = () => {
  const { isInstallable, isInstalled, isIOS, install } = usePWAInstall();
  const [showIosGuide, setShowIosGuide] = useState(false);
  const [dismissed, setDismissed] = useState(false);

  // If already installed or dismissed, do not show
  if (isInstalled || dismissed) {
    return null;
  }

  // If neither installable nor iOS, return null
  if (!isInstallable && !isIOS) {
    return null;
  }

  const handleInstallClick = async () => {
    if (isIOS) {
      setShowIosGuide(true);
      return;
    }
    const outcome = await install();
    if (outcome === 'accepted') {
      setDismissed(true);
    }
  };

  return (
    <>
      <div className="bg-gradient-to-r from-sky-600 via-blue-600 to-indigo-700 text-white px-3 sm:px-4 py-2 sm:py-2.5 shadow-md flex items-center justify-between text-xs transition-all">
        <div className="flex items-center gap-2.5 min-w-0">
          <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center shrink-0">
            <Smartphone className="w-4 h-4 text-white" />
          </div>
          <div className="truncate">
            <div className="font-bold text-white text-xs sm:text-sm flex items-center gap-1.5">
              <span>মোবাইল অ্যাপ ইনস্টল করুন</span>
              <span className="hidden sm:inline-block bg-emerald-400/20 text-emerald-300 text-[10px] px-1.5 py-0.5 rounded-full font-semibold border border-emerald-400/30">
                অফলাইন সাপোর্ট
              </span>
            </div>
            <p className="text-[11px] text-sky-100 hidden md:block">
              এক ক্লিকে মোবাইল হোমস্ক্রিনে অ্যাপ আইকন যোগ করে ইন্টারনেট ছাড়াও সরাসরি ব্যবহার করুন
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2 shrink-0 ml-2">
          <button
            type="button"
            onClick={handleInstallClick}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white text-blue-700 hover:bg-sky-50 font-bold text-xs rounded-lg shadow-sm transition-all active:scale-95 cursor-pointer"
          >
            <Download className="w-3.5 h-3.5" />
            <span>ইনস্টল</span>
          </button>
          <button
            type="button"
            onClick={() => setDismissed(true)}
            className="p-1 text-sky-200 hover:text-white rounded-md hover:bg-white/10 transition-colors cursor-pointer"
            aria-label="Dismiss banner"
          >
            <X className="w-4 h-4" />
          </button>
        </div>
      </div>

      {/* iOS Safari Guided Install Modal */}
      {showIosGuide && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-end sm:items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-sm w-full p-5 text-slate-800 shadow-2xl border border-slate-200 animate-slide-up">
            <div className="flex items-center justify-between pb-3 border-b border-slate-100">
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-sky-100 text-sky-600 flex items-center justify-center">
                  <Smartphone className="w-4 h-4" />
                </div>
                <h3 className="font-bold text-sm text-slate-900">iPhone / iPad এ ইনস্টল</h3>
              </div>
              <button
                type="button"
                onClick={() => setShowIosGuide(false)}
                className="p-1 rounded-lg hover:bg-slate-100 text-slate-500"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="py-4 space-y-3 text-xs text-slate-600">
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  ১
                </span>
                <p>
                  Safari ব্রাউজারের নিচে <strong>শেয়ার বাটন (Share) চাপুন</strong>
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  ২
                </span>
                <p>
                  নিচে স্ক্রোল করে <strong>"Add to Home Screen"</strong> চাপুন
                </p>
              </div>
              <div className="flex items-start gap-2.5">
                <span className="w-5 h-5 rounded-full bg-sky-600 text-white font-bold flex items-center justify-center shrink-0 text-[11px]">
                  ৩
                </span>
                <p>
                  উপরে ডানদিকে <strong>"Add"</strong> ট্যাপ করুন
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowIosGuide(false)}
              className="w-full py-2 bg-sky-600 hover:bg-sky-700 text-white font-bold rounded-xl text-xs transition-colors cursor-pointer"
            >
              বুঝেছি
            </button>
          </div>
        </div>
      )}
    </>
  );
};
