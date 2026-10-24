import React, { useState } from 'react';
import { X, ShieldAlert, HeartHandshake, AlertCircle, Copy, Check, FileText } from 'lucide-react';
import { FlagPair } from '../lib/flags';

interface TermsModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export const TermsModal: React.FC<TermsModalProps> = ({ isOpen, onClose }) => {
  const [copiedAccount, setCopiedAccount] = useState(false);

  if (!isOpen) return null;

  const handleCopyAccount = () => {
    navigator.clipboard.writeText('96766876');
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-xs animate-in fade-in duration-200">
      <div 
        className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-stone-200 overflow-hidden flex flex-col max-h-[90vh]"
        role="dialog"
        aria-modal="true"
        aria-labelledby="terms-modal-title"
      >
        {/* Modal Header */}
        <div className="bg-[#071F25] text-white px-6 py-4 flex items-center justify-between border-b border-amber-500/30">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-emerald-900/60 border border-emerald-500/30 flex items-center justify-center text-[#E4AE2F]">
              <FileText className="w-5 h-5" />
            </div>
            <div>
              <h2 id="terms-modal-title" className="text-base sm:text-lg font-bold font-heading">
                پاکستان کمیونٹی عمان — اہم وضاحت و ضوابط
              </h2>
              <p className="text-xs text-amber-400 font-medium">
                Official Community Charter & Welfare Terms
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-stone-400 hover:text-white p-1.5 rounded-lg hover:bg-white/10 transition-colors"
            aria-label="Close"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Modal Content - RTL Urdu Layout */}
        <div className="overflow-y-auto p-6 space-y-6 text-stone-800" dir="rtl">
          
          <div className="flex items-center justify-between pb-3 border-b border-stone-200">
            <div className="text-sm font-bold text-emerald-950 font-serif">
              السلام علیکم ورحمۃ اللہ وبرکاتہ
            </div>
            <FlagPair size="sm" />
          </div>

          <div className="space-y-3 leading-relaxed text-sm text-stone-700 font-medium">
            <p className="font-bold text-[#071F25] text-base">
              میرے پیارے پاکستانی بھائیو!
            </p>
            
            {/* Scope Warning Box */}
            <div className="p-4 rounded-2xl bg-amber-50 border border-amber-300 text-stone-800 space-y-2">
              <div className="flex items-center gap-2 font-bold text-amber-950 text-sm">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                <span>کمیونٹی کا دائرہ کار اور حدود:</span>
              </div>
              <p className="text-xs sm:text-sm leading-relaxed text-stone-700">
                پاکستان کمیونٹی عمان ہم نے اس مقصد کے لیے نہیں بنائی کہ کسی بھائی کا ویزا ختم ہو گیا ہو، ارباب کے ساتھ مسئلہ ہو، پیٹ میں درد یا معمولی بیماری ہو، یا کسی دوسرے ذاتی مسئلے کے لیے کمیونٹی سے رابطہ کیا جائے۔
              </p>
              <p className="text-xs sm:text-sm leading-relaxed text-stone-700 font-semibold">
                ہماری کمیونٹی کا اصل مقصد پاکستانی بھائیوں کے ساتھ بڑے اور غیر معمولی مشکل حالات میں مدد اور تعاون کرنا ہے۔
              </p>
            </div>

            <p className="text-xs sm:text-sm text-stone-700 leading-relaxed">
              خدانخواستہ اگر کسی پاکستانی بھائی کو کوئی بڑا حادثہ پیش آ جائے، کمر یا گردن ٹوٹ جائے، ہارٹ اٹیک ہو جائے، کوئی بڑی بیماری یا شدید نقصان ہو جائے، یا کسی بھائی کا انتقال ہو جائے، تو کمیونٹی اپنی استطاعت اور طے شدہ اصول کے مطابق اس بھائی اور اس کے خاندان کے ساتھ بھرپور تعاون کرے گی، ان شاء اللہ۔
            </p>
          </div>

          {/* Welfare Entitlements Grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            
            {/* Death Benefit */}
            <div className="p-4 rounded-2xl bg-emerald-50/90 border-2 border-emerald-300 space-y-2">
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-800 text-white text-xs font-bold">
                وفات کی صورت میں
              </span>
              <ul className="text-xs sm:text-sm text-emerald-950 space-y-1.5 font-bold list-disc pr-4">
                <li>مرحوم کی میت پاکستان بھیجنے کے لیے ایک ہوائی ٹکٹ۔</li>
                <li>2000 عمانی ریال (2,000 OMR) کی مالی مدد دی جائے گی۔</li>
              </ul>
            </div>

            {/* Severe Accident / Critical Illness */}
            <div className="p-4 rounded-2xl bg-amber-50/90 border-2 border-amber-300 space-y-2">
              <span className="inline-block px-2.5 py-0.5 rounded-md bg-amber-800 text-white text-xs font-bold">
                شدید حادثہ یا بڑی بیماری کی صورت میں
              </span>
              <p className="text-xs sm:text-sm text-amber-950 leading-relaxed font-semibold">
                اگر کسی بھائی کی کمر یا گردن ٹوٹ جائے، ہارٹ اٹیک ہو جائے یا کوئی ایسا بڑا مسئلہ پیش آئے جس کی وجہ سے وہ شدید مشکل میں ہو:
              </p>
              <p className="text-xs sm:text-sm font-bold text-amber-950">
                • کمیونٹی کی طرف سے 1000 عمانی ریال (1,000 OMR) کی مالی مدد دی جائے گی، ان شاء اللہ۔
              </p>
            </div>

          </div>

          {/* Mandatory Registration Condition */}
          <div className="p-4 rounded-2xl bg-rose-50/95 border-2 border-rose-300 text-rose-950 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
            <div className="space-y-1">
              <span className="font-bold text-xs sm:text-sm text-rose-900 block">
                اہم ترین لازمی شرط (Mandatory Eligibility Prerequisite):
              </span>
              <p className="text-xs sm:text-sm font-bold text-rose-950 leading-relaxed">
                یہ سب سہولیات صرف کمونٹی کے ساتھ داحلہ یا رجسٹریشن کیا ہو اس ممبر کو میسر ہوگی۔
              </p>
              <p className="text-[11px] text-rose-800">
                (All financial aid & repatriation assistance are strictly reserved for verified members formally enrolled with Pakistan Labour Community.)
              </p>
            </div>
          </div>

          {/* Official Bank Account for Community Fund */}
          <div className="p-4 rounded-2xl bg-[#071F25] text-white space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <HeartHandshake className="w-5 h-5 text-[#E4AE2F]" />
                <span className="font-bold text-sm text-amber-300">
                  تنظیم کا اکاؤنٹ نمبر برائے فنڈ و تعاون:
                </span>
              </div>
              <button
                type="button"
                onClick={handleCopyAccount}
                className="px-3 py-1 bg-amber-400 hover:bg-amber-300 text-[#071F25] rounded-lg text-xs font-bold flex items-center gap-1 transition-colors"
              >
                {copiedAccount ? <Check className="w-3.5 h-3.5" /> : <Copy className="w-3.5 h-3.5" />}
                <span>{copiedAccount ? 'کاپی ہو گیا' : 'کاپی کریں'}</span>
              </button>
            </div>

            <div className="bg-black/40 p-3 rounded-xl border border-white/20 text-center">
              <span className="font-mono text-xl sm:text-2xl font-bold tracking-widest text-[#E4AE2F]">
                96766876
              </span>
            </div>

            <p className="text-xs text-stone-300 leading-relaxed text-right">
              تمام بھائیوں سے گزارش ہے کہ اگر کوئی بھائی کمیونٹی کے فنڈ میں تعاون کرنا چاہتا ہے تو مذکورہ تنظیم کے اکاؤنٹ نمبر پر اپنا تعاون جمع کر سکتا ہے۔
            </p>
          </div>

          {/* Conclusion Prayer */}
          <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 text-xs sm:text-sm text-stone-700 leading-relaxed space-y-2">
            <p>
              ہم سب سے گزارش ہے کہ اس کمیونٹی کے اصل مقصد کو سمجھیں اور اسے ذاتی یا معمولی مسائل کے لیے استعمال نہ کریں۔ یہ تنظیم ہمارے پاکستانی بھائیوں کی بڑی مصیبت اور مشکل وقت میں ایک دوسرے کا سہارا بننے کے لیے بنائی گئی ہے۔
            </p>
            <p className="font-bold text-[#0D5A31]">
              اللہ تعالیٰ ہماری اس کوشش کو قبول فرمائے، ہمارے درمیان اتحاد، محبت اور بھائی چارہ قائم رکھے، اور کسی بھی بھائی کو ایسے مشکل حالات کا سامنا نہ کرنا پڑے۔ آمین۔
            </p>
          </div>

        </div>

        {/* Modal Footer */}
        <div className="bg-stone-50 p-4 border-t border-stone-200 flex items-center justify-between">
          <p className="text-[11px] text-stone-500 font-medium">
            Pakistan Labour Community (Oman & Pakistan)
          </p>
          <button
            type="button"
            onClick={onClose}
            className="px-5 py-2 bg-[#0D5A31] hover:bg-[#094224] text-white text-xs font-bold rounded-xl shadow-xs transition-colors"
          >
            سمجھ گیا / Accept Terms
          </button>
        </div>

      </div>
    </div>
  );
};
