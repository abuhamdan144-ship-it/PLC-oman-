import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { PakistanLabourCommunityLogo } from '../lib/logo';
import { FlagPair } from '../lib/flags';
import { ShieldCheck, Phone, MapPin, HeartHandshake, FileText } from 'lucide-react';
import { TermsModal } from './TermsModal';

export const Footer: React.FC = () => {
  const [showCharterModal, setShowCharterModal] = useState(false);
  return (
    <footer className="bg-[#071F25] text-stone-300 border-t border-amber-500/20 pt-12 pb-16 no-print">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8 mb-12">
          
          {/* Col 1: Brand & Purpose */}
          <div className="md:col-span-2 space-y-4">
            <div className="flex items-center gap-3">
              <PakistanLabourCommunityLogo size={44} showText={false} />
              <div>
                <h3 className="font-bold text-white text-base">
                  Pakistan Labour Community
                </h3>
                <p className="text-xs text-amber-400 font-medium">
                  Sultanate of Oman & Pakistan • پاکستانی لیبر کمیونٹی
                </p>
              </div>
            </div>
            <p className="text-xs text-stone-400 leading-relaxed max-w-md">
              A united, verified civic welfare initiative dedicated to supporting, guiding, and empowering Pakistani workers, professionals, and families across the Sultanate of Oman.
            </p>
            <div className="flex items-center gap-2 pt-1">
              <FlagPair size="sm" />
              <span className="text-xs text-stone-400">Brotherly relations & mutual respect between Pakistan and Oman</span>
            </div>
          </div>

          {/* Col 2: Emergency & Helplines */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <Phone className="w-4 h-4 text-amber-400" />
              Emergency Helplines
            </h4>
            <ul className="text-xs space-y-2 text-stone-300">
              <li className="flex flex-col">
                <span className="text-stone-400">ROP Oman Emergency:</span>
                <span className="font-mono font-bold text-white text-sm">9999</span>
              </li>
              <li className="flex flex-col">
                <span className="text-stone-400">Oman Ministry of Labour:</span>
                <span className="font-mono font-bold text-emerald-300">80077000 (Toll Free)</span>
              </li>
              <li className="flex flex-col">
                <span className="text-stone-400">Embassy of Pakistan, Muscat:</span>
                <a href="tel:+96824603439" className="font-mono font-bold text-amber-300 hover:text-amber-200">+968 2460 3439</a>
              </li>
            </ul>
          </div>

          {/* Col 3: Key Civic Support Links */}
          <div className="space-y-3">
            <h4 className="text-sm font-semibold text-white uppercase tracking-wider flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#168A68]" />
              Support & Welfare
            </h4>
            <ul className="text-xs space-y-2 text-stone-300">
              <li>
                <button
                  type="button"
                  onClick={() => setShowCharterModal(true)}
                  className="flex items-center gap-1.5 text-amber-400 hover:text-amber-300 transition-colors font-bold text-left cursor-pointer"
                >
                  <FileText className="w-3.5 h-3.5 shrink-0" />
                  <span>کمیونٹی ضوابط و شرائط (Community Charter)</span>
                </button>
              </li>
              <li className="flex items-center gap-1.5 text-[11px] text-stone-400">
                <span>فنڈ اکاؤنٹ / Fund Account:</span>
                <span className="font-mono text-emerald-300 font-bold">96766876</span>
              </li>
              <li className="flex items-center gap-1.5">
                <MapPin className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>Consular Support & Passport Desk</span>
              </li>
              <li className="flex items-center gap-1.5">
                <HeartHandshake className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>Legal Guidance & Labour Law</span>
              </li>
              <li className="flex items-center gap-1.5">
                <ShieldCheck className="w-3.5 h-3.5 text-stone-400 shrink-0" />
                <span>Distress & Repatriation Assistance</span>
              </li>
            </ul>
          </div>

        </div>

        {/* Bottom Bar */}
        <div className="pt-8 border-t border-white/10 flex flex-col sm:flex-row items-center justify-between text-xs text-stone-500 gap-4">
          <p>© {new Date().getFullYear()} Pakistan Labour Community. Official Civic Registration & Verification System.</p>
          <div className="flex items-center gap-3 text-xs flex-wrap">
            <button
              type="button"
              onClick={() => setShowCharterModal(true)}
              className="text-stone-400 hover:text-white underline underline-offset-4 cursor-pointer"
            >
              Terms & Welfare Charter (شرائط)
            </button>
            <span>•</span>
            <Link 
              to="/admin/login" 
              className="text-amber-400/90 hover:text-amber-300 font-semibold underline underline-offset-4 transition-colors"
            >
              Admin Registry Desk
            </Link>
            <span>•</span>
            <span>Muscat, Oman</span>
            <span>•</span>
            <span>Islamabad, Pakistan</span>
          </div>
        </div>
      </div>

      {/* Community Charter Modal */}
      <TermsModal isOpen={showCharterModal} onClose={() => setShowCharterModal(false)} />
    </footer>
  );
};
