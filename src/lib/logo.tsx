import React, { useState } from 'react';

interface LogoProps {
  className?: string;
  size?: number | string;
  showText?: boolean;
  inverted?: boolean;
}

export const OFFICIAL_LOGO_SRC = "/assets/aistudio/7b61e49e-aa56-49eb-b3b9-39974f6152c2_d2a70243.jpeg";

export const PakistanLabourCommunityLogo: React.FC<LogoProps> = ({
  className = "",
  size = 48,
  showText = false,
  inverted = false
}) => {
  const [imageFailed, setImageFailed] = useState(false);

  const numSize = typeof size === 'number' ? `${size}px` : size;

  return (
    <div className={`inline-flex items-center gap-3 select-none ${className}`}>
      {!imageFailed ? (
        <img
          src={OFFICIAL_LOGO_SRC}
          alt="Pakistan Labour Community Official Emblem"
          style={{ width: numSize, height: numSize }}
          onError={() => setImageFailed(true)}
          className="rounded-full object-cover shrink-0 drop-shadow-md border border-amber-400/60"
        />
      ) : (
        <svg
          width={size}
          height={size}
          viewBox="0 0 200 200"
          fill="none"
          xmlns="http://www.w3.org/2000/svg"
          className="shrink-0 drop-shadow-sm rounded-full"
          role="img"
          aria-label="Pakistan Labour Community Official Emblem"
        >
          <title>Pakistan Labour Community Official Emblem</title>
          <defs>
            <linearGradient id="plcNavyGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#0B2B33" />
              <stop offset="100%" stopColor="#051419" />
            </linearGradient>
            <linearGradient id="plcGoldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#F5D061" />
              <stop offset="50%" stopColor="#E4AE2F" />
              <stop offset="100%" stopColor="#B38318" />
            </linearGradient>
            <linearGradient id="plcEmeraldGrad" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#168A68" />
              <stop offset="100%" stopColor="#0D5A31" />
            </linearGradient>
          </defs>
          <circle cx="100" cy="100" r="96" fill="url(#plcNavyGrad)" stroke="url(#plcGoldGrad)" strokeWidth="4" />
          <circle cx="100" cy="100" r="76" fill="url(#plcEmeraldGrad)" stroke="url(#plcGoldGrad)" strokeWidth="2.5" />
          <path
            d="M100 52 C125 52 142 66 142 96 C142 128 100 152 100 152 C100 152 58 128 58 96 C58 66 75 52 100 52 Z"
            fill="#071F25"
            stroke="url(#plcGoldGrad)"
            strokeWidth="3"
          />
          <g transform="translate(86, 88) scale(0.72)">
            <path
              d="M20 0 C8.954 0 0 8.954 0 20 C0 31.046 8.954 40 20 40 C27.5 40 34 35.8 37.4 29.5 C26 31 16 22 16 10 C16 6.3 17 2.8 19 0 C19.3 0 19.7 0 20 0 Z"
              fill="#FFF8E8"
            />
          </g>
        </svg>
      )}

      {showText && (
        <div className="flex flex-col text-left">
          <span className={`text-base font-bold tracking-tight leading-tight ${inverted ? 'text-white' : 'text-[#071F25]'}`}>
            Pakistan Labour Community
          </span>
          <span className={`text-[11px] font-medium tracking-wider uppercase ${inverted ? 'text-amber-400' : 'text-emerald-800'}`}>
            Oman & Pakistan • ممبر پورٹل
          </span>
        </div>
      )}
    </div>
  );
};
