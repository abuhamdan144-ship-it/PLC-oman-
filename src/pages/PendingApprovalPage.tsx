import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PakistanLabourCommunityLogo } from '../lib/logo';
import { FlagPair } from '../lib/flags';
import { doc, updateDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { compressImage } from '../lib/imageCompressor';
import { 
  Clock, 
  CheckCircle, 
  Lock, 
  RefreshCw, 
  PhoneCall, 
  LogOut, 
  AlertTriangle, 
  XCircle, 
  Info, 
  Calendar, 
  User, 
  MapPin, 
  Send,
  Receipt,
  MessageCircle,
  Copy,
  Check,
  UploadCloud,
  ExternalLink
} from 'lucide-react';

export const PendingApprovalPage: React.FC = () => {
  const { user, member, signOut, isApproved, isRejected, isInfoRequested } = useAuth();
  const navigate = useNavigate();
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [showSupportModal, setShowSupportModal] = useState(false);
  
  // Payment receipt on pending page
  const [copiedAccount, setCopiedAccount] = useState(false);
  const [receiptUploading, setReceiptUploading] = useState(false);
  const [receiptUploadSuccess, setReceiptUploadSuccess] = useState(false);

  // Info requested response state
  const [infoReply, setInfoReply] = useState('');
  const [isSubmittingReply, setIsSubmittingReply] = useState(false);
  const [replySuccess, setReplySuccess] = useState(false);

  const handleCopyAccount = () => {
    navigator.clipboard.writeText('96766876');
    setCopiedAccount(true);
    setTimeout(() => setCopiedAccount(false), 2000);
  };

  const handleSendWhatsAppReceipt = () => {
    const phone = '96896766876';
    const nameText = member?.fullName || user?.email || 'ممبر';
    const cnicText = member?.idNumber || 'فارم میں درج ہے';
    const mobileText = member?.mobile || 'فارم میں درج ہے';
    const locationText = member?.currentLocation || member?.country || 'عمان';
    const refText = member?.receiptReference ? `\nرسید نمبر: ${member.receiptReference}` : '';

    const message = `السلام علیکم!
میں نے پاکستان کمیونٹی عمان کی رجسٹریشن جمع کروائی ہے۔
یہ میری ادائیگی / فنڈ تعاون کی رسید ہے۔

نام: ${nameText}
شناختی کارڈ / پاسپورٹ: ${cnicText}
موبائل فون: ${mobileText}
شہر / ولایت: ${locationText}
تنظیم اکاؤنٹ نمبر: 96766876${refText}

برائے مہربانی رسید کی تصدیق فرما کر میری ممبرشپ منظور فرمائیں اور کارڈ جاری کریں۔ شکریہ!`;

    const url = `https://wa.me/${phone}?text=${encodeURIComponent(message)}`;
    window.open(url, '_blank', 'noopener,noreferrer');
  };

  const handleUploadReceiptNow = async (e: React.ChangeEvent<HTMLInputElement>) => {
    if (!e.target.files || !e.target.files[0] || !user) return;
    const file = e.target.files[0];
    setReceiptUploading(true);
    try {
      const compressed = await compressImage(file, 500 * 1024, 1200);
      const storageRef = ref(storage, `payment-receipts/${user.uid}/receipt_${Date.now()}.jpg`);
      const uploadRes = await uploadBytes(storageRef, compressed, { contentType: 'image/jpeg' });
      const downloadUrl = await getDownloadURL(uploadRes.ref);

      const docRef = doc(db, 'members', user.uid);
      await updateDoc(docRef, { paymentReceiptURL: downloadUrl });

      setReceiptUploadSuccess(true);
      setTimeout(() => setReceiptUploadSuccess(false), 5000);
    } catch (err) {
      console.warn('Receipt upload err:', err);
    } finally {
      setReceiptUploading(false);
    }
  };

  // Auto-redirect when approved or if admin
  useEffect(() => {
    if (member?.role === 'admin') {
      navigate('/admin/registrations');
      return;
    }
    if (isApproved) {
      navigate('/member');
    }
  }, [isApproved, member, navigate]);

  const handleManualRefresh = async () => {
    setIsRefreshing(true);
    // Reload user token & wait a moment for snapshot to trigger
    if (user && 'reload' in user && typeof user.reload === 'function') {
      try {
        await user.reload();
      } catch (e) {
        console.warn(e);
      }
    }
    setTimeout(() => {
      setIsRefreshing(false);
      if (isApproved) {
        navigate('/member');
      }
    }, 1000);
  };

  const handleSendInfoReply = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !infoReply.trim()) return;

    setIsSubmittingReply(true);
    try {
      const docRef = doc(db, 'members', user.uid);
      await updateDoc(docRef, {
        status: 'pending', // switch back to pending review
        applicantResponse: infoReply.trim(),
        adminNote: `Update submitted: "${infoReply.trim()}" (Pending re-review)`
      });
      setReplySuccess(true);
      setInfoReply('');
    } catch (err) {
      console.error('Failed to submit info update:', err);
    } finally {
      setIsSubmittingReply(false);
    }
  };

  const formatDate = (dateString?: string) => {
    if (!dateString) return 'Today';
    try {
      return new Date(dateString).toLocaleDateString(undefined, {
        year: 'numeric',
        month: 'long',
        day: 'numeric'
      });
    } catch {
      return dateString;
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] py-10 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-xl w-full">
        
        {/* Header Logo & Community Flags (Brand Authorized) */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <PakistanLabourCommunityLogo size={68} />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <FlagPair size="md" />
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-800">
              Pakistan Labour Community
            </span>
          </div>
        </div>

        {/* Main Status Container */}
        <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden">
          
          {/* Top Banner based on Status */}
          <div className={`p-6 text-center ${
            isRejected
              ? 'bg-rose-900 text-white'
              : isInfoRequested
              ? 'bg-[#071F25] text-white border-b-4 border-amber-400'
              : 'bg-[#071F25] text-white border-b-4 border-emerald-500'
          }`}>
            {isRejected ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-rose-800/80 text-rose-200 text-xs font-bold border border-rose-600 mb-3">
                <XCircle className="w-4 h-4 text-rose-300" />
                <span>Application Declined</span>
              </div>
            ) : isInfoRequested ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/20 text-amber-300 text-xs font-bold border border-amber-500/40 mb-3">
                <AlertTriangle className="w-4 h-4 text-amber-400" />
                <span>Additional Information Requested</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 px-3.5 py-1 rounded-full bg-amber-400/20 text-amber-300 text-xs font-bold border border-amber-400/40 mb-3">
                <Clock className="w-4 h-4 text-amber-400 animate-pulse" />
                <span>Pending admin approval</span>
              </div>
            )}

            <h1 className="text-xl sm:text-2xl font-bold font-heading">
              {isRejected
                ? 'Community Registration Status'
                : isInfoRequested
                ? 'Information Clarification Required'
                : 'Your registration is under review'}
            </h1>
            
            <p className="text-xs sm:text-sm text-stone-300 mt-2 max-w-md mx-auto leading-relaxed">
              {isRejected
                ? 'Your registration could not be approved at this time. Please see details below or contact community support.'
                : isInfoRequested
                ? 'An administrator has reviewed your file and requested additional clarification before final approval.'
                : 'Your details have been submitted successfully. A community administrator will review your registration before your member area is opened.'}
            </p>
          </div>

          <div className="p-6 sm:p-8 space-y-6">

            {/* 3-Step Timeline (Always clear, accessible, not color only) */}
            <div>
              <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider mb-4">
                Application Progress
              </h2>

              <div className="relative pl-6 space-y-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-stone-200">
                
                {/* Step 1: Registration Submitted (Done) */}
                <div className="relative flex items-start gap-3">
                  <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-emerald-600 text-white flex items-center justify-center ring-4 ring-white">
                    <CheckCircle className="w-3.5 h-3.5" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#071F25]">1. Registration Submitted</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-emerald-100 text-emerald-800 font-semibold">Done</span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Personal details and identification logged in system.
                    </p>
                  </div>
                </div>

                {/* Step 2: Admin Review */}
                <div className="relative flex items-start gap-3">
                  <div className={`absolute -left-6 top-0.5 w-5 h-5 rounded-full flex items-center justify-center ring-4 ring-white ${
                    isRejected 
                      ? 'bg-rose-600 text-white' 
                      : isInfoRequested 
                      ? 'bg-amber-500 text-[#071F25]' 
                      : 'bg-amber-400 text-[#071F25]'
                  }`}>
                    {isRejected ? (
                      <XCircle className="w-3.5 h-3.5" />
                    ) : (
                      <Clock className="w-3.5 h-3.5" />
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-[#071F25]">2. Admin Verification</span>
                      <span className={`text-[10px] px-2 py-0.5 rounded-md font-semibold ${
                        isRejected 
                          ? 'bg-rose-100 text-rose-800' 
                          : isInfoRequested 
                          ? 'bg-amber-100 text-amber-900' 
                          : 'bg-amber-100 text-amber-800'
                      }`}>
                        {isRejected ? 'Declined' : isInfoRequested ? 'Action Needed' : 'In Progress'}
                      </span>
                    </div>
                    <p className="text-xs text-stone-500 mt-0.5">
                      Verification of CNIC/Passport & residency between Pakistan and Oman.
                    </p>
                  </div>
                </div>

                {/* Step 3: Member Area Access (Locked) */}
                <div className="relative flex items-start gap-3 opacity-60">
                  <div className="absolute -left-6 top-0.5 w-5 h-5 rounded-full bg-stone-300 text-stone-600 flex items-center justify-center ring-4 ring-white">
                    <Lock className="w-3 h-3" />
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="text-xs font-bold text-stone-600">3. Member Area & Card</span>
                      <span className="text-[10px] px-2 py-0.5 rounded-md bg-stone-100 text-stone-600 font-semibold">Locked</span>
                    </div>
                    <p className="text-xs text-stone-400 mt-0.5">
                      Unlocks digital membership card and welfare services upon approval.
                    </p>
                  </div>
                </div>

              </div>
            </div>

            {/* Submitted Member Details Summary */}
            <div className="bg-[#FAF7F2] rounded-2xl p-4 border border-stone-200 space-y-2">
              <h3 className="text-xs font-bold text-stone-500 uppercase tracking-wider">
                Submitted File Details
              </h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs pt-1">
                <div className="flex items-center gap-2 text-stone-700">
                  <User className="w-3.5 h-3.5 text-stone-400" />
                  <span><strong>Applicant:</strong> {member?.fullName || user?.email}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-700">
                  <Calendar className="w-3.5 h-3.5 text-stone-400" />
                  <span><strong>Date:</strong> {formatDate(member?.registeredAt)}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-700">
                  <MapPin className="w-3.5 h-3.5 text-stone-400" />
                  <span><strong>Location:</strong> {member?.currentLocation || member?.country || 'Oman'}</span>
                </div>
                <div className="flex items-center gap-2 text-stone-700">
                  <span className="text-stone-400 font-mono text-[11px]">ID:</span>
                  <span><strong>CNIC/Passport:</strong> {member?.idNumber || 'Logged'}</span>
                </div>
              </div>
            </div>

            {/* Payment Receipt / Proof of Contribution Card */}
            <div className="bg-gradient-to-br from-emerald-50/90 via-white to-amber-50/60 rounded-2xl p-4 sm:p-5 border-2 border-emerald-300 shadow-xs space-y-3">
              <div className="flex items-center justify-between pb-2 border-b border-emerald-200">
                <div className="flex items-center gap-2">
                  <Receipt className="w-4 h-4 text-[#0D5A31]" />
                  <h3 className="text-xs sm:text-sm font-bold text-[#071F25]">
                    Payment Receipt & Proof (ادائیگی کی رسید)
                  </h3>
                </div>
                <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-full border border-emerald-300">
                  Fast Verification
                </span>
              </div>

              {/* Account Number Box */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 p-3 bg-white rounded-xl border border-stone-200">
                <div>
                  <span className="text-[11px] text-stone-500 font-semibold block">تنظیم کا اکاؤنٹ نمبر (Bank Muscat / Mobile Transfer):</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="font-mono text-base font-extrabold text-emerald-900 bg-emerald-50 px-2.5 py-0.5 rounded-lg border border-emerald-300">
                      96766876
                    </span>
                    <button
                      type="button"
                      onClick={handleCopyAccount}
                      className="px-2 py-1 text-[11px] font-bold bg-[#071F25] text-amber-300 hover:text-white rounded-lg transition-colors flex items-center gap-1"
                    >
                      {copiedAccount ? <Check className="w-3 h-3 text-emerald-400" /> : <Copy className="w-3 h-3" />}
                      <span>{copiedAccount ? 'کاپی ہو گیا' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
                <p className="text-[11px] text-stone-600 sm:text-right" dir="rtl">
                  فیس یا فنڈ تعاون جمع کر کے رسید واٹس ایپ پر بھیجیں۔
                </p>
              </div>

              {/* Direct WhatsApp Button */}
              <button
                type="button"
                onClick={handleSendWhatsAppReceipt}
                className="w-full py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-[#25D366] hover:bg-[#1EBE5D] text-white shadow-md hover:shadow-lg transition-all flex items-center justify-center gap-2 cursor-pointer"
              >
                <MessageCircle className="w-5 h-5 text-white shrink-0" />
                <span>Send Payment Receipt via WhatsApp (+968 96766876)</span>
              </button>

              {/* Already uploaded state or upload more */}
              <div className="pt-1 text-xs">
                {member?.paymentReceiptURL ? (
                  <div className="p-2.5 bg-emerald-100/80 rounded-xl border border-emerald-300 text-emerald-950 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <CheckCircle className="w-4 h-4 text-emerald-700" />
                      <span className="font-semibold text-xs">Payment receipt is attached to your review file</span>
                    </div>
                    <a
                      href={member.paymentReceiptURL}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[11px] font-bold text-emerald-900 underline flex items-center gap-1"
                    >
                      <span>View Slip</span>
                      <ExternalLink className="w-3 h-3" />
                    </a>
                  </div>
                ) : (
                  <div className="space-y-1.5 pt-1 border-t border-emerald-100">
                    <span className="text-[11px] text-stone-500 font-semibold block">
                      یا یہاں سے رسید کی تصویر اپلوڈ کریں:
                    </span>
                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-white border border-stone-300 hover:border-emerald-600 rounded-lg text-xs font-semibold text-stone-700">
                      <UploadCloud className="w-3.5 h-3.5 text-emerald-700" />
                      <span>{receiptUploading ? 'Uploading slip...' : 'Attach Receipt Image / PDF'}</span>
                      <input
                        type="file"
                        accept="image/*,application/pdf"
                        disabled={receiptUploading}
                        onChange={handleUploadReceiptNow}
                        className="hidden"
                      />
                    </label>
                    {receiptUploadSuccess && (
                      <span className="text-xs font-bold text-emerald-700 block mt-1">
                        ✓ رسید کامیابی سے اپلوڈ ہو گئی!
                      </span>
                    )}
                  </div>
                )}
              </div>
            </div>

            {/* Special State: Admin Note if Info Requested */}
            {isInfoRequested && (
              <div className="bg-amber-50 rounded-2xl p-4 border-2 border-amber-300 space-y-3">
                <div className="flex items-start gap-2.5">
                  <Info className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                      Administrator Message
                    </h4>
                    <p className="text-xs text-amber-950 mt-1 font-medium bg-white/70 p-3 rounded-lg border border-amber-200">
                      {member?.adminNote || 'Please provide clarification regarding your resident visa or contact phone.'}
                    </p>
                  </div>
                </div>

                {replySuccess ? (
                  <div className="p-3 bg-emerald-100 text-emerald-900 rounded-xl text-xs font-semibold flex items-center gap-2">
                    <CheckCircle className="w-4 h-4 text-emerald-700" />
                    <span>Your response has been sent to the administrator for re-review!</span>
                  </div>
                ) : (
                  <form onSubmit={handleSendInfoReply} className="space-y-2 pt-1">
                    <label htmlFor="infoReply" className="block text-xs font-bold text-stone-700">
                      Submit Requested Information
                    </label>
                    <textarea
                      id="infoReply"
                      rows={2}
                      value={infoReply}
                      onChange={(e) => setInfoReply(e.target.value)}
                      placeholder="Type your response or clarifications here..."
                      className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#0D5A31] bg-white text-stone-900"
                    />
                    <button
                      type="submit"
                      disabled={isSubmittingReply || !infoReply.trim()}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0D5A31] text-white text-xs font-semibold rounded-lg hover:bg-[#094224] disabled:opacity-50"
                    >
                      <Send className="w-3.5 h-3.5" />
                      <span>{isSubmittingReply ? 'Submitting...' : 'Send Clarification'}</span>
                    </button>
                  </form>
                )}
              </div>
            )}

            {/* Special State: Rejection Reason Note */}
            {isRejected && (
              <div className="bg-rose-50 rounded-2xl p-4 border border-rose-200 space-y-2">
                <div className="flex items-start gap-2.5">
                  <AlertTriangle className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                  <div>
                    <h4 className="text-xs font-bold text-rose-900 uppercase tracking-wider">
                      Reason for Decision
                    </h4>
                    <p className="text-xs text-rose-900 mt-1 leading-relaxed">
                      {member?.adminNote || 'Identification credentials or documentation could not be verified by the community administrator.'}
                    </p>
                  </div>
                </div>
                <p className="text-[11px] text-stone-600 pt-1">
                  If you believe this is a clerical misunderstanding, please reach out directly to community support below.
                </p>
              </div>
            )}

            {/* Action Buttons */}
            <div className="space-y-3 pt-2">
              {!isRejected && (
                <button
                  type="button"
                  onClick={handleManualRefresh}
                  disabled={isRefreshing}
                  className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-xs sm:text-sm bg-[#071F25] hover:bg-[#0f343e] text-white shadow-md transition-all focus:outline-hidden focus:ring-2 focus:ring-[#071F25]"
                >
                  <RefreshCw className={`w-4 h-4 text-amber-400 ${isRefreshing ? 'animate-spin' : ''}`} />
                  <span>{isRefreshing ? 'Checking approval status...' : 'Refresh Approval Status'}</span>
                </button>
              )}

              <div className="flex items-center gap-3">
                <button
                  type="button"
                  onClick={() => setShowSupportModal(true)}
                  className="flex-1 flex items-center justify-center gap-1.5 py-2.5 px-3 rounded-xl font-semibold text-xs border border-stone-300 hover:bg-stone-50 text-stone-700 transition-colors"
                >
                  <PhoneCall className="w-4 h-4 text-[#0D5A31]" />
                  <span>Contact Community Support</span>
                </button>

                <button
                  type="button"
                  onClick={signOut}
                  className="flex items-center justify-center gap-1.5 py-2.5 px-4 rounded-xl font-semibold text-xs border border-rose-200 text-rose-700 hover:bg-rose-50 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                  <span>Sign Out</span>
                </button>
              </div>
            </div>

          </div>
        </div>

        {/* Live Notification Indicator */}
        <p className="text-center text-xs text-stone-500 mt-4">
          Status updates in real-time. Once approved, this page will instantly redirect to your member dashboard.
        </p>

      </div>

      {/* Support Contact Dialog */}
      {showSupportModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <h3 className="font-bold text-[#071F25] text-base font-heading">
                Community Support & Embassy Desk
              </h3>
              <button
                onClick={() => setShowSupportModal(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>
            
            <p className="text-xs text-stone-600 leading-relaxed">
              If your review has taken more than 24 hours, you can reach out to our community liaisons:
            </p>

            <div className="space-y-2 text-xs">
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="font-bold text-stone-800 block">Pakistan Embassy Muscat Welfare Wing</span>
                <span className="text-stone-600 font-mono">+968 2469 6991</span>
                <span className="text-stone-400 block text-[11px]">Muscat, Sultanate of Oman</span>
              </div>
              <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                <span className="font-bold text-stone-800 block">Community Helpdesk WhatsApp</span>
                <span className="text-emerald-700 font-mono font-bold">+968 9123 4567</span>
                <span className="text-stone-400 block text-[11px]">Volunteer Support Team</span>
              </div>
            </div>

            <button
              onClick={() => setShowSupportModal(false)}
              className="w-full py-2 bg-[#071F25] text-white rounded-xl text-xs font-semibold"
            >
              Close
            </button>
          </div>
        </div>
      )}
    </div>
  );
};
