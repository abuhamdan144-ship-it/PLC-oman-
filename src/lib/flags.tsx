import React from 'react';

interface FlagProps {
  className?: string;
  title?: string;
}

export const PakistanFlag: React.FC<FlagProps> = ({ 
  className = "w-6 h-4", 
  title = "Flag of the Islamic Republic of Pakistan" 
}) => {
  return (
    <svg 
      viewBox="0 0 900 600" 
      className={`inline-block rounded-xs shadow-xs border border-black/10 overflow-hidden ${className}`}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {/* 1/4 white hoist stripe */}
      <rect width="225" height="600" fill="#FFFFFF" />
      {/* 3/4 dark green fly field */}
      <rect x="225" width="675" height="600" fill="#01411C" />
      
      {/* Crescent and Star on green field */}
      <g transform="translate(562.5, 300) rotate(-40)">
        {/* Outer circle for crescent */}
        <circle cx="0" cy="0" r="180" fill="#FFFFFF" />
        {/* Inner cut circle shifted */}
        <circle cx="48" cy="-22" r="162" fill="#01411C" />
        {/* 5-pointed star */}
        <polygon 
          points="80,-50 95,-10 135,-10 102,15 115,55 80,30 45,55 58,15 25,-10 65,-10" 
          fill="#FFFFFF" 
        />
      </g>
    </svg>
  );
};

export const OmanFlag: React.FC<FlagProps> = ({ 
  className = "w-6 h-4", 
  title = "Flag of the Sultanate of Oman" 
}) => {
  return (
    <svg 
      viewBox="0 0 900 450" 
      className={`inline-block rounded-xs shadow-xs border border-black/10 overflow-hidden ${className}`}
      role="img"
      aria-label={title}
    >
      <title>{title}</title>
      {/* Horizontal bands: top white, middle red, bottom green */}
      <rect x="225" y="0" width="675" height="150" fill="#FFFFFF" />
      <rect x="225" y="150" width="675" height="150" fill="#DB161B" />
      <rect x="225" y="300" width="675" height="150" fill="#008000" />
      {/* Vertical red bar at hoist */}
      <rect x="0" y="0" width="225" height="450" fill="#DB161B" />
      
      {/* National Emblem of Oman (Khanjar & crossed swords) in white at hoist top */}
      <g transform="translate(112.5, 75) scale(0.65)" stroke="#FFFFFF" fill="#FFFFFF">
        {/* Crossed swords */}
        <path d="M-60,-50 L60,50 M-60,50 L60,-50" strokeWidth="6" strokeLinecap="round" />
        <circle cx="-60" cy="-50" r="5" fill="#FFFFFF" />
        <circle cx="60" cy="50" r="5" fill="#FFFFFF" />
        <circle cx="-60" cy="50" r="5" fill="#FFFFFF" />
        <circle cx="60" cy="-50" r="5" fill="#FFFFFF" />
        
        {/* Khanjar dagger sheath & hilt */}
        <path d="M-12,-45 L12,-45 L8,-25 L16,0 L0,38 L-16,0 L-8,-25 Z" fill="#FFFFFF" stroke="#DB161B" strokeWidth="2" />
        <path d="M0,38 Q8,52 24,54" stroke="#FFFFFF" strokeWidth="6" fill="none" strokeLinecap="round" />
        {/* Belt rings */}
        <circle cx="-16" cy="-2" r="5" fill="#FFFFFF" />
        <circle cx="16" cy="-2" r="5" fill="#FFFFFF" />
      </g>
    </svg>
  );
};

export const FlagPair: React.FC<{ size?: 'sm' | 'md' | 'lg'; className?: string }> = ({ 
  size = 'md',
  className = "" 
}) => {
  const dimensions = {
    sm: "w-5 h-3.5",
    md: "w-6 h-4",
    lg: "w-8 h-5.5"
  }[size];

  return (
    <span className={`inline-flex items-center gap-1.5 ${className}`} title="Pakistan & Oman Partnership">
      <PakistanFlag className={dimensions} title="Pakistan" />
      <span className="text-xs text-amber-500 font-bold select-none">•</span>
      <OmanFlag className={dimensions} title="Oman" />
    </span>
  );
};
