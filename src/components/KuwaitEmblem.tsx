import React from 'react';

interface EmblemProps {
  className?: string;
  size?: number;
}

export const KuwaitEmblem: React.FC<EmblemProps> = ({ className = '', size = 56 }) => {
  return (
    <div className={`relative flex items-center justify-center ${className}`} style={{ width: size, height: size }}>
      <svg
        viewBox="0 0 160 160"
        width={size}
        height={size}
        className="w-full h-full drop-shadow-xs"
        fill="none"
        xmlns="http://www.w3.org/2000/svg"
      >
        {/* Outer Falcon Wings */}
        <g stroke="#3a6073" strokeWidth="1.5" fill="#e9c874">
          <path d="M 80 15 C 65 30 40 45 20 70 C 15 80 25 90 35 85 C 45 80 60 70 70 60 C 65 75 55 95 48 115 C 55 110 68 95 75 80 C 72 95 70 115 72 130 C 76 135 84 135 88 130 C 90 115 88 95 85 80 C 92 95 105 110 112 115 C 105 95 95 75 90 60 C 100 70 115 80 125 85 C 135 90 145 80 140 70 C 120 45 95 30 80 15 Z" fill="#dfad3b" stroke="#7a550d" />
        </g>
        {/* Falcon Head & Crest */}
        <path d="M 80 12 C 77 18 76 25 80 32 C 84 25 83 18 80 12 Z" fill="#ffffff" stroke="#7a550d" strokeWidth="1" />
        <circle cx="80" cy="22" r="2.5" fill="#111" />
        {/* Central Disc / Ring */}
        <circle cx="80" cy="78" r="42" fill="#f8fafc" stroke="#1d4ed8" strokeWidth="2.5" />
        <circle cx="80" cy="78" r="38" fill="#e0f2fe" stroke="#3b82f6" strokeWidth="1" strokeDasharray="2 2" />
        {/* Kuwait Traditional Dhow (Boom ship) */}
        <path d="M 43 78 A 37 37 0 0 0 117 78 Z" fill="#0284c7" />
        <path d="M 45 85 Q 80 92 115 85 A 37 37 0 0 1 80 115 A 37 37 0 0 1 45 85 Z" fill="#0369a1" />
        
        {/* Sea waves */}
        <path d="M 45 82 Q 60 79 75 82 T 105 82 T 115 82" stroke="#ffffff" strokeWidth="1.5" strokeLinecap="round" fill="none" opacity="0.8" />
        
        {/* Dhow Hull */}
        <path d="M 52 82 Q 80 94 108 80 Q 95 88 65 88 Z" fill="#78350f" stroke="#451a03" strokeWidth="1" />
        {/* Dhow White Lateen Sails */}
        <path d="M 68 50 L 92 78 L 68 76 Z" fill="#ffffff" stroke="#94a3b8" strokeWidth="1" />
        <path d="M 68 50 L 60 76 L 68 76 Z" fill="#f1f5f9" stroke="#94a3b8" strokeWidth="0.8" />
        {/* Mast */}
        <line x1="68" y1="46" x2="68" y2="82" stroke="#451a03" strokeWidth="2" />
        <line x1="88" y1="58" x2="88" y2="80" stroke="#451a03" strokeWidth="1.5" />
        <path d="M 88 58 L 102 78 L 88 77 Z" fill="#ffffff" stroke="#94a3b8" strokeWidth="0.8" />
        {/* Kuwait Flag Shield on Falcon Breast */}
        <g transform="translate(80, 118)">
          <path d="M -14 -16 L 14 -16 C 14 -4 12 14 0 22 C -12 14 -14 -4 -14 -16 Z" fill="#ffffff" stroke="#0f172a" strokeWidth="1.5" />
          <path d="M -13 -15 L 13 -15 L 13 -4 L -13 -4 Z" fill="#16a34a" />
          <path d="M -13 -4 L 13 -4 L 13 6 L -13 6 Z" fill="#ffffff" />
          <path d="M -13 6 L 13 6 C 12 13 0 20 0 20 C 0 20 -12 13 -13 6 Z" fill="#dc2626" />
          <path d="M -14 -16 L -5 -4 L -5 6 L -14 12 Z" fill="#0f172a" />
        </g>
      </svg>
    </div>
  );
};

export const RasedLogo: React.FC<{ size?: number }> = ({ size = 32 }) => {
  return (
    <div className="flex items-center gap-1.5">
      <div style={{ width: size, height: size }} className="relative flex items-center justify-center">
        <svg viewBox="0 0 100 100" width={size} height={size} fill="none" xmlns="http://www.w3.org/2000/svg">
          <path d="M 50 10 L 85 28 L 85 65 C 85 82 50 94 50 94 C 50 94 15 82 15 65 L 15 28 Z" fill="#0284c7" stroke="#0369a1" strokeWidth="3" />
          <path d="M 50 20 L 75 35 L 75 62 C 75 75 50 84 50 84 C 50 84 25 75 25 62 L 25 35 Z" fill="#0f172a" opacity="0.15" />
          {/* Eye Icon */}
          <path d="M 30 52 C 38 42 62 42 70 52 C 62 62 38 62 30 52 Z" fill="#ffffff" />
          <circle cx="50" cy="52" r="6" fill="#0284c7" />
          <circle cx="52" cy="50" r="2" fill="#ffffff" />
        </svg>
      </div>
      <div className="flex flex-col">
        <span className="text-[11px] font-bold text-slate-800 leading-tight">راصد</span>
        <span className="text-[9px] font-semibold text-sky-700 leading-none">RASED</span>
      </div>
    </div>
  );
};
