import React from 'react';
import { KuwaitEVisaData } from '../types';
import { generateKuwaitMrz, formatMrzLine1Name } from '../utils/mrzGenerator';
import { formatToYYYYMMDD } from '../utils/dateFormatter';
import { PadCalibration, defaultCalibration, getLineStyle, getLineOffsets } from '../services/padService';
import { MrzLine } from './MrzRenderer';

interface PadOverlayProps {
  data: KuwaitEVisaData;
  documentRef?: React.RefObject<HTMLDivElement | null>;
  zoom?: number;
  padImageUrl?: string | null;
  showPadBackground?: boolean;
  calibration?: PadCalibration;
}

export const KuwaitEVisaPadOverlay: React.FC<PadOverlayProps> = ({
  data,
  documentRef,
  zoom = 1,
  padImageUrl,
  showPadBackground = true,
  calibration = defaultCalibration,
}) => {
  // Generate MRZ lines matching ICAO / Kuwait standard
  const computedMrz = generateKuwaitMrz({
    fullNameEnglish: data.nameEnglish,
    visaNumber: data.visaNumber,
    referenceNumber: data.referenceNumber,
    nationalityEnglish: data.nationalityEnglish,
    dateOfBirth: data.birthDate,
    sex: data.sexEnglish,
    issueDate: data.issueDate,
  });

  const rawMrz1 = data.customMrzLine1 || computedMrz.line1;
  const mrzLine1 = rawMrz1 && !rawMrz1.startsWith('VHKW') ? formatMrzLine1Name(rawMrz1) : rawMrz1;
  const mrzLine2 = data.customMrzLine2 || computedMrz.line2;

  // Global Offsets
  const ox = calibration.offsetX || 0;
  const oy = calibration.offsetY || 0;

  // 1. Right Column Margin (Image 3: Name, Visa No, Issue Date, Ref, Birth Date)
  const rightColMargin = 84 + (calibration.rightColumnOffset || 0) - ox;

  // 2. Expiry Date Alignment
  const expiryX = 84 + ox + (calibration.expiryDateXOffset || 0);

  // 3. Passport No & Dates Centered Alignment
  const passportCenterX = 138 + ox + (calibration.passportCenterXOffset || 0);

  // 4. MRZ Chevron < scale (squash & width)
  const chevronScaleY = calibration.mrzChevronScaleY !== undefined ? calibration.mrzChevronScaleY : 0.75;
  const chevronScaleX = calibration.mrzChevronScaleX !== undefined ? calibration.mrzChevronScaleX : 1.0;

  // Computed Individual Line Styles
  const expiryStyle = getLineStyle('expiryDate', calibration, data.fontFamily);
  const passportNoStyle = getLineStyle('passportNumber', calibration, data.fontFamily);
  const passportIssueStyle = getLineStyle('passportIssueDate', calibration, data.fontFamily);
  const passportExpiryStyle = getLineStyle('passportExpiryDate', calibration, data.fontFamily);
  const visaNoStyle = getLineStyle('visaNumber', calibration, data.fontFamily);
  const issueDateStyle = getLineStyle('issueDate', calibration, data.fontFamily);
  const refNoStyle = getLineStyle('referenceNumber', calibration, data.fontFamily);
  const arabicNameStyle = getLineStyle('nameArabic', calibration, data.fontFamily);
  const englishNameStyle = getLineStyle('nameEnglish', calibration, data.fontFamily);
  const birthDateStyle = getLineStyle('birthDate', calibration, data.fontFamily);
  const mrz1Style = getLineStyle('mrzLine1', calibration, 'Orator Std');
  const mrz2Style = getLineStyle('mrzLine2', calibration, 'Orator Std');

  // Computed Individual Line Offsets (Individual Up / Down & Left / Right)
  const visaOffsets = getLineOffsets('visaNumber', calibration);
  const issueDateOffsets = getLineOffsets('issueDate', calibration);
  const refNoOffsets = getLineOffsets('referenceNumber', calibration);
  const arabicNameOffsets = getLineOffsets('nameArabic', calibration);
  const englishNameOffsets = getLineOffsets('nameEnglish', calibration);
  const birthDateOffsets = getLineOffsets('birthDate', calibration);
  const expiryOffsets = getLineOffsets('expiryDate', calibration);
  const passportNoOffsets = getLineOffsets('passportNumber', calibration);
  const passportIssueOffsets = getLineOffsets('passportIssueDate', calibration);
  const passportExpiryOffsets = getLineOffsets('passportExpiryDate', calibration);
  const mrz1Offsets = getLineOffsets('mrzLine1', calibration);
  const mrz2Offsets = getLineOffsets('mrzLine2', calibration);

  const fontStyle = {
    fontFamily: `"${data.fontFamily || 'Myanmar Text'}", "Cairo", "Segoe UI", Arial, sans-serif`,
  };

  return (
    <div
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: 'top center',
      }}
      className="transition-transform duration-150 ease-out"
    >
      {/* A4 Canvas: 794px x 1123px (Standard A4 @ 96dpi) */}
      <div
        ref={documentRef}
        id="kuwait-evisa-print-canvas"
        style={{
          ...fontStyle,
          backgroundImage:
            showPadBackground && padImageUrl ? `url(${padImageUrl})` : 'none',
          backgroundSize: '100% 100%',
          backgroundRepeat: 'no-repeat',
          backgroundPosition: 'top center',
        }}
        className="w-[794px] h-[1123px] bg-white text-black mx-auto relative select-text box-border shadow-2xl overflow-hidden print:shadow-none print:m-0"
      >
        {/* Helper watermark if no pad uploaded and previewing with background */}
        {!padImageUrl && showPadBackground && (
          <div className="absolute inset-0 border-2 border-dashed border-sky-300/40 pointer-events-none flex flex-col items-center justify-start pt-16 text-center text-slate-400 select-none print:hidden">
            <span className="text-xs font-semibold px-3 py-1 bg-sky-50 text-sky-700 rounded-full border border-sky-200">
              প্যাড ওভারলে মোড চালু আছে
            </span>
            <span className="text-[11px] text-slate-400 mt-2 max-w-sm">
              আপনার অরিজিনাল কুয়েত ভিসা প্যাড ইমেজ আপলোড করুন অথবা প্রিন্টারে ফাঁকা প্যাড দিয়ে প্রিন্ট করুন।
            </span>
          </div>
        )}

        {/* ============================================================== */}
        {/* EXACT DATA COORDINATES WITH INDIVIDUAL POSITION & FONT CONTROLS */}
        {/* ============================================================== */}

        {/* -------------------------------------------------------------- */}
        {/* 1. EXPIRY DATE (Individual X, Y & Custom Font) */}
        {/* -------------------------------------------------------------- */}
        {expiryStyle.display !== 'none' && (
          <div
            style={{
              top: `${368 + oy + expiryOffsets.y}px`,
              left: `${expiryX + expiryOffsets.x}px`,
              ...expiryStyle,
            }}
            className="absolute font-bold text-slate-950 tracking-wide whitespace-nowrap select-all font-myanmar-bold"
          >
            {formatToYYYYMMDD(data.expiryDate)}
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* 2. PASSPORT NO & DATES (Individual X, Y & Custom Fonts) */}
        {/* -------------------------------------------------------------- */}
        
        {/* 2.1 PASSPORT NUMBER */}
        {passportNoStyle.display !== 'none' && (
          <div
            style={{
              top: `${464 + oy + passportNoOffsets.y}px`,
              left: `${passportCenterX + passportNoOffsets.x}px`,
              transform: 'translateX(-50%)',
              ...passportNoStyle,
            }}
            className="absolute font-bold text-slate-950 tracking-wider uppercase text-center select-all whitespace-nowrap font-myanmar-bold"
          >
            {data.passportNumber}
          </div>
        )}

        {/* 2.2 PASSPORT ISSUE DATE (2023-06-07) */}
        {passportIssueStyle.display !== 'none' && (
          <div
            style={{
              top: `${500 + oy + passportIssueOffsets.y}px`,
              left: `${passportCenterX + passportIssueOffsets.x}px`,
              transform: 'translateX(-50%)',
              ...passportIssueStyle,
            }}
            className="absolute font-bold text-slate-950 tracking-wide text-center select-all whitespace-nowrap font-myanmar-bold"
          >
            {formatToYYYYMMDD(data.passportIssueDate)}
          </div>
        )}

        {/* 2.3 PASSPORT EXPIRY DATE (2033-06-06) */}
        {passportExpiryStyle.display !== 'none' && (
          <div
            style={{
              top: `${522 + oy + passportExpiryOffsets.y}px`,
              left: `${passportCenterX + passportExpiryOffsets.x}px`,
              transform: 'translateX(-50%)',
              ...passportExpiryStyle,
            }}
            className="absolute font-bold text-slate-950 tracking-wide text-center select-all whitespace-nowrap font-myanmar-bold"
          >
            {formatToYYYYMMDD(data.passportExpiryDate)}
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* 3. RIGHT COLUMN (Image 3: Name, Visa No, Dates, Reference No) */}
        {/* -------------------------------------------------------------- */}

        {/* 3.1 VISA NUMBER */}
        {visaNoStyle.display !== 'none' && (
          <div
            style={{
              top: `${322 + oy + visaOffsets.y}px`,
              right: `${rightColMargin - visaOffsets.x}px`,
              ...visaNoStyle,
            }}
            className="absolute font-bold text-slate-950 tracking-wide text-right whitespace-nowrap select-all font-myanmar-bold"
          >
            {data.visaNumber}
          </div>
        )}

        {/* 3.2 ISSUE DATE */}
        {issueDateStyle.display !== 'none' && (
          <div
            style={{
              top: `${368 + oy + issueDateOffsets.y}px`,
              right: `${rightColMargin - issueDateOffsets.x}px`,
              ...issueDateStyle,
            }}
            className="absolute font-bold text-slate-950 tracking-wide text-right whitespace-nowrap select-all font-myanmar-bold"
          >
            {formatToYYYYMMDD(data.issueDate)}
          </div>
        )}

        {/* 3.3 REFERENCE NUMBER */}
        {refNoStyle.display !== 'none' && (
          <div
            style={{
              top: `${413 + oy + refNoOffsets.y}px`,
              right: `${rightColMargin - refNoOffsets.x}px`,
              ...refNoStyle,
            }}
            className="absolute font-bold text-slate-950 tracking-wide text-right whitespace-nowrap select-all font-myanmar-bold"
          >
            {data.referenceNumber}
          </div>
        )}

        {/* 3.4 ARABIC NAME */}
        {arabicNameStyle.display !== 'none' && (
          <div
            dir="rtl"
            style={{
              top: `${462 + oy + (calibration.nameYOffset || 0) + arabicNameOffsets.y}px`,
              right: `${rightColMargin - (calibration.nameXOffset || 0) - arabicNameOffsets.x}px`,
              ...arabicNameStyle,
            }}
            className="absolute font-bold text-slate-950 text-right whitespace-nowrap select-all leading-tight font-myanmar-bold"
          >
            {data.nameArabic}
          </div>
        )}

        {/* 3.5 ENGLISH NAME (Adjustable Inter-Line Spacing) */}
        {englishNameStyle.display !== 'none' && (
          <div
            style={{
              top: `${488 + oy + (calibration.nameYOffset || 0) + (calibration.nameLineSpacing !== undefined ? calibration.nameLineSpacing : (data.nameLineSpacing || 0)) + englishNameOffsets.y}px`,
              right: `${rightColMargin - (calibration.nameXOffset || 0) - englishNameOffsets.x}px`,
              ...englishNameStyle,
            }}
            className="absolute font-bold text-slate-950 text-right whitespace-nowrap uppercase tracking-wide select-all font-myanmar-bold"
          >
            {data.nameEnglish}
          </div>
        )}

        {/* 3.6 BIRTH DATE */}
        {birthDateStyle.display !== 'none' && (
          <div
            style={{
              top: `${526 + oy + birthDateOffsets.y}px`,
              right: `${rightColMargin - birthDateOffsets.x}px`,
              ...birthDateStyle,
            }}
            className="absolute font-bold text-slate-950 tracking-wide text-right whitespace-nowrap select-all font-myanmar-bold"
          >
            {formatToYYYYMMDD(data.birthDate)}
          </div>
        )}

        {/* -------------------------------------------------------------- */}
        {/* 4. MRZ ZONE (Image 4: Individual Lines with Custom Font/Size) */}
        {/* -------------------------------------------------------------- */}
        <div
          style={{
            top: `${622 + oy + (calibration.mrzYOffset || 0)}px`,
            left: `${78 + ox + (calibration.mrzXOffset || 0)}px`,
          }}
          className="absolute leading-none uppercase whitespace-nowrap select-all flex flex-col gap-[7px]"
        >
          {mrz1Style.display !== 'none' && (
            <div style={{
              ...mrz1Style,
              transform: (mrz1Offsets.x !== 0 || mrz1Offsets.y !== 0) ? `translate(${mrz1Offsets.x}px, ${mrz1Offsets.y}px)` : undefined,
            }}>
              <MrzLine
                line={mrzLine1}
                chevronScaleY={chevronScaleY}
                chevronScaleX={chevronScaleX}
                letterSpacing={mrz1Style.letterSpacing || '0.11em'}
                strokeWidth={calibration?.mrzStrokeWidth ?? 0.22}
                fontWeight={mrz1Style.fontWeight || calibration?.mrzFontWeight || 'bold'}
                color={mrz1Style.color || calibration?.mrzColor}
                opacity={calibration?.mrzOpacity}
              />
            </div>
          )}
          {mrz2Style.display !== 'none' && (
            <div style={{
              ...mrz2Style,
              transform: (mrz2Offsets.x !== 0 || mrz2Offsets.y !== 0) ? `translate(${mrz2Offsets.x}px, ${mrz2Offsets.y}px)` : undefined,
            }}>
              <MrzLine
                line={mrzLine2}
                isLine2={true}
                bgdScale={calibration?.mrz2BgdScale ?? 0.82}
                chevronScaleY={chevronScaleY}
                chevronScaleX={chevronScaleX}
                letterSpacing={mrz2Style.letterSpacing || '0.11em'}
                strokeWidth={calibration?.mrzStrokeWidth ?? 0.22}
                fontWeight={mrz2Style.fontWeight || calibration?.mrzFontWeight || 'bold'}
                color={mrz2Style.color || calibration?.mrzColor}
                opacity={calibration?.mrzOpacity}
              />
            </div>
          )}
        </div>
      </div>
    </div>
  );
};
