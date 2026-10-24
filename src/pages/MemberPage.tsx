import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { MembershipCard } from '../components/MembershipCard';
import { PakistanLabourCommunityLogo } from '../lib/logo';
import { FlagPair } from '../lib/flags';
import { compressImage } from '../lib/imageCompressor';
import { doc, updateDoc, addDoc, collection } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { db, storage } from '../lib/firebase';
import { TermsModal } from '../components/TermsModal';
import { 
  ShieldCheck, 
  CreditCard, 
  User, 
  PhoneCall, 
  FileText, 
  Vote, 
  AlertOctagon, 
  Check, 
  Save, 
  Edit3, 
  Upload, 
  MapPin, 
  HeartHandshake, 
  ExternalLink,
  ShieldAlert,
  HelpCircle,
  Clock,
  Copy,
  AlertCircle
} from 'lucide-react';

export const MemberPage: React.FC = () => {
  const { member, user, notifications, markNotificationAsRead } = useAuth();

  // Active section tab
  const [activeTab, setActiveTab] = useState<'card' | 'profile' | 'rules' | 'support' | 'incident' | 'voting'>('card');

  // Profile update form state
  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editMobile, setEditMobile] = useState(member?.mobile || '');
  const [editLocation, setEditLocation] = useState(member?.currentLocation || '');
  const [editEmergencyName, setEditEmergencyName] = useState(member?.emergencyContact?.name || '');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState(member?.emergencyContact?.phone || '');
  const [editEmergencyRelation, setEditEmergencyRelation] = useState(member?.emergencyContact?.relation || '');
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUpdating, setIsUpdating] = useState(false);
  const [updateMessage, setUpdateMessage] = useState<string | null>(null);

  // Incident reporting form state
  const [incidentSubject, setIncidentSubject] = useState('');
  const [incidentCategory, setIncidentCategory] = useState('wages');
  const [incidentDetails, setIncidentDetails] = useState('');
  const [incidentUrgency, setIncidentUrgency] = useState('normal');
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);
  const [incidentSubmitted, setIncidentSubmitted] = useState(false);

  // Community Charter Modal & Account Copy state
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [copiedFundAccount, setCopiedFundAccount] = useState(false);

  const handleCopyFundAccount = () => {
    navigator.clipboard.writeText('96766876');
    setCopiedFundAccount(true);
    setTimeout(() => setCopiedFundAccount(false), 2000);
  };

  if (!member) {
    return null;
  }

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      setNewPhotoFile(file);
      setPhotoPreview(URL.createObjectURL(file));
    }
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdating(true);
    setUpdateMessage(null);

    try {
      let photoURL = member.photoURL;

      if (newPhotoFile) {
        const compressedBlob = await compressImage(newPhotoFile, 400 * 1024, 800);
        const storageRef = ref(storage, `profile-photos/${user.uid}/profile_${Date.now()}.jpg`);
        const uploadResult = await uploadBytes(storageRef, compressedBlob, {
          contentType: 'image/jpeg',
        });
        photoURL = await getDownloadURL(uploadResult.ref);
      }

      const memberDocRef = doc(db, 'members', user.uid);
      await updateDoc(memberDocRef, {
        mobile: editMobile.trim(),
        currentLocation: editLocation.trim(),
        emergencyContact: {
          name: editEmergencyName.trim(),
          phone: editEmergencyPhone.trim(),
          relation: editEmergencyRelation.trim() || 'Family',
        },
        ...(photoURL ? { photoURL } : {}),
      });

      setUpdateMessage('Profile details updated successfully!');
      setIsEditingProfile(false);
      setTimeout(() => setUpdateMessage(null), 4000);
    } catch (err) {
      console.error('Update profile error:', err);
      setUpdateMessage('Failed to update details. Please try again.');
    } finally {
      setIsUpdating(false);
    }
  };

  const handleSubmitIncident = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!incidentDetails.trim()) return;

    setIsSubmittingIncident(true);
    try {
      if (user) {
        await addDoc(collection(db, 'incidents'), {
          memberUid: user.uid,
          memberId: member.memberId || 'N/A',
          memberName: member.fullName,
          memberMobile: member.mobile,
          subject: incidentSubject.trim() || 'Community Assistance Request',
          category: incidentCategory,
          details: incidentDetails.trim(),
          urgency: incidentUrgency,
          createdAt: new Date().toISOString(),
          status: 'pending_case_worker'
        });
      }
      setIncidentSubmitted(true);
      setIncidentSubject('');
      setIncidentDetails('');
      setTimeout(() => setIncidentSubmitted(false), 5000);
    } catch (err) {
      console.error('Error logging incident:', err);
    } finally {
      setIsSubmittingIncident(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] pb-24">
      
      {/* Approved Member Dashboard Header (Brand Authorized Logo usage) */}
      <section className="bg-[#071F25] text-white border-b border-amber-500/20 pt-8 pb-10 px-4 sm:px-6 lg:px-8 no-print">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
            
            <div className="flex items-start sm:items-center gap-4">
              <div className="shrink-0">
                <PakistanLabourCommunityLogo size={56} showText={false} />
              </div>
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-1">
                  <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-emerald-500/20 text-emerald-300 border border-emerald-500/40">
                    <ShieldCheck className="w-3.5 h-3.5 text-emerald-400" />
                    Active member
                  </span>
                  <span className="font-mono text-xs font-bold text-amber-300 bg-black/40 px-2 py-0.5 rounded border border-amber-400/30">
                    {member.memberId || 'PLC-2026-ACTIVE'}
                  </span>
                  <FlagPair size="sm" />
                </div>
                <h1 className="text-xl sm:text-2xl lg:text-3xl font-extrabold font-heading text-white tracking-tight">
                  Welcome, {member.fullName}
                </h1>
                <p className="text-xs text-stone-300 mt-1 flex flex-wrap items-center gap-x-3 gap-y-1">
                  <span>Location: {member.currentLocation || member.country}</span>
                  <span>•</span>
                  <span>Member Since: {member.memberSince || '2026'}</span>
                </p>
              </div>
            </div>

            {/* Quick Actions */}
            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={() => {
                  setActiveTab('card');
                  window.scrollTo({ top: 400, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-bold bg-[#E4AE2F] text-[#071F25] hover:bg-amber-400 transition-colors shadow-xs"
              >
                <CreditCard className="w-4 h-4" />
                <span>View Card</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('profile');
                  setIsEditingProfile(true);
                  window.scrollTo({ top: 450, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <Edit3 className="w-4 h-4 text-emerald-300" />
                <span>Update Details</span>
              </button>

              <button
                type="button"
                onClick={() => {
                  setActiveTab('support');
                  window.scrollTo({ top: 450, behavior: 'smooth' });
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-2 rounded-xl text-xs font-semibold bg-white/10 hover:bg-white/20 text-white transition-colors"
              >
                <PhoneCall className="w-4 h-4 text-amber-300" />
                <span>Contact Support</span>
              </button>
            </div>

          </div>

          {/* Secondary Nav Tabs */}
          <div className="flex items-center gap-1 overflow-x-auto mt-8 border-b border-white/10 pb-0.5 text-xs font-semibold scrollbar-none">
            <button
              onClick={() => setActiveTab('card')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl transition-colors shrink-0 ${
                activeTab === 'card'
                  ? 'bg-[#F9F7F2] text-[#071F25] font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <CreditCard className="w-4 h-4 text-[#0D5A31]" />
              <span>Membership Card</span>
            </button>

            <button
              onClick={() => setActiveTab('profile')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl transition-colors shrink-0 ${
                activeTab === 'profile'
                  ? 'bg-[#F9F7F2] text-[#071F25] font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <User className="w-4 h-4 text-[#0D5A31]" />
              <span>Profile Details</span>
            </button>

            <button
              onClick={() => setActiveTab('rules')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl transition-colors shrink-0 ${
                activeTab === 'rules'
                  ? 'bg-[#F9F7F2] text-[#071F25] font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <FileText className="w-4 h-4 text-[#0D5A31]" />
              <span>Community Rules & Law</span>
            </button>

            <button
              onClick={() => setActiveTab('support')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl transition-colors shrink-0 ${
                activeTab === 'support'
                  ? 'bg-[#F9F7F2] text-[#071F25] font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <PhoneCall className="w-4 h-4 text-[#0D5A31]" />
              <span>Helpline & Support</span>
            </button>

            <button
              onClick={() => setActiveTab('incident')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl transition-colors shrink-0 ${
                activeTab === 'incident'
                  ? 'bg-[#F9F7F2] text-[#071F25] font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <AlertOctagon className="w-4 h-4 text-[#0D5A31]" />
              <span>Incident Reporting</span>
            </button>

            <button
              onClick={() => setActiveTab('voting')}
              className={`flex items-center gap-1.5 px-4 py-2.5 rounded-t-xl transition-colors shrink-0 ${
                activeTab === 'voting'
                  ? 'bg-[#F9F7F2] text-[#071F25] font-bold shadow-xs'
                  : 'text-stone-300 hover:text-white hover:bg-white/5'
              }`}
            >
              <Vote className="w-4 h-4 text-[#0D5A31]" />
              <span>Voting</span>
            </button>
          </div>

        </div>
      </section>

      {/* Main Content Area */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {updateMessage && (
          <div className="mb-6 p-4 rounded-xl bg-emerald-100 border border-emerald-300 text-emerald-900 text-xs sm:text-sm font-semibold flex items-center gap-2 animate-in fade-in">
            <Check className="w-5 h-5 text-emerald-700" />
            <span>{updateMessage}</span>
          </div>
        )}

        {/* TAB 1: MEMBERSHIP CARD */}
        {activeTab === 'card' && (
          <div className="space-y-8 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl shadow-xl border border-stone-200/80 p-6 sm:p-10 flex flex-col items-center">
              
              <div className="text-center max-w-md mb-6">
                <span className="text-xs font-bold uppercase tracking-wider text-[#0D5A31]">
                  Official Digital Credential
                </span>
                <h2 className="text-xl sm:text-2xl font-bold font-heading text-[#071F25] mt-1">
                  Double-Sided Membership Card
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Click 'Flip' or use toggle button below to inspect Front and Back. Print or download for offline verification.
                </p>
              </div>

              {/* Renders the double-sided card with strict flag & logo compliance */}
              <MembershipCard member={member} />

            </div>

            {/* Quick Profile Summary Card */}
            <div className="bg-white rounded-2xl p-6 shadow-sm border border-stone-200">
              <div className="flex items-center justify-between border-b border-stone-100 pb-4 mb-4">
                <div className="flex items-center gap-2">
                  <User className="w-5 h-5 text-[#0D5A31]" />
                  <h3 className="font-bold text-[#071F25] text-base">Community Member Record</h3>
                </div>
                <button
                  onClick={() => {
                    setActiveTab('profile');
                    setIsEditingProfile(true);
                  }}
                  className="text-xs font-bold text-[#0D5A31] hover:underline"
                >
                  Edit profile details →
                </button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 text-xs">
                <div>
                  <span className="text-stone-400 block uppercase text-[10px]">Official Member ID</span>
                  <span className="font-mono font-bold text-base text-emerald-800">{member.memberId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block uppercase text-[10px]">National ID / Passport</span>
                  <span className="font-mono font-semibold text-stone-800">{member.idNumber}</span>
                </div>
                <div>
                  <span className="text-stone-400 block uppercase text-[10px]">Country of Residence</span>
                  <span className="font-semibold text-stone-800">{member.country} ({member.currentLocation})</span>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 2: PROFILE DETAILS & UPDATE FORM */}
        {activeTab === 'profile' && (
          <div className="max-w-3xl mx-auto bg-white rounded-3xl shadow-xl border border-stone-200 p-6 sm:p-10 animate-in fade-in duration-150">
            <div className="flex items-center justify-between border-b border-stone-200 pb-4 mb-6">
              <div>
                <h2 className="text-xl font-bold font-heading text-[#071F25]">
                  Profile Details & Settings
                </h2>
                <p className="text-xs text-stone-500 mt-1">
                  Keep your phone, location, and emergency contact up to date for community alerts.
                </p>
              </div>
              {!isEditingProfile && (
                <button
                  type="button"
                  onClick={() => setIsEditingProfile(true)}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-bold bg-[#0D5A31] text-white hover:bg-[#094224]"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  <span>Edit Details</span>
                </button>
              )}
            </div>

            {/* Read-Only Non-Editable Administrative Credentials */}
            <div className="bg-[#FAF7F2] p-4 rounded-xl border border-stone-200 mb-6 space-y-3">
              <span className="text-[11px] font-bold uppercase tracking-wider text-stone-600 block">
                Administrative System Record (Locked)
              </span>
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-xs">
                <div>
                  <span className="text-stone-400 block text-[10px]">Member ID</span>
                  <span className="font-mono font-bold text-[#0D5A31]">{member.memberId || 'N/A'}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">CNIC / Passport #</span>
                  <span className="font-mono font-semibold text-stone-700">{member.idNumber}</span>
                </div>
                <div>
                  <span className="text-stone-400 block text-[10px]">Membership Status</span>
                  <span className="font-semibold text-emerald-700 uppercase">{member.status}</span>
                </div>
              </div>
              <p className="text-[10px] text-stone-500 italic">
                * Note: Full name, CNIC/Passport, Member ID, and status are protected civic fields and cannot be modified by members.
              </p>
            </div>

            {/* Form */}
            <form onSubmit={handleUpdateProfile} className="space-y-6">
              
              {/* Photo */}
              <div className="flex items-center gap-4 p-4 rounded-xl border border-stone-200">
                <img
                  src={photoPreview || member.photoURL || 'https://via.placeholder.com/150'}
                  alt="Member Photo"
                  className="w-16 h-20 object-cover rounded-lg border-2 border-[#E4AE2F]"
                />
                <div>
                  <label className="block text-xs font-bold text-[#071F25] mb-1">
                    Card Profile Photo
                  </label>
                  {isEditingProfile ? (
                    <div>
                      <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white border border-stone-300 rounded-lg text-xs font-semibold cursor-pointer hover:bg-stone-50">
                        <Upload className="w-3.5 h-3.5" />
                        <span>Upload New Photo</span>
                        <input type="file" accept="image/*" onChange={handlePhotoSelect} className="sr-only" />
                      </label>
                      <p className="text-[10px] text-stone-500 mt-1">Compressed automatically under 500 KB.</p>
                    </div>
                  ) : (
                    <p className="text-xs text-stone-500">Current photo active on digital card</p>
                  )}
                </div>
              </div>

              {/* Editable Fields */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="edit-mobile" className="block text-xs font-bold text-[#071F25] mb-1">
                    Mobile Phone Number
                  </label>
                  <input
                    id="edit-mobile"
                    type="tel"
                    disabled={!isEditingProfile}
                    value={editMobile}
                    onChange={(e) => setEditMobile(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 disabled:bg-stone-100 disabled:text-stone-600 focus:ring-2 focus:ring-[#0D5A31]"
                  />
                </div>

                <div>
                  <label htmlFor="edit-location" className="block text-xs font-bold text-[#071F25] mb-1">
                    Current Location / Wilayat
                  </label>
                  <input
                    id="edit-location"
                    type="text"
                    disabled={!isEditingProfile}
                    value={editLocation}
                    onChange={(e) => setEditLocation(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 disabled:bg-stone-100 disabled:text-stone-600 focus:ring-2 focus:ring-[#0D5A31]"
                  />
                </div>

                <div>
                  <label htmlFor="edit-emerg-name" className="block text-xs font-bold text-[#071F25] mb-1">
                    Emergency Contact Name & Relation
                  </label>
                  <input
                    id="edit-emerg-name"
                    type="text"
                    disabled={!isEditingProfile}
                    value={editEmergencyName}
                    onChange={(e) => setEditEmergencyName(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 disabled:bg-stone-100 disabled:text-stone-600 focus:ring-2 focus:ring-[#0D5A31]"
                  />
                </div>

                <div>
                  <label htmlFor="edit-emerg-phone" className="block text-xs font-bold text-[#071F25] mb-1">
                    Emergency Contact Phone
                  </label>
                  <input
                    id="edit-emerg-phone"
                    type="tel"
                    disabled={!isEditingProfile}
                    value={editEmergencyPhone}
                    onChange={(e) => setEditEmergencyPhone(e.target.value)}
                    className="w-full px-3 py-2 text-xs rounded-xl border border-stone-300 disabled:bg-stone-100 disabled:text-stone-600 focus:ring-2 focus:ring-[#0D5A31]"
                  />
                </div>
              </div>

              {isEditingProfile && (
                <div className="flex items-center justify-end gap-3 pt-4 border-t border-stone-200">
                  <button
                    type="button"
                    onClick={() => {
                      setIsEditingProfile(false);
                      setEditMobile(member.mobile);
                      setEditLocation(member.currentLocation);
                      setEditEmergencyName(member.emergencyContact?.name || '');
                      setEditEmergencyPhone(member.emergencyContact?.phone || '');
                      setNewPhotoFile(null);
                      setPhotoPreview(null);
                    }}
                    className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={isUpdating}
                    className="inline-flex items-center gap-1.5 px-5 py-2 rounded-xl text-xs font-bold bg-[#0D5A31] text-white hover:bg-[#094224] shadow-sm disabled:opacity-50"
                  >
                    <Save className="w-4 h-4" />
                    <span>{isUpdating ? 'Saving...' : 'Save Changes'}</span>
                  </button>
                </div>
              )}
            </form>
          </div>
        )}

        {/* TAB 3: COMMUNITY RULES & WORKER RIGHTS IN OMAN */}
        {activeTab === 'rules' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
            {/* Official Urdu Community Charter Card */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200 space-y-6">
              <div className="border-b border-stone-200 pb-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-11 h-11 rounded-2xl bg-[#071F25] text-[#E4AE2F] flex items-center justify-center font-bold">
                    <FileText className="w-6 h-6" />
                  </div>
                  <div>
                    <h2 className="text-lg sm:text-xl font-bold font-heading text-[#071F25]">
                      پاکستان کمیونٹی عمان — اہم وضاحت و فلاحی ضوابط
                    </h2>
                    <p className="text-xs text-amber-700 font-semibold">
                      Official Community Welfare Charter & Support Guidelines
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowTermsModal(true)}
                  className="px-4 py-2 bg-[#0D5A31] hover:bg-[#094224] text-white rounded-xl text-xs font-bold transition-colors shrink-0 shadow-xs"
                >
                  پورا چارٹر دیکھیں (Open Dialog)
                </button>
              </div>

              {/* Urdu RTL Body */}
              <div className="space-y-4 text-stone-800" dir="rtl">
                <div className="flex items-center justify-between border-b border-stone-100 pb-2">
                  <p className="text-sm font-bold text-emerald-950 font-serif">
                    السلام علیکم ورحمۃ اللہ وبرکاتہ — میرے پیارے پاکستانی بھائیو!
                  </p>
                  <FlagPair size="sm" />
                </div>

                {/* Scope clarification */}
                <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 space-y-2">
                  <div className="flex items-center gap-2 text-amber-950 font-bold text-sm">
                    <AlertCircle className="w-5 h-5 text-amber-700 shrink-0" />
                    <span>کمیونٹی کا اصل دائرہ کار:</span>
                  </div>
                  <p className="text-xs sm:text-sm text-stone-700 leading-relaxed font-medium">
                    پاکستان کمیونٹی عمان ہم نے اس مقصد کے لیے نہیں بنائی کہ کسی بھائی کا ویزا ختم ہو گیا ہو، ارباب کے ساتھ مسئلہ ہو، پیٹ میں درد یا معمولی بیماری ہو، یا کسی دوسرے ذاتی مسئلے کے لیے کمیونٹی سے رابطہ کیا جائے۔
                  </p>
                  <p className="text-xs sm:text-sm text-amber-950 font-bold leading-relaxed">
                    ہماری کمیونٹی کا اصل مقصد پاکستانی بھائیوں کے ساتھ بڑے اور مشکل حالات میں مدد اور باہمی تعاون کرنا ہے۔
                  </p>
                </div>

                {/* Welfare Provisions Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 pt-1">
                  {/* Death Benefit */}
                  <div className="p-4 rounded-2xl bg-emerald-50/80 border-2 border-emerald-300 space-y-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-emerald-800 text-white text-xs font-bold">
                      وفات کی صورت میں
                    </span>
                    <ul className="text-xs sm:text-sm text-emerald-950 font-bold space-y-1 list-disc pr-4">
                      <li>مرحوم کی میت پاکستان بھیجنے کے لیے ایک ہوائی ٹکٹ۔</li>
                      <li>2000 عمانی ریال (2,000 OMR) کی مالی امداد دی جائے گی۔</li>
                    </ul>
                  </div>

                  {/* Severe Accident */}
                  <div className="p-4 rounded-2xl bg-amber-50/80 border-2 border-amber-300 space-y-2">
                    <span className="inline-block px-2.5 py-0.5 rounded-md bg-amber-800 text-white text-xs font-bold">
                      شدید حادثہ یا بڑی بیماری
                    </span>
                    <p className="text-xs sm:text-sm text-amber-950 font-medium leading-relaxed">
                      اگر کسی بھائی کی کمر یا گردن ٹوٹ جائے، ہارٹ اٹیک ہو جائے یا کوئی بڑا مسئلہ پیش آئے:
                    </p>
                    <p className="text-xs sm:text-sm text-amber-950 font-bold">
                      • کمیونٹی کی طرف سے 1000 عمانی ریال (1,000 OMR) کی مالی مدد دی جائے گی، ان شاء اللہ۔
                    </p>
                  </div>
                </div>

                {/* Mandatory Registration Condition */}
                <div className="p-3.5 rounded-2xl bg-rose-50 border-2 border-rose-300 text-rose-950 flex items-start gap-3">
                  <ShieldAlert className="w-5 h-5 text-rose-700 shrink-0 mt-0.5" />
                  <div className="space-y-1">
                    <span className="font-bold text-xs sm:text-sm text-rose-900 block">
                      لازمی اہلیت کی شرط (Mandatory Registration Prerequisite):
                    </span>
                    <p className="text-xs sm:text-sm font-bold text-rose-950 leading-relaxed">
                      یہ سب سہولیات صرف کمونٹی کے ساتھ داحلہ یا رجسٹریشن کیا ہو اس ممبر کو میسر ہوگی۔
                    </p>
                    <p className="text-[11px] text-rose-800">
                      (All assistance and benefits are exclusively available to approved members registered with Pakistan Labour Community.)
                    </p>
                  </div>
                </div>

                {/* Account Number Box */}
                <div className="p-4 rounded-2xl bg-[#071F25] text-white flex flex-col sm:flex-row items-center justify-between gap-3">
                  <div className="space-y-1 text-center sm:text-right">
                    <div className="flex items-center gap-2 justify-center sm:justify-start">
                      <HeartHandshake className="w-5 h-5 text-[#E4AE2F]" />
                      <span className="text-xs font-bold text-amber-300">
                        تنظیم کا آفیشل اکاؤنٹ نمبر برائے فنڈ و تعاون:
                      </span>
                    </div>
                    <p className="text-xs text-stone-300">
                      جو بھائی فنڈ میں حصہ ڈالنا چاہتے ہیں، وہ اس اکاؤنٹ پر تعاون جمع کر سکتے ہیں۔
                    </p>
                  </div>

                  <div className="flex items-center gap-3">
                    <div className="bg-black/50 px-4 py-2 rounded-xl border border-amber-500/40 text-center">
                      <span className="font-mono text-xl sm:text-2xl font-bold text-[#E4AE2F] tracking-widest">
                        96766876
                      </span>
                    </div>
                    <button
                      type="button"
                      onClick={handleCopyFundAccount}
                      className="px-3.5 py-2 bg-amber-400 hover:bg-amber-300 text-[#071F25] rounded-xl text-xs font-bold flex items-center gap-1.5 transition-colors"
                    >
                      {copiedFundAccount ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                      <span>{copiedFundAccount ? 'کاپی ہو گیا' : 'کاپی'}</span>
                    </button>
                  </div>
                </div>

                {/* Prayer */}
                <p className="text-xs text-stone-600 italic text-center font-serif pt-1">
                  اللہ تعالیٰ ہمارے درمیان اتحاد و بھائی چارہ قائم رکھے، اور ہماری اس خدمت کو قبول فرمائے۔ آمین۔
                </p>
              </div>
            </div>

            {/* Standard Labour Regulations Box */}
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200">
              <h2 className="text-xl font-bold font-heading text-[#071F25] mb-2">
                Oman Labour Regulations & Worker Rights Handbook
              </h2>
              <p className="text-xs text-stone-600 mb-6 leading-relaxed">
                Key protections codified under Sultanate of Oman Royal Decree and Ministry of Labour guidelines for expatriate workforce members.
              </p>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#0D5A31] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0D5A31]" />
                    Passport Retention Law
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Under Omani Labour Law and human rights directives, withholding an employee's original passport is strictly prohibited. Your passport remains your personal property at all times.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#0D5A31] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0D5A31]" />
                    Midday Summer Work Ban
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Outdoor labour is legally halted between 12:30 PM and 3:30 PM during the peak summer months (June, July, August) to prevent heat stress and dehydration.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#0D5A31] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0D5A31]" />
                    Wage Protection System (WPS)
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    All salaries must be transferred directly into certified local bank accounts within seven days of the end of each pay cycle.
                  </p>
                </div>

                <div className="p-4 rounded-2xl bg-stone-50 border border-stone-200 space-y-2">
                  <h3 className="font-bold text-xs uppercase tracking-wider text-[#0D5A31] flex items-center gap-2">
                    <ShieldCheck className="w-4 h-4 text-[#0D5A31]" />
                    End of Service Gratuity
                  </h3>
                  <p className="text-xs text-stone-600 leading-relaxed">
                    Expatriate workers who complete one full year of service are entitled to statutory end-of-service gratuity calculated on basic salary.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 4: HELPLINE & EMBASSY SUPPORT */}
        {activeTab === 'support' && (
          <div className="max-w-4xl mx-auto space-y-6 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200">
              <h2 className="text-xl font-bold font-heading text-[#071F25] mb-2">
                Official Consular & Community Welfare Contacts
              </h2>
              <p className="text-xs text-stone-600 mb-6">
                Direct helplines for Pakistani nationals in Muscat, Salalah, Sohar, Nizwa, and Sur.
              </p>

              <div className="space-y-4">
                <div className="p-5 rounded-2xl bg-[#071F25] text-white flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
                  <div>
                    <span className="text-xs font-bold text-amber-400 uppercase tracking-wider">Embassy of Pakistan — Muscat</span>
                    <h3 className="text-base font-bold mt-1">Community Welfare & Labour Section</h3>
                    <p className="text-xs text-stone-300 mt-1">
                      Diplomatic Area, Al Khuwair, P.O. Box 84, Postal Code 115, Muscat
                    </p>
                  </div>
                  <a
                    href="tel:+96824696991"
                    className="inline-flex items-center gap-2 px-4 py-2.5 rounded-xl bg-[#E4AE2F] text-[#071F25] font-bold text-xs hover:bg-amber-400"
                  >
                    <PhoneCall className="w-4 h-4" />
                    <span>+968 2469 6991</span>
                  </a>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 text-xs">
                  <div className="p-4 rounded-xl border border-stone-200 bg-stone-50">
                    <h4 className="font-bold text-stone-900">Oman Ministry of Labour (Toll-Free)</h4>
                    <p className="text-stone-500 mt-1">Direct grievance and inquiry hotline</p>
                    <p className="font-mono font-bold text-emerald-800 text-sm mt-2">80077000</p>
                  </div>

                  <div className="p-4 rounded-xl border border-stone-200 bg-stone-50">
                    <h4 className="font-bold text-stone-900">Royal Oman Police (ROP) Emergency</h4>
                    <p className="text-stone-500 mt-1">24/7 Police, Ambulance, Civil Defense</p>
                    <p className="font-mono font-bold text-rose-800 text-sm mt-2">9999</p>
                  </div>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* TAB 5: INCIDENT & GRIEVANCE REPORTING */}
        {activeTab === 'incident' && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-stone-200 animate-in fade-in duration-150">
            <h2 className="text-xl font-bold font-heading text-[#071F25] mb-2">
              Log an Incident or Request Urgent Welfare
            </h2>
            <p className="text-xs text-stone-600 mb-6 leading-relaxed">
              Have an unresolved dispute regarding unpaid wages, workplace safety, medical emergency, or lost documents? Submit a report directly to the community welfare committee.
            </p>

            {incidentSubmitted ? (
              <div className="p-6 rounded-2xl bg-emerald-50 border border-emerald-300 text-center space-y-3">
                <Check className="w-10 h-10 text-emerald-600 mx-auto" />
                <h3 className="text-base font-bold text-emerald-900">Incident Report Logged</h3>
                <p className="text-xs text-emerald-800 max-w-sm mx-auto">
                  Your case has been recorded. A community liaison or welfare officer will review the report and reach out to your registered phone number.
                </p>
              </div>
            ) : (
              <form onSubmit={handleSubmitIncident} className="space-y-4">
                <div>
                  <label htmlFor="inc-subject" className="block text-xs font-bold text-[#071F25] mb-1">
                    Subject / Summary
                  </label>
                  <input
                    id="inc-subject"
                    type="text"
                    required
                    value={incidentSubject}
                    onChange={(e) => setIncidentSubject(e.target.value)}
                    placeholder="e.g. Unpaid wages for 2 months / Medical emergency assistance"
                    className="w-full px-3 py-2.5 text-xs rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#0D5A31]"
                  />
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                  <div>
                    <label htmlFor="inc-category" className="block text-xs font-bold text-[#071F25] mb-1">
                      Issue Category
                    </label>
                    <select
                      id="inc-category"
                      value={incidentCategory}
                      onChange={(e) => setIncidentCategory(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-stone-300 bg-white"
                    >
                      <option value="wages">Unpaid / Delayed Wages</option>
                      <option value="medical">Medical or Workplace Injury</option>
                      <option value="passport">Passport / Residency Card Issue</option>
                      <option value="housing">Accommodation & Living Conditions</option>
                      <option value="repatriation">Repatriation / Flight Assistance</option>
                      <option value="other">Other Welfare Request</option>
                    </select>
                  </div>

                  <div>
                    <label htmlFor="inc-urgency" className="block text-xs font-bold text-[#071F25] mb-1">
                      Urgency Level
                    </label>
                    <select
                      id="inc-urgency"
                      value={incidentUrgency}
                      onChange={(e) => setIncidentUrgency(e.target.value)}
                      className="w-full px-3 py-2.5 text-xs rounded-xl border border-stone-300 bg-white"
                    >
                      <option value="normal">Standard (Review within 48h)</option>
                      <option value="urgent">Urgent (Within 24h)</option>
                      <option value="critical">Critical / Emergency</option>
                    </select>
                  </div>
                </div>

                <div>
                  <label htmlFor="inc-details" className="block text-xs font-bold text-[#071F25] mb-1">
                    Detailed Description
                  </label>
                  <textarea
                    id="inc-details"
                    rows={4}
                    required
                    value={incidentDetails}
                    onChange={(e) => setIncidentDetails(e.target.value)}
                    placeholder="Provide employer name, location, dates, and what assistance is urgently needed..."
                    className="w-full p-3 text-xs rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#0D5A31]"
                  />
                </div>

                <button
                  type="submit"
                  disabled={isSubmittingIncident}
                  className="w-full py-3 rounded-xl font-bold text-xs bg-[#071F25] text-white hover:bg-[#0e3742] transition-colors disabled:opacity-50"
                >
                  {isSubmittingIncident ? 'Submitting Case...' : 'Submit Incident to Welfare Committee'}
                </button>
              </form>
            )}
          </div>
        )}

        {/* TAB 6: VOTING & CIVIC INITIATIVES */}
        {activeTab === 'voting' && (
          <div className="max-w-3xl mx-auto space-y-6 animate-in fade-in duration-150">
            <div className="bg-white rounded-3xl p-6 sm:p-8 shadow-sm border border-stone-200">
              <div className="flex items-center gap-3 mb-2">
                <div className="p-2.5 rounded-xl bg-amber-100 text-amber-900">
                  <Vote className="w-6 h-6" />
                </div>
                <div>
                  <h2 className="text-xl font-bold font-heading text-[#071F25]">
                    Community Voting & Democratic Participation
                  </h2>
                  <p className="text-xs text-stone-500">
                    Empowering all approved Pakistani workers with a direct voice in community representation.
                  </p>
                </div>
              </div>

              <div className="mt-6 p-5 rounded-2xl bg-amber-50/60 border border-amber-200 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-xs font-bold text-amber-900 uppercase tracking-wider">
                    Upcoming Ballot #2026-B
                  </span>
                  <span className="text-[10px] bg-amber-200 text-amber-900 px-2 py-0.5 rounded-full font-bold">
                    Opens Next Month
                  </span>
                </div>
                <h3 className="font-bold text-sm text-[#071F25]">
                  Annual Community Welfare Executive Council & Regional Representatives (Muscat, Sohar, Salalah)
                </h3>
                <p className="text-xs text-stone-600 leading-relaxed">
                  Only active, verified members holding a registered membership card are eligible to cast ballots in community leadership polls.
                </p>
              </div>

              <div className="mt-4 p-4 rounded-xl border border-stone-200 text-xs text-stone-500">
                <span>Your voting credential is linked to Member ID: <strong>{member.memberId}</strong>. Check notifications for candidate profiles and voting dates.</span>
              </div>
            </div>
          </div>
        )}

      </main>

      {/* Official Community Charter Modal */}
      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </div>
  );
};
