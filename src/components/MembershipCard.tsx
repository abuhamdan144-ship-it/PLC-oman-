import React, { useState, useEffect, useRef } from 'react';
import QRCode from 'qrcode';
import { toPng } from 'html-to-image';
import { MemberProfile } from '../types';
import { PakistanFlag, OmanFlag } from '../lib/flags';
import { 
  RotateCw, 
  Download, 
  Printer, 
  Check, 
  Columns, 
  Layers
} from 'lucide-react';

interface MembershipCardProps {
  member: MemberProfile;
}

/**
 * Reusable Card Flag Pair with country text labels underneath
 * exactly matching the reference card design.
 */
const CardFlagPair: React.FC<{ size?: 'sm' | 'md' }> = ({ size = 'md' }) => {
  const flagClass = size === 'sm' ? "w-6 h-4" : "w-7 h-4.5";
  return (
    <div className="flex items-center gap-2">
      <div className="flex flex-col items-center">
        <PakistanFlag className={`${flagClass} rounded-xs shadow-xs`} />
        <span className="text-[7px] text-white/90 font-medium tracking-wide mt-0.5">Pakistan</span>
      </div>
      <div className="h-6 w-[1px] bg-white/30 self-center mx-0.5" />
      <div className="flex flex-col items-center">
        <OmanFlag className={`${flagClass} rounded-xs shadow-xs`} />
        <span className="text-[7px] text-white/90 font-medium tracking-wide mt-0.5">Oman</span>
      </div>
    </div>
  );
};

/**
 * Detailed SVG Watermark Background:
 * Minar-e-Pakistan silhouette, tilted crescent & star, and sweeping flowing ribbons.
 */
const CardWatermarkBackground: React.FC = () => {
  return (
    <div className="absolute inset-0 overflow-hidden pointer-events-none select-none">
      {/* Deep teal-navy gradient base */}
      <div 
        className="absolute inset-0"
        style={{
          background: 'linear-gradient(135deg, #03191E 0%, #06272B 40%, #052226 70%, #021418 100%)',
        }}
      />

      <svg 
        viewBox="0 0 480 302" 
        className="absolute inset-0 w-full h-full"
        preserveAspectRatio="xMidYMid slice"
        xmlns="http://www.w3.org/2000/svg"
      >
        <defs>
          <linearGradient id="goldRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#F5D268" />
            <stop offset="50%" stopColor="#E4AE2F" />
            <stop offset="100%" stopColor="#9C731A" />
          </linearGradient>

          <linearGradient id="emeraldRibbon" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#0B4D29" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#147B45" stopOpacity="0.9" />
            <stop offset="100%" stopColor="#08381D" stopOpacity="0.7" />
          </linearGradient>

          <linearGradient id="silverRibbon" x1="0%" y1="0%" x2="100%" y2="100%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.8" />
            <stop offset="50%" stopColor="#DDEAE2" stopOpacity="0.5" />
            <stop offset="100%" stopColor="#8DA396" stopOpacity="0.2" />
          </linearGradient>

          <radialGradient id="crescentGlow" cx="60%" cy="40%" r="50%">
            <stop offset="0%" stopColor="#FFFFFF" stopOpacity="0.25" />
            <stop offset="100%" stopColor="#FFFFFF" stopOpacity="0.02" />
          </radialGradient>
        </defs>

        {/* ========================================================= */}
        {/* Crescent and Star Watermark (Center / Right)              */}
        {/* ========================================================= */}
        <g transform="translate(360, 110) rotate(-35)" opacity="0.32">
          {/* Crescent */}
          <path
            d="M 0 -85 A 85 85 0 1 0 85 0 A 70 70 0 1 1 0 -85 Z"
            fill="url(#crescentGlow)"
          />
          {/* 5-pointed Star */}
          <polygon
            points="65,-45 74,-20 99,-20 78,-5 86,18 65,5 44,18 52,-5 31,-20 56,-20"
            fill="#FFFFFF"
            opacity="0.6"
          />
        </g>

        {/* ========================================================= */}
        {/* Skyline / Trees Silhouette at Far Horizon                 */}
        {/* ========================================================= */}
        <path
          d="M 270 200 L 290 195 L 300 200 L 320 193 L 340 200 L 380 196 L 410 198 L 480 190 L 480 240 L 270 240 Z"
          fill="#021215"
          opacity="0.45"
        />

        {/* ========================================================= */}
        {/* Minar-e-Pakistan Silhouette (Right side)                  */}
        {/* ========================================================= */}
        <g transform="translate(440, 120)" fill="#021013" opacity="0.55">
          {/* Spire and Dome */}
          <path d="M 0 0 L 1.5 22 L 4 27 L -4 27 L -1.5 22 Z" />
          {/* Balcony ring */}
          <rect x="-6" y="27" width="12" height="4" rx="1" />
          {/* Tower shaft tapered with fluted ribs */}
          <path d="M -5 31 L -7 82 L 7 82 L 5 31 Z" />
          <line x1="-2" y1="31" x2="-2.5" y2="82" stroke="#052024" strokeWidth="1" />
          <line x1="2" y1="31" x2="2.5" y2="82" stroke="#052024" strokeWidth="1" />
          {/* Mid observation deck */}
          <rect x="-9" y="82" width="18" height="5" rx="1.5" />
          {/* Tiered Rostrum Base / Crescent Petals Base */}
          <path d="M -8 87 L -14 110 L -20 114 L 20 114 L 14 110 L 8 87 Z" />
          <path d="M -22 114 C -18 102 -6 95 0 95 C 6 95 18 102 22 114 Z" fill="none" stroke="#021013" strokeWidth="2" />
        </g>

        {/* ========================================================= */}
        {/* Flowing Emerald, Gold & Silver Ribbons (Bottom-Middle)    */}
        {/* ========================================================= */}
        {/* Deep Emerald Wave */}
        <path
          d="M 0 205 C 100 215 150 245 280 230 C 370 220 420 185 480 195 L 480 255 L 0 255 Z"
          fill="url(#emeraldRibbon)"
        />

        {/* Silver / White Dynamic Swirl */}
        <path
          d="M 0 214 C 90 220 170 252 270 238 C 360 224 400 190 480 205 L 480 218 C 410 205 360 236 270 248 C 160 262 90 230 0 225 Z"
          fill="url(#silverRibbon)"
        />

        {/* Rich Gold Trim Ribbon */}
        <path
          d="M 0 228 C 110 235 180 258 280 244 C 370 230 420 195 480 212 L 480 219 C 420 202 370 237 280 251 C 180 265 110 242 0 235 Z"
          fill="url(#goldRibbon)"
          opacity="0.95"
        />

        {/* Bottom Bar Divider Line */}
        <line x1="0" y1="250" x2="480" y2="250" stroke="#E4AE2F" strokeWidth="1.2" opacity="0.85" />
      </svg>
    </div>
  );
};

export const MembershipCard: React.FC<MembershipCardProps> = ({ member }) => {
  const [viewMode, setViewMode] = useState<'flip' | 'sideBySide'>('flip');
  const [isFlipped, setIsFlipped] = useState(false);
  const [qrCodeUrl, setQrCodeUrl] = useState<string>('');
  const [isDownloading, setIsDownloading] = useState(false);
  const [downloadSuccess, setDownloadSuccess] = useState(false);

  const frontCardRef = useRef<HTMLDivElement>(null);
  const backCardRef = useRef<HTMLDivElement>(null);
  const sideBySideRef = useRef<HTMLDivElement>(null);

  // Generate dynamic QR code encoding official verification URL
  useEffect(() => {
    const origin = typeof window !== 'undefined' ? window.location.origin : 'https://pakistanlabour.org';
    const verifyUrl = `${origin}/verify?id=${encodeURIComponent(member.memberId || 'PLC-84920')}&uid=${encodeURIComponent(member.uid)}`;
    
    QRCode.toDataURL(verifyUrl, {
      width: 256,
      margin: 1,
      color: {
        dark: '#03191E',
        light: '#FFFFFF'
      }
    })
      .then((url) => setQrCodeUrl(url))
      .catch((err) => console.error('Error generating QR code:', err));
  }, [member.memberId, member.uid]);

  // Mask CNIC / ID number to match format e.g. 42201-1234567-3
  const formatIdNumber = (id: string) => {
    if (!id) return '42201-1234567-3';
    const clean = id.trim();
    if (clean.includes('-')) return clean;
    if (clean.length === 13) {
      return `${clean.substring(0, 5)}-${clean.substring(5, 12)}-${clean.substring(12)}`;
    }
    return clean;
  };

  const handlePrint = () => {
    window.print();
  };

  const handleDownload = async (target: 'front' | 'back' | 'sideBySide') => {
    try {
      setIsDownloading(true);

      if (target === 'front' && frontCardRef.current) {
        const url = await toPng(frontCardRef.current, { pixelRatio: 2.5, cacheBust: true });
        triggerDownload(url, `PLC-Card-Front-${member.memberId || 'member'}.png`);
      } else if (target === 'back' && backCardRef.current) {
        const url = await toPng(backCardRef.current, { pixelRatio: 2.5, cacheBust: true });
        triggerDownload(url, `PLC-Card-Back-${member.memberId || 'member'}.png`);
      } else if (target === 'sideBySide' && sideBySideRef.current) {
        const url = await toPng(sideBySideRef.current, { pixelRatio: 2.5, cacheBust: true });
        triggerDownload(url, `PLC-Membership-Card-${member.memberId || 'member'}.png`);
      }

      setDownloadSuccess(true);
      setTimeout(() => setDownloadSuccess(false), 3000);
    } catch (err) {
      console.error('Download card error:', err);
    } finally {
      setIsDownloading(false);
    }
  };

  const triggerDownload = (dataUrl: string, filename: string) => {
    const link = document.createElement('a');
    link.href = dataUrl;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  // =========================================================================
  // CARD FRONT RENDERER
  // Exactly implements user reference card design (NO LOGO on card)
  // =========================================================================
  const renderFrontCard = (isExportTarget = false) => {
    return (
      <div
        ref={isExportTarget ? frontCardRef : undefined}
        style={{ width: '480px', height: '302px' }}
        className="relative rounded-2xl overflow-hidden shadow-2xl border border-amber-400/40 select-none flex flex-col justify-between shrink-0 bg-[#03191E]"
      >
        <CardWatermarkBackground />

        {/* Content Layer */}
        <div className="relative z-10 w-full h-full p-4 sm:p-5 flex flex-col justify-between text-white">
          
          {/* Top Bar: Flags on Left, Motto on Right */}
          <div className="flex items-start justify-between">
            <CardFlagPair size="md" />

            {/* Top Right Tagline */}
            <div className="text-right leading-[1.15] text-[7.5px] font-bold text-[#E5B842] tracking-wider uppercase font-sans">
              <div>PEOPLE</div>
              <div>OPPORTUNITIES</div>
              <div>STRONGER</div>
              <div>TOGETHER</div>
            </div>
          </div>

          {/* Heading Section */}
          <div className="mt-1">
            <h3 className="text-[14px] sm:text-[15px] font-extrabold text-white font-serif tracking-normal leading-tight uppercase drop-shadow-xs">
              PAKISTAN – LABOUR COMMUNITY
            </h3>
            <p className="text-[9.5px] font-bold text-[#E5B842] tracking-[0.22em] uppercase mt-0.5">
              MEMBERSHIP CARD
            </p>
          </div>

          {/* Middle Body: Photo, Member Info, QR Code */}
          <div className="flex items-center justify-between gap-3 my-auto pt-1">
            
            {/* Member Photo */}
            <div className="shrink-0">
              {member.photoURL ? (
                <img
                  src={member.photoURL}
                  alt={member.fullName}
                  className="w-19 h-24 rounded-xl object-cover border-2 border-white/90 shadow-md bg-stone-900"
                />
              ) : (
                <div className="w-19 h-24 rounded-xl bg-white/95 border-2 border-white/90 shadow-md flex flex-col items-center justify-center text-[#03191E]">
                  <span className="text-3xl font-bold font-heading">{member.fullName ? member.fullName.charAt(0) : 'M'}</span>
                  <span className="text-[8px] font-semibold text-stone-500 uppercase mt-1">Photo</span>
                </div>
              )}
            </div>

            {/* Center: Name, ID, Active Pill, Subtext */}
            <div className="flex-1 min-w-0 pr-1">
              <h4 className="text-[17px] font-extrabold text-white leading-tight truncate">
                {member.fullName || 'Ali Khan'}
              </h4>
              
              <div className="text-[15px] font-extrabold font-mono text-[#E5B842] tracking-wide mt-0.5">
                {member.memberId || 'PLC-84920'}
              </div>

              {/* Active Member Capsule */}
              <div className="mt-1.5 inline-flex items-center px-3 py-1 rounded-full bg-[#0B4826] border border-[#166A38] text-[9.5px] font-extrabold text-white tracking-wider uppercase shadow-xs">
                ACTIVE MEMBER
              </div>

              {/* Subtext */}
              <div className="mt-2 text-[7.5px] font-bold tracking-wider text-[#E5B842]/90 uppercase leading-tight font-sans">
                <div>A SUPPORTIVE COMMUNITY</div>
                <div>FOR A BRIGHTER TOMORROW</div>
              </div>
            </div>

            {/* Right: QR Code Container */}
            <div className="shrink-0 flex flex-col items-center bg-white p-1.5 rounded-xl shadow-md border border-amber-300/40">
              {qrCodeUrl ? (
                <img src={qrCodeUrl} alt="QR Verification" className="w-16 h-16 sm:w-17 sm:h-17" />
              ) : (
                <div className="w-16 h-16 bg-stone-100 flex items-center justify-center text-[8px] text-stone-400">
                  QR
                </div>
              )}
              <div className="text-[7px] font-extrabold text-[#03191E] tracking-tight leading-tight mt-1 text-center uppercase font-sans">
                <div>SCAN FOR</div>
                <div>VERIFICATION</div>
              </div>
            </div>

          </div>

          {/* Front Bottom Bar: 3 Columns with Gold Icons */}
          <div className="pt-2 border-t border-[#E4AE2F]/80 grid grid-cols-3 gap-2 text-white">
            
            {/* Col 1 */}
            <div className="flex items-center gap-1.5">
              <svg className="w-4 h-4 text-[#E5B842] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <div className="text-[6.5px] font-bold text-stone-200 tracking-wider leading-tight uppercase font-sans">
                <div>SUPPORT</div>
                <div>CONNECT</div>
                <div>GROW</div>
              </div>
            </div>

            {/* Col 2 */}
            <div className="flex items-center gap-1.5 border-l border-white/10 pl-2">
              <svg className="w-4 h-4 text-[#E5B842] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="m11 17 2 2a1 1 0 0 0 1.4 0l4.3-4.3a1 1 0 0 0 0-1.4l-2.6-2.6a1 1 0 0 0-1.4 0l-1.4 1.4" />
                <path d="m18 10 1.3-1.3a1 1 0 0 0 0-1.4l-2.6-2.6a1 1 0 0 0-1.4 0L14 6" />
                <path d="M7 14 3.7 10.7a1 1 0 0 1 0-1.4l2.6-2.6a1 1 0 0 1 1.4 0L11 10" />
                <path d="m6 18 2 2" />
              </svg>
              <div className="text-[6.5px] font-bold text-stone-200 tracking-wider leading-tight uppercase font-sans">
                <div>PAKISTANI</div>
                <div>COMMUNITY</div>
                <div>ABROAD</div>
              </div>
            </div>

            {/* Col 3 */}
            <div className="flex items-center gap-1.5 border-l border-white/10 pl-2">
              <svg className="w-4 h-4 text-[#E5B842] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20" />
                <path d="M2 12h20" />
              </svg>
              <div className="text-[6.5px] font-bold text-stone-200 tracking-wider leading-tight uppercase font-sans">
                <div>A STRONGER</div>
                <div>TOMORROW</div>
                <div>TOGETHER</div>
              </div>
            </div>

          </div>

        </div>
      </div>
    );
  };

  // =========================================================================
  // CARD BACK RENDERER
  // Exactly implements user reference card design (NO LOGO on card)
  // =========================================================================
  const renderBackCard = (isExportTarget = false) => {
    return (
      <div
        ref={isExportTarget ? backCardRef : undefined}
        style={{ width: '480px', height: '302px' }}
        className="relative rounded-2xl overflow-hidden shadow-2xl border border-amber-400/40 select-none flex flex-col justify-between shrink-0 bg-[#03191E]"
      >
        <CardWatermarkBackground />

        {/* Content Layer */}
        <div className="relative z-10 w-full h-full p-4 sm:p-5 flex flex-col justify-between text-white">
          
          {/* Top Bar: Flags on Left, Motto on Right */}
          <div className="flex items-start justify-between">
            <CardFlagPair size="md" />

            {/* Top Right Motto on Back */}
            <div className="text-right leading-[1.15] text-[7.5px] font-bold text-[#E5B842] tracking-wider uppercase font-sans">
              <div>OUR PEOPLE</div>
              <div>OUR COMMUNITY</div>
              <div>A BRIGHTER TOMORROW</div>
            </div>
          </div>

          {/* Heading Section */}
          <div className="mt-1">
            <h3 className="text-[14px] sm:text-[15px] font-extrabold text-[#E5B842] font-serif tracking-[0.12em] uppercase leading-tight drop-shadow-xs">
              MEMBER DETAILS
            </h3>
          </div>

          {/* Center Details Box: Ivory / Cream Rounded Container */}
          <div className="my-auto py-1">
            <div className="bg-[#FAF7EE] text-[#052125] rounded-xl px-4 py-2.5 shadow-md border border-amber-200/50">
              <table className="w-full text-left border-collapse text-[10.5px]">
                <tbody className="space-y-1">
                  <tr>
                    <td className="w-36 font-semibold text-[#071F25] py-0.5">Full name</td>
                    <td className="w-3 text-stone-400 font-bold">:</td>
                    <td className="font-bold text-[#052125] py-0.5 truncate">{member.fullName || 'Ali Khan'}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold text-[#071F25] py-0.5">CNIC / passport</td>
                    <td className="text-stone-400 font-bold">:</td>
                    <td className="font-mono font-bold text-[#052125] py-0.5">{formatIdNumber(member.idNumber)}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold text-[#071F25] py-0.5">Current location</td>
                    <td className="text-stone-400 font-bold">:</td>
                    <td className="font-semibold text-stone-700 py-0.5 truncate">{member.currentLocation || 'Muscat, Oman'}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold text-[#071F25] py-0.5">Mobile number</td>
                    <td className="text-stone-400 font-bold">:</td>
                    <td className="font-mono font-bold text-stone-800 py-0.5">{member.mobile || '+968 9123 4567'}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold text-[#071F25] py-0.5">Member since</td>
                    <td className="text-stone-400 font-bold">:</td>
                    <td className="font-semibold text-stone-700 py-0.5">{member.memberSince || 'Jan 2024'}</td>
                  </tr>
                  <tr>
                    <td className="font-semibold text-[#071F25] py-0.5">Emergency contact</td>
                    <td className="text-stone-400 font-bold">:</td>
                    <td className="font-mono font-bold text-[#0D5A31] py-0.5">
                      {member.emergencyContact?.phone || '+968 9876 5432'}
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Back Bottom Bar */}
          <div className="pt-2 border-t border-[#E4AE2F]/80 flex items-center justify-between gap-2 text-white">
            
            {/* Left: Helpline with circle phone */}
            <div className="flex items-center gap-2">
              <div className="w-6 h-6 rounded-full border border-[#E5B842] flex items-center justify-center shrink-0">
                <svg className="w-3.5 h-3.5 text-[#E5B842]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                  <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" />
                </svg>
              </div>
              <div>
                <span className="text-[6.5px] font-bold text-stone-300 tracking-wider block uppercase font-sans">
                  COMMUNITY HELPLINE
                </span>
                <span className="text-[11px] font-mono font-bold text-[#E5B842] tracking-wider leading-none">
                  +968 2469 6991
                </span>
              </div>
            </div>

            {/* Middle: People icon + United Pakistanis */}
            <div className="flex items-center gap-1.5 border-l border-white/10 pl-2">
              <svg className="w-4 h-4 text-[#E5B842] shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2" />
                <circle cx="9" cy="7" r="4" />
                <path d="M22 21v-2a4 4 0 0 0-3-3.87" />
                <path d="M16 3.13a4 4 0 0 1 0 7.75" />
              </svg>
              <div className="text-[6.5px] font-bold text-stone-200 tracking-wider leading-tight uppercase font-sans">
                <div>UNITED PAKISTANIS</div>
                <div>STRONGER ABROAD</div>
              </div>
            </div>

            {/* Right: Service, Solidarity, Progress */}
            <div className="border-l border-white/10 pl-2 text-right">
              <div className="text-[6.5px] font-bold text-stone-200 tracking-wider leading-tight uppercase font-sans">
                <div>SERVICE</div>
                <div>SOLIDARITY</div>
                <div>PROGRESS</div>
              </div>
            </div>

          </div>

        </div>
      </div>
    );
  };

  return (
    <div className="w-full flex flex-col items-center">
      
      {/* Controls Toolbar */}
      <div className="w-full max-w-4xl flex flex-wrap items-center justify-between gap-3 mb-6 no-print">
        
        {/* View Mode Toggle (Flip Card vs Side-by-Side as in uploaded image) */}
        <div className="flex items-center gap-1.5 bg-white p-1 rounded-xl border border-stone-200 shadow-xs">
          <button
            type="button"
            onClick={() => setViewMode('flip')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              viewMode === 'flip'
                ? 'bg-[#071F25] text-amber-300 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>Interactive 3D Flip</span>
          </button>

          <button
            type="button"
            onClick={() => setViewMode('sideBySide')}
            className={`inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-bold rounded-lg transition-colors ${
              viewMode === 'sideBySide'
                ? 'bg-[#071F25] text-amber-300 shadow-xs'
                : 'text-stone-600 hover:text-stone-900'
            }`}
          >
            <Columns className="w-3.5 h-3.5" />
            <span>Side-by-Side View</span>
          </button>
        </div>

        {/* Action Buttons: Flip, Download, Print */}
        <div className="flex items-center gap-2">
          {viewMode === 'flip' && (
            <button
              type="button"
              onClick={() => setIsFlipped(!isFlipped)}
              className="inline-flex items-center gap-2 px-3.5 py-1.5 bg-[#071F25] hover:bg-[#0c2f38] text-white text-xs font-semibold rounded-xl shadow-xs transition-colors"
            >
              <RotateCw className="w-3.5 h-3.5 text-amber-400" />
              <span>{isFlipped ? 'View Front Side' : 'View Back Side'}</span>
            </button>
          )}

          <button
            type="button"
            onClick={() => handleDownload('sideBySide')}
            disabled={isDownloading}
            className="inline-flex items-center gap-1.5 px-3.5 py-1.5 bg-[#0D5A31] hover:bg-[#094224] text-white text-xs font-bold rounded-xl shadow-xs transition-colors disabled:opacity-50"
            title="Download high-resolution image of both sides"
          >
            {downloadSuccess ? (
              <>
                <Check className="w-3.5 h-3.5 text-amber-300" />
                <span>Downloaded!</span>
              </>
            ) : (
              <>
                <Download className="w-3.5 h-3.5 text-amber-300" />
                <span>Download Both Sides</span>
              </>
            )}
          </button>

          <button
            type="button"
            onClick={handlePrint}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-50 border border-stone-200 text-stone-800 text-xs font-semibold rounded-xl shadow-xs transition-colors"
            title="Print membership card"
          >
            <Printer className="w-3.5 h-3.5 text-amber-600" />
            <span className="hidden sm:inline">Print</span>
          </button>
        </div>

      </div>

      {/* ========================================================================= */}
      {/* 1. INTERACTIVE 3D FLIP MODE                                               */}
      {/* ========================================================================= */}
      {viewMode === 'flip' && (
        <div className="perspective-1000 w-full max-w-[480px] aspect-[1.589/1] min-h-[302px] relative no-print select-none">
          <div
            onClick={() => setIsFlipped(!isFlipped)}
            className={`w-full h-full relative duration-500 transform-style-3d transition-transform cursor-pointer ${
              isFlipped ? 'rotate-y-180' : ''
            }`}
            title="Click card to flip between Front and Back"
          >
            {/* Front Side */}
            <div className="absolute inset-0 w-full h-full backface-hidden">
              {renderFrontCard(false)}
            </div>

            {/* Back Side */}
            <div className="absolute inset-0 w-full h-full backface-hidden rotate-y-180">
              {renderBackCard(false)}
            </div>
          </div>
          <p className="text-center text-[11px] text-stone-500 mt-2 font-medium">
            💡 Tip: Click anywhere on the card to flip between Front and Back.
          </p>
        </div>
      )}

      {/* ========================================================================= */}
      {/* 2. SIDE-BY-SIDE VIEW (Matches the user's reference image exactly)         */}
      {/* ========================================================================= */}
      {viewMode === 'sideBySide' && (
        <div className="w-full overflow-x-auto pb-4 no-print flex justify-center">
          <div className="flex flex-col lg:flex-row items-center gap-6 p-4 rounded-3xl bg-[#F6F2E9] border border-amber-300/40 shadow-inner">
            <div>
              <div className="text-center text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                Front Side
              </div>
              {renderFrontCard(false)}
            </div>

            <div>
              <div className="text-center text-[10px] font-bold uppercase tracking-wider text-stone-500 mb-1.5">
                Back Side
              </div>
              {renderBackCard(false)}
            </div>
          </div>
        </div>
      )}

      {/* ========================================================================= */}
      {/* OFF-SCREEN HIGH-RES CAPTURE TARGET FOR SIDE-BY-SIDE EXPORT                */}
      {/* ========================================================================= */}
      <div className="absolute -left-[9999px] top-0 pointer-events-none no-print">
        {/* Render targets for individual Front and Back exports */}
        {renderFrontCard(true)}
        {renderBackCard(true)}

        {/* Side-by-side composite container matching the user reference graphic */}
        <div
          ref={sideBySideRef}
          className="p-8 flex items-center gap-8 bg-[#F5F1E8] rounded-3xl"
          style={{ width: '1060px' }}
        >
          {renderFrontCard(false)}
          {renderBackCard(false)}
        </div>
      </div>

      {/* ========================================================================= */}
      {/* PRINT-ONLY AREA (Cleanly outputs both Front and Back sides)               */}
      {/* ========================================================================= */}
      <div className="print-area hidden">
        <div className="max-w-4xl mx-auto p-4 space-y-6">
          <div className="text-center pb-2 border-b border-stone-300">
            <h1 className="text-lg font-bold text-[#071F25]">
              Pakistan Labour Community — Official Membership Card
            </h1>
            <p className="text-xs text-stone-600">
              Member: {member.fullName} • ID: {member.memberId || 'N/A'}
            </p>
          </div>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center">
            {renderFrontCard(false)}
            {renderBackCard(false)}
          </div>
        </div>
      </div>

    </div>
  );
};
