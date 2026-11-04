import React from 'react';

interface MrzLineProps {
  line: string;
  isLine2?: boolean; // Whether this is MRZ Line 2
  bgdScale?: number; // Scale for BGD / Nationality characters in Line 2 (default 0.82)
  chevronScaleY?: number;
  chevronScaleX?: number;
  letterSpacing?: string;
  strokeWidth?: number; // 0.22 = bold optical stroke matching applicant names
  fontWeight?: string | number; // 'bold' | 700 default
  color?: string; // Slightly lighter tone than harsh black, default #222222
  opacity?: number; // 0.50 to 1.00, default 0.92
  className?: string;
}

export const MrzLine: React.FC<MrzLineProps> = ({
  line,
  isLine2 = false,
  bgdScale = 0.82,
  chevronScaleY = 0.75,
  chevronScaleX = 1.0,
  letterSpacing = '0.11em',
  strokeWidth = 0.22,
  fontWeight = 'bold',
  color = '#222222',
  opacity = 0.92,
  className = '',
}) => {
  const effectiveStroke = typeof strokeWidth === 'number' ? strokeWidth : 0.22;
  const effectiveColor = color || '#222222';
  const effectiveOpacity = typeof opacity === 'number' ? opacity : 0.92;
  const effectiveBgdScale = typeof bgdScale === 'number' ? bgdScale : 0.82;
  const hasStroke = effectiveStroke > 0;
  const outerStrokeStyle: React.CSSProperties = hasStroke
    ? {
        WebkitTextStroke: `${effectiveStroke}px ${effectiveColor}`,
        paintOrder: 'stroke fill',
      }
    : {
        WebkitTextStroke: '0px',
        textShadow: 'none',
      };

  const parsedWeight =
    fontWeight === 'normal' || fontWeight === 400 || fontWeight === '400'
      ? 400
      : fontWeight === 'medium' || fontWeight === 500 || fontWeight === 600 || fontWeight === '600'
      ? 600
      : fontWeight === 'extrabold' || fontWeight === '900' || fontWeight === 900
      ? 900
      : 700;

  const isChevronModified = chevronScaleY !== 1.0 || chevronScaleX !== 1.0;

  // Detect BGD or 3-letter nationality code in Line 2 to scale down slightly
  const bgdIndices = new Set<number>();
  if (isLine2 && effectiveBgdScale !== 1.0) {
    const bgdPos = line.indexOf('BGD');
    if (bgdPos !== -1) {
      bgdIndices.add(bgdPos);
      bgdIndices.add(bgdPos + 1);
      bgdIndices.add(bgdPos + 2);
    } else if (line.length >= 13 && /^[A-Z]{3}$/.test(line.substring(10, 13))) {
      // Fallback to ICAO 9303 standard nationality code at index 10-12
      bgdIndices.add(10);
      bgdIndices.add(11);
      bgdIndices.add(12);
    }
  }

  const needsCharMapping = isChevronModified || bgdIndices.size > 0;

  return (
    <div
      style={{
        fontFamily: '"Orator Std", "OratorStd", "Share Tech Mono", monospace',
        fontWeight: parsedWeight,
        fontSynthesis: 'weight',
        letterSpacing,
        color: effectiveColor,
        opacity: effectiveOpacity,
        ...outerStrokeStyle,
      }}
      className={`inline-flex items-center select-all uppercase font-bold whitespace-nowrap leading-none tracking-[0.11em] font-orator-mrz mrz-stroke ${className}`}
    >
      {!needsCharMapping ? (
        // When no chevrons or BGD characters need individual transforms
        <span className="font-orator-mrz font-bold select-all tracking-[0.11em] leading-none">
          {line}
        </span>
      ) : (
        // Render each character in fixed 1ch monospaced cell with individual scale
        line.split('').map((char, index) => {
          if (char === '<') {
            return (
              <span
                key={index}
                className="inline-flex items-center justify-center font-orator-mrz font-bold select-all"
                style={{
                  width: '1ch',
                  height: '1em',
                  lineHeight: 1,
                  transform: `scale(${chevronScaleX}, ${chevronScaleY})`,
                  transformOrigin: 'center center',
                }}
                title="MRZ Filler"
              >
                &lt;
              </span>
            );
          }

          if (bgdIndices.has(index)) {
            return (
              <span
                key={index}
                className="inline-flex items-center justify-center font-orator-mrz font-bold select-all"
                style={{
                  width: '1ch',
                  height: '1em',
                  lineHeight: 1,
                  transform: `scale(${effectiveBgdScale})`,
                  transformOrigin: 'center center',
                }}
                title="MRZ BGD Nationality Code"
              >
                {char}
              </span>
            );
          }

          return (
            <span
              key={index}
              className="inline-block text-center font-orator-mrz font-bold select-all"
              style={{
                width: '1ch',
                height: '1em',
                lineHeight: 1,
              }}
            >
              {char}
            </span>
          );
        })
      )}
    </div>
  );
};
