import React, { useEffect, useState } from 'react';
import QRCode from 'qrcode';
import { KuwaitEVisaData } from '../types';
import { KuwaitEmblem, RasedLogo } from './KuwaitEmblem';
import { generateKuwaitMrz, formatMrzLine1Name } from '../utils/mrzGenerator';
import { formatToYYYYMMDD } from '../utils/dateFormatter';
import { KuwaitEVisaPadOverlay } from './KuwaitEVisaPadOverlay';
import { PadCalibration, getLineStyle } from '../services/padService';
import { MrzLine } from './MrzRenderer';

interface DocumentProps {
  data: KuwaitEVisaData;
  documentRef?: React.RefObject<HTMLDivElement | null>;
  zoom?: number;
  documentMode?: 'pad' | 'full';
  padImageUrl?: string | null;
  showPadBackground?: boolean;
  calibration?: PadCalibration;
}

const KuwaitEVisaFullDocument: React.FC<DocumentProps> = ({
  data,
  documentRef,
  zoom = 1,
  calibration,
}) => {
  const [mainQrCodeUrl, setMainQrCodeUrl] = useState<string>('');
  const [instructionsQrCodeUrl, setInstructionsQrCodeUrl] = useState<string>('');

  // MRZ generation matching exact ICAO/Kuwait eVisa standard
  const computedMrz = generateKuwaitMrz({
    fullNameEnglish: data.nameEnglish,
    visaNumber: data.visaNumber,
    referenceNumber: data.referenceNumber,
    nationalityEnglish: data.nationalityEnglish,
    dateOfBirth: data.birthDate,
    sex: data.sexEnglish,
    issueDate: data.issueDate,
  });

  const rawLine1 = data.customMrzLine1 || computedMrz.line1;
  const line1 = rawLine1 && !rawLine1.startsWith('VHKW') ? formatMrzLine1Name(rawLine1) : rawLine1;

  const mrz = {
    line1,
    line2: data.customMrzLine2 || computedMrz.line2,
  };

  // Generate real QR codes
  useEffect(() => {
    const mainPayload = `https://evisa.moi.gov.kw/verify?v=${data.visaNumber}&r=${data.referenceNumber}&p=${data.passportNumber}&dob=${data.birthDate}&exp=${data.expiryDate}`;
    QRCode.toDataURL(mainPayload, {
      width: 140,
      margin: 1,
      color: {
        dark: '#0f3a56',
        light: '#ffffff',
      },
    })
      .then((url) => setMainQrCodeUrl(url))
      .catch((err) => console.error('QR 1 error:', err));

    const instructionsPayload = `https://evisa.moi.gov.kw/instructions?lang=en&doc=${data.visaNumber}`;
    QRCode.toDataURL(instructionsPayload, {
      width: 105,
      margin: 1,
      color: {
        dark: '#1e293b',
        light: '#ffffff',
      },
    })
      .then((url) => setInstructionsQrCodeUrl(url))
      .catch((err) => console.error('QR 2 error:', err));
  }, [
    data.visaNumber,
    data.referenceNumber,
    data.passportNumber,
    data.birthDate,
    data.expiryDate,
  ]);

  const ribbonText =
    'Electronic Visa • Electronic Visa • Electronic Visa • Electronic Visa • Electronic Visa • Electronic Visa • Electronic Visa • ';

  const fontStyle = {
    fontFamily: `"${data.fontFamily || 'Myanmar Text'}", "MyanmarText", "Noto Sans Myanmar", "Segoe UI", Tahoma, sans-serif`,
    fontWeight: 700,
  };

  return (
    <div
      style={{
        transform: `scale(${zoom})`,
        transformOrigin: 'top center',
      }}
      className="transition-transform duration-150 ease-out"
    >
      {/* Outer A4 Canvas Container */}
      <div
        ref={documentRef}
        id="kuwait-evisa-print-canvas"
        style={fontStyle}
        className="w-[794px] min-h-[1123px] bg-white text-slate-900 mx-auto px-8 py-7 flex flex-col justify-between shadow-2xl relative select-text box-border border border-slate-300"
      >
        {/* OUTER RECTANGLE BORDER FRAME */}
        <div className="w-full flex-1 flex flex-col justify-between border border-slate-300/80 rounded-xs p-3 relative bg-white">
          
          {/* HEADER SECTION */}
          <div className="w-full">
            <div className="flex items-center justify-between px-2 pt-1 pb-1 relative">
              
              {/* Subtle background crests in header */}
              <div className="absolute left-[28%] top-0 opacity-15 pointer-events-none">
                <KuwaitEmblem size={55} />
              </div>
              <div className="absolute right-[28%] top-0 opacity-15 pointer-events-none">
                <KuwaitEmblem size={55} />
              </div>

              {/* Left Header: English */}
              <div className="flex flex-col text-left">
                <h1 className="text-[21px] font-black tracking-tight text-[#164971] uppercase leading-none font-sans">
                  State of Kuwait
                </h1>
                <span className="text-[17px] font-bold text-[#1f587d] tracking-normal leading-tight mt-0.5">
                  Electronic Visa
                </span>
              </div>

              {/* Center Header: Official Kuwait Emblem */}
              <div className="flex justify-center -mt-1 relative z-10">
                <KuwaitEmblem size={70} />
              </div>

              {/* Right Header: Arabic */}
              <div className="flex flex-col text-right" dir="rtl">
                <h1 className="text-[23px] font-black text-[#164971] leading-none font-serif">
                  دولة الكويت
                </h1>
                <span className="text-[17px] font-bold text-[#1f587d] leading-tight mt-0.5 font-serif">
                  تأشيرة إلكترونية
                </span>
              </div>
            </div>

            {/* Micro-text Security Ribbon Bar */}
            <div className="w-full overflow-hidden border-y border-slate-300 bg-slate-50/80 py-[2.5px] mt-1 mb-2.5">
              <div className="text-[7px] font-semibold text-slate-400 tracking-wider whitespace-nowrap opacity-90 select-none">
                {ribbonText}
              </div>
            </div>
          </div>

          {/* MAIN EVISA CARD CONTAINER (BOX WITH TEAL BORDER & SECURITY WATERMARKS) */}
          <div className="relative my-1 rounded-2xl border-2 border-[#5ba3be] bg-white p-4.5 shadow-2xs overflow-hidden">
            
            {/* Background Security Watermark & Guilloche Rings */}
            <div className="absolute inset-0 pointer-events-none flex items-center justify-center opacity-[0.07] select-none">
              <div className="flex flex-col items-center">
                <KuwaitEmblem size={350} />
                <div className="text-4xl font-extrabold tracking-widest text-[#164e70] mt-1">
                  STATE OF KUWAIT
                </div>
              </div>
            </div>

            {/* Top Bar inside Card: State of Kuwait eVisa */}
            <div className="relative z-10 flex items-center justify-between pb-2 mb-3 border-b border-[#a2cfdf]">
              <div className="flex items-center gap-1.5">
                <span className="text-[13px] font-extrabold text-[#164e70] tracking-wide uppercase">
                  State of Kuwait
                </span>
                <span className="text-[13px] font-extrabold text-[#0284c7]">
                  eVisa
                </span>
              </div>
              <div className="scale-75">
                <KuwaitEmblem size={32} />
              </div>
              <div className="flex items-center gap-1.5 text-right" dir="rtl">
                <span className="text-[14px] font-bold text-[#164e70]">
                  دولة الكويت
                </span>
                <span className="text-[13px] font-bold text-[#0284c7]">
                  تأشيرة إلكترونية
                </span>
              </div>
            </div>

            {/* MAIN FIELDS GRID */}
            <div className="relative z-10 grid grid-cols-2 gap-x-8 gap-y-3.5 text-slate-900">
              
              {/* ROW 1: Visa Type (Left) & Visa Number (Right) */}
              {/* Visa Type */}
              <div className="flex flex-col text-left" style={{ display: getLineStyle('visaType', calibration).display }}>
                <div className="inline-flex items-center justify-between px-2.5 py-0.5 rounded-full bg-[#e1f0f7] text-[11px] font-bold text-slate-700 mb-1 w-full border border-[#c3e3f0]">
                  <span className="text-[#194f73]">Visa Type</span>
                  <span dir="rtl" className="text-[#194f73]">نوع التأشيرة</span>
                </div>
                <div
                  style={getLineStyle('visaType', calibration, data.fontFamily)}
                  className="font-bold text-slate-950 leading-tight pl-1"
                >
                  {data.visaTypeEnglish} - <span dir="rtl">{data.visaTypeArabic}</span>
                </div>
              </div>

              {/* Visa Number */}
              <div className="flex flex-col text-right" style={{ display: getLineStyle('visaNumber', calibration).display }}>
                <div className="inline-flex items-center justify-between px-2.5 py-0.5 rounded-full bg-[#e1f0f7] text-[11px] font-bold text-slate-700 mb-1 w-full border border-[#c3e3f0]">
                  <span className="text-[#194f73]" dir="rtl">رقم التأشيرة</span>
                  <span className="text-[#194f73]">Visa Number</span>
                </div>
                <div
                  style={getLineStyle('visaNumber', calibration, data.fontFamily)}
                  className="font-black text-slate-950 tracking-wider pr-1"
                >
                  {data.visaNumber}
                </div>
              </div>

              {/* ROW 2: Expiry Date (Left) & Issue Date (Right) */}
              {/* Expiry Date */}
              <div className="flex flex-col text-left" style={{ display: getLineStyle('expiryDate', calibration).display }}>
                <div className="inline-flex items-center justify-between px-2.5 py-0.5 rounded-full bg-[#e1f0f7] text-[11px] font-bold text-slate-700 mb-1 w-full border border-[#c3e3f0]">
                  <span className="text-[#194f73]">Expiry Date</span>
                  <span dir="rtl" className="text-[#194f73]">صالحة لغاية</span>
                </div>
                <div
                  style={getLineStyle('expiryDate', calibration, data.fontFamily)}
                  className="font-bold text-slate-950 tracking-wide pl-1"
                >
                  {formatToYYYYMMDD(data.expiryDate)}
                </div>
              </div>

              {/* Issue Date */}
              <div className="flex flex-col text-right" style={{ display: getLineStyle('issueDate', calibration).display }}>
                <div className="inline-flex items-center justify-between px-2.5 py-0.5 rounded-full bg-[#e1f0f7] text-[11px] font-bold text-slate-700 mb-1 w-full border border-[#c3e3f0]">
                  <span className="text-[#194f73]" dir="rtl">تاريخ الاصدار</span>
                  <span className="text-[#194f73]">Issue Date</span>
                </div>
                <div
                  style={getLineStyle('issueDate', calibration, data.fontFamily)}
                  className="font-bold text-slate-950 tracking-wide pr-1"
                >
                  {formatToYYYYMMDD(data.issueDate)}
                </div>
              </div>

              {/* ROW 3: Nationality (Left) & Reference (Right) */}
              {/* Nationality */}
              <div className="flex flex-col text-left" style={{ display: getLineStyle('nationality', calibration).display }}>
                <div className="inline-flex items-center justify-between px-2.5 py-0.5 rounded-full bg-[#e1f0f7] text-[11px] font-bold text-slate-700 mb-1 w-full border border-[#c3e3f0]">
                  <span className="text-[#194f73]">Nationality</span>
                  <span dir="rtl" className="text-[#194f73]">الجنسية</span>
                </div>
                <div
                  style={getLineStyle('nationality', calibration, data.fontFamily)}
                  className="flex items-center justify-between text-slate-950 px-1"
                >
                  <span className="uppercase">{data.nationalityEnglish}</span>
                  <span dir="rtl">
                    {data.nationalityArabic}
                  </span>
                </div>
              </div>

              {/* Reference */}
              <div className="flex flex-col text-right" style={{ display: getLineStyle('referenceNumber', calibration).display }}>
                <div className="inline-flex items-center justify-between px-2.5 py-0.5 rounded-full bg-[#e1f0f7] text-[11px] font-bold text-slate-700 mb-1 w-full border border-[#c3e3f0]">
                  <span className="text-[#194f73]" dir="rtl">المرجع</span>
                  <span className="text-[#194f73]">Reference</span>
                </div>
                <div
                  style={getLineStyle('referenceNumber', calibration, data.fontFamily)}
                  className="font-black text-slate-950 tracking-wider pr-1"
                >
                  {data.referenceNumber}
                </div>
              </div>

              {/* ROW 4: Passport No & Sex (Left) & Name & Birth Date (Right) */}
              {/* Passport No & Sex Column */}
              <div className="flex items-start justify-between">
                {/* Passport No Column */}
                <div className="flex flex-col items-center text-center pl-2" style={{ display: getLineStyle('passportNumber', calibration).display }}>
                  <div className="flex flex-col items-center text-[#194f73] mb-1 leading-tight">
                    <span dir="rtl" className="text-[12px] font-bold">رقم الجواز</span>
                    <span className="text-[12px] font-bold">Passport No.</span>
                  </div>
                  <div
                    style={getLineStyle('passportNumber', calibration, data.fontFamily)}
                    className="font-black text-slate-950 tracking-wider uppercase font-mono"
                  >
                    {data.passportNumber}
                  </div>
                  <div
                    style={{ ...getLineStyle('passportIssueDate', calibration, data.fontFamily), marginTop: '4px' }}
                    className="text-slate-900 font-mono font-bold"
                  >
                    {formatToYYYYMMDD(data.passportIssueDate)}
                  </div>
                  <div
                    style={getLineStyle('passportExpiryDate', calibration, data.fontFamily)}
                    className="text-slate-900 font-mono font-bold"
                  >
                    {formatToYYYYMMDD(data.passportExpiryDate)}
                  </div>
                </div>

                {/* Sex Column */}
                <div className="flex flex-col text-center pr-3">
                  <div className="flex items-baseline justify-center gap-1.5 text-[11px] font-bold text-[#194f73] mb-0.5">
                    <span dir="rtl">الجنس</span>
                    <span>Sex</span>
                  </div>
                  <div className="text-[14px] font-black text-slate-950">
                    {data.sexEnglish}
                  </div>
                  <div className="text-[12.5px] font-bold text-slate-800" dir="rtl">
                    {data.sexArabic}
                  </div>
                </div>
              </div>

              {/* Name & Birth Date Column */}
              <div className="flex flex-col text-right">
                <div className="inline-flex items-center justify-between px-2.5 py-0.5 rounded-full bg-[#e1f0f7] text-[11px] font-bold text-slate-700 mb-1 w-full border border-[#c3e3f0]">
                  <span className="text-[#194f73]" dir="rtl">الاسم</span>
                  <span className="text-[#194f73]">Name</span>
                </div>
                {/* Arabic Name (Above) */}
                <div
                  className="font-black text-slate-950 leading-snug pr-1 transition-all"
                  dir="rtl"
                  style={{
                    ...getLineStyle('nameArabic', calibration, data.fontFamily),
                    transform: (calibration?.nameArabicYOffset || 0)
                      ? `translateY(${calibration?.nameArabicYOffset}px)`
                      : undefined,
                  }}
                >
                  {data.nameArabic}
                </div>
                {/* English Name (Below) with dynamic inter-line spacing */}
                <div
                  className="font-black text-slate-950 tracking-wide uppercase pr-1 transition-all"
                  style={{
                    ...getLineStyle('nameEnglish', calibration, data.fontFamily),
                    marginTop: `${Math.max(
                      0,
                      2 + (calibration?.nameLineSpacing !== undefined ? calibration.nameLineSpacing : (data.nameLineSpacing || 0)) + (calibration?.nameEnglishYOffset || 0)
                    )}px`,
                  }}
                >
                  {data.nameEnglish}
                </div>
                {/* Birth Date */}
                <div className="mt-2.5" style={{ display: getLineStyle('birthDate', calibration).display }}>
                  <div className="inline-flex items-center justify-between px-2.5 py-0.5 rounded-full bg-[#e1f0f7] text-[11px] font-bold text-slate-700 mb-1 w-full border border-[#c3e3f0]">
                    <span className="text-[#194f73]" dir="rtl">تاريخ الميلاد</span>
                    <span className="text-[#194f73]">Birth Date</span>
                  </div>
                  <div
                    style={getLineStyle('birthDate', calibration, data.fontFamily)}
                    className="font-bold text-slate-950 tracking-wide font-mono pr-1"
                  >
                    {formatToYYYYMMDD(data.birthDate)}
                  </div>
                </div>
              </div>

              {/* ROW 5: Occupation & QR Code (Left) & Sponsor (Right) */}
              {/* Occupation & Verification QR */}
              <div className="flex items-start justify-between">
                <div className="flex flex-col text-left w-full" style={{ display: getLineStyle('occupation', calibration).display }}>
                  <div className="inline-flex items-center justify-between px-2.5 py-0.5 rounded-full bg-[#e1f0f7] text-[11px] font-bold text-slate-700 mb-1 w-full border border-[#c3e3f0]">
                    <span className="text-[#194f73]">Occupation</span>
                    <span dir="rtl" className="text-[#194f73]">المهنة</span>
                  </div>
                  <div
                    style={getLineStyle('occupation', calibration, data.fontFamily)}
                    className="font-bold text-slate-950 pl-1"
                    dir="rtl"
                  >
                    {data.occupationArabic}
                  </div>
                  <div
                    style={getLineStyle('occupation', calibration, data.fontFamily)}
                    className="font-black text-slate-950 uppercase pl-1"
                  >
                    {data.occupationEnglish}
                  </div>

                  {/* Verification QR Code */}
                  <div className="mt-2.5 p-1 bg-white border border-slate-300 rounded-md inline-block shadow-2xs">
                    {mainQrCodeUrl ? (
                      <img
                        src={mainQrCodeUrl}
                        alt="Visa Verification QR"
                        className="w-[86px] h-[86px] object-contain"
                      />
                    ) : (
                      <div className="w-[86px] h-[86px] bg-slate-100 animate-pulse" />
                    )}
                  </div>
                </div>
              </div>

              {/* Sponsor (الكفيل) */}
              <div className="flex flex-col text-right" style={{ display: getLineStyle('sponsorDetails', calibration).display }}>
                <div className="text-[12px] font-bold text-[#194f73] mb-1 pr-1" dir="rtl">
                  الكفيل
                </div>
                <div
                  className="font-black text-slate-950 leading-relaxed bg-slate-50/80 p-2.5 rounded-lg border border-slate-200"
                  dir="rtl"
                  style={getLineStyle('sponsorDetails', calibration, data.fontFamily)}
                >
                  {data.sponsorDetails}
                </div>
              </div>
            </div>

            {/* Faint State of Kuwait watermark text inside card */}
            <div className="relative z-10 flex justify-center items-center my-3 opacity-20">
              <span className="text-[19px] font-black tracking-[0.4em] text-[#164e70] uppercase">
                STATE OF KUWAIT
              </span>
            </div>

            {/* MACHINE READABLE ZONE (MRZ - 2 LINES) */}
            <div className="relative z-10 mt-1 pt-2.5 border-t border-[#a2cfdf] bg-white">
              <div
                className="select-all flex flex-col gap-[7px] font-orator-mrz"
              >
                {getLineStyle('mrzLine1', calibration).display !== 'none' && (
                  <div style={getLineStyle('mrzLine1', calibration, 'Orator Std')}>
                    <MrzLine
                      line={mrz.line1}
                      chevronScaleY={calibration?.mrzChevronScaleY !== undefined ? calibration.mrzChevronScaleY : 0.75}
                      chevronScaleX={calibration?.mrzChevronScaleX !== undefined ? calibration.mrzChevronScaleX : 1.0}
                      letterSpacing={getLineStyle('mrzLine1', calibration).letterSpacing || '0.11em'}
                      strokeWidth={calibration?.mrzStrokeWidth ?? 0.22}
                      fontWeight={getLineStyle('mrzLine1', calibration).fontWeight || calibration?.mrzFontWeight || 'bold'}
                      color={getLineStyle('mrzLine1', calibration).color || calibration?.mrzColor}
                      opacity={calibration?.mrzOpacity}
                    />
                  </div>
                )}
                {getLineStyle('mrzLine2', calibration).display !== 'none' && (
                  <div style={getLineStyle('mrzLine2', calibration, 'Orator Std')}>
                    <MrzLine
                      line={mrz.line2}
                      isLine2={true}
                      bgdScale={calibration?.mrz2BgdScale ?? 0.82}
                      chevronScaleY={calibration?.mrzChevronScaleY !== undefined ? calibration.mrzChevronScaleY : 0.75}
                      chevronScaleX={calibration?.mrzChevronScaleX !== undefined ? calibration.mrzChevronScaleX : 1.0}
                      letterSpacing={getLineStyle('mrzLine2', calibration).letterSpacing || '0.11em'}
                      strokeWidth={calibration?.mrzStrokeWidth ?? 0.22}
                      fontWeight={getLineStyle('mrzLine2', calibration).fontWeight || calibration?.mrzFontWeight || 'bold'}
                      color={getLineStyle('mrzLine2', calibration).color || calibration?.mrzColor}
                      opacity={calibration?.mrzOpacity}
                    />
                  </div>
                )}
              </div>
            </div>
          </div>

          {/* FOR OFFICIAL USE BOX (للاستعمال الرسمي) */}
          <div className="w-full mt-2.5 rounded-xl border border-slate-300 bg-slate-50/90 p-3 shadow-2xs">
            {/* Header Bar */}
            <div className="flex items-center justify-between px-2.5 py-1 rounded-md bg-[#e2e6f3] border border-[#cbd3eb] mb-2">
              <span className="text-[12px] font-bold text-slate-800 tracking-wide">
                For Official Use
              </span>
              <span className="text-[13px] font-bold text-slate-800" dir="rtl">
                للاستعمال الرسمي
              </span>
            </div>

            {/* Issuing Authority */}
            <div className="text-right py-1 px-1" dir="rtl">
              <span className="text-[11.5px] font-bold text-slate-600 ml-2">
                جهة الإصدار:
              </span>
              <span className="text-[13px] font-black text-slate-900">
                {data.issuingAuthorityArabic}
              </span>
            </div>

            {/* 3 Stamp Boxes Grid */}
            <div className="grid grid-cols-3 gap-3 mt-1.5">
              {/* Box 1: Instructions with QR Code */}
              <div className="h-[105px] rounded-lg border border-slate-300 bg-white p-1.5 flex flex-col justify-between items-center shadow-2xs">
                <div className="w-full flex items-center justify-between text-[9.5px] font-bold text-slate-700 px-1">
                  <span>Instructions</span>
                  <span dir="rtl">التعليمات</span>
                </div>
                <div className="my-auto">
                  {instructionsQrCodeUrl ? (
                    <img
                      src={instructionsQrCodeUrl}
                      alt="Instructions QR"
                      className="w-[64px] h-[64px] object-contain"
                    />
                  ) : (
                    <div className="w-[64px] h-[64px] bg-slate-100 animate-pulse" />
                  )}
                </div>
              </div>

              {/* Box 2: Exit Stamp */}
              <div className="h-[105px] rounded-lg border border-slate-300 bg-white p-1.5 flex flex-col justify-between shadow-2xs relative">
                <div className="w-full flex items-center justify-between text-[9.5px] font-bold text-slate-700 px-1">
                  <span>Exit Stamp</span>
                  <span dir="rtl">ختم المغادرة</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    BORDER EXIT
                  </span>
                </div>
              </div>

              {/* Box 3: Entry Stamp */}
              <div className="h-[105px] rounded-lg border border-slate-300 bg-white p-1.5 flex flex-col justify-between shadow-2xs relative">
                <div className="w-full flex items-center justify-between text-[9.5px] font-bold text-slate-700 px-1">
                  <span>Entry Stamp</span>
                  <span dir="rtl">ختم الدخول</span>
                </div>
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none opacity-10">
                  <span className="text-[9px] font-bold uppercase tracking-widest text-slate-400">
                    BORDER ENTRY
                  </span>
                </div>
              </div>
            </div>
          </div>

          {/* BOTTOM FOOTER SECTION */}
          <div className="w-full mt-2.5 pt-2 border-t border-slate-200">
            <div className="flex items-center justify-between px-1">
              {/* Left Logos */}
              <div className="flex items-center gap-3">
                <div className="scale-90">
                  <KuwaitEmblem size={28} />
                </div>
                <RasedLogo size={24} />
              </div>
              {/* Verification Instructions */}
              <div className="flex flex-col text-right text-[10.5px] text-slate-700">
                <span className="font-bold" dir="rtl">
                  استخدم تطبيقات وزارة الداخلية للتحقق من صحة محتوى هذه الوثيقة
                </span>
                <span className="text-slate-500 text-[10px]">
                  Use Ministry of Interior's Apps to verify the content in this document
                </span>
              </div>
            </div>

            {/* Bottom Metadata Text */}
            <div className="mt-1.5 text-center text-[9px] text-slate-400 border-t border-slate-100 pt-1">
              <span>Ministry of Interior | Electronic Visa | </span>
              <span className="font-medium">{data.editionText}</span>
              <span> | وزارة الداخلية</span>
            </div>
          </div>

        </div>
      </div>
    </div>
  );
};

export const KuwaitEVisaDocument: React.FC<DocumentProps> = (props) => {
  if (props.documentMode === 'pad') {
    return (
      <KuwaitEVisaPadOverlay
        data={props.data}
        documentRef={props.documentRef}
        zoom={props.zoom}
        padImageUrl={props.padImageUrl}
        showPadBackground={props.showPadBackground}
        calibration={props.calibration}
      />
    );
  }

  return <KuwaitEVisaFullDocument {...props} />;
};
