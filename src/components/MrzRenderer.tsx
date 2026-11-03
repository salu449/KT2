import React from 'react';

interface MrzLineProps {
  line: string;
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

  const isChevronModified = (chevronScaleY !== 1.0 || chevronScaleX !== 1.0);

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
      {!isChevronModified ? (
        // When chevron scale is 1.0, render line directly
        <span className="font-orator-mrz font-bold select-all tracking-[0.11em] leading-none">
          {line}
        </span>
      ) : (
        // When chevrons are squashed (chepa) or scaled
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
