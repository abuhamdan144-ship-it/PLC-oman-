import React, { useState } from 'react';
import { useAuth } from '../hooks/useAuth';
import { MembershipCard } from '../components/MembershipCard';
import { VotingPanel } from '../components/VotingPanel';
import { PakistanLabourCommunityLogo } from '../lib/logo';
import { FlagPair } from '../lib/flags';
import { compressImageToDataUrl } from '../lib/imageCompressor';
import { doc, updateDoc, addDoc, collection, serverTimestamp } from 'firebase/firestore';
import { db } from '../lib/firebase';
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

type IncidentCategory = 'death' | 'injury' | 'lost' | 'found';

const INCIDENT_CATEGORY_LABELS: Record<IncidentCategory, string> = {
  death: 'Death of registered member',
  injury: 'Injured',
  lost: 'Lost',
  found: 'Found',
};

export const MemberPage: React.FC = () => {
  const { member, user, notifications, markNotificationAsRead, isAdmin } = useAuth();

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
  const [incidentCategory, setIncidentCategory] = useState<IncidentCategory | ''>('');
  const [incidentLocation, setIncidentLocation] = useState('');
  const [incidentDetails, setIncidentDetails] = useState('');
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);
  const [incidentSubmitted, setIncidentSubmitted] = useState(false);
  const [incidentError, setIncidentError] = useState<string | null>(null);

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

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setUpdateMessage('Please choose an image file.');
      event.target.value = '';
      return;
    }
    setNewPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
    setUpdateMessage(null);
  };

  const handleUpdateProfile = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user) return;
    setIsUpdating(true);
    setUpdateMessage(null);

    try {
      const photoURL = newPhotoFile
        ? await compressImageToDataUrl(newPhotoFile, 32 * 1024, 320)
        : (member.photoURL || '');
      const memberDocRef = doc(db, 'members', user.uid);
      await updateDoc(memberDocRef, {
        mobile: editMobile.trim(),
        currentLocation: editLocation.trim(),
        emergencyContact: {
          name: editEmergencyName.trim(),
          phone: editEmergencyPhone.trim(),
          relation: editEmergencyRelation.trim() || 'Family',
        },
        photoURL,
      });

      setUpdateMessage('Profile details updated successfully!');
      setIsEditingProfile(false);
      setNewPhotoFile(null);
      setPhotoPreview(null);
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
    if (!incidentCategory || !incidentLocation.trim() || !incidentDetails.trim()) {
      setIncidentError('Choose a report type, enter where it happened, and provide report details.');
      return;
    }
    if (!user) {
      setIncidentError('Please sign in again before saving this report.');
      return;
    }
    if (!member.memberId) {
      setIncidentError('Your member ID is not assigned yet. Please contact an administrator; you can still send the report through WhatsApp below.');
      return;
    }

    setIsSubmittingIncident(true);
    setIncidentError(null);
    try {
      const reportCategory = incidentCategory as IncidentCategory;
      const urgency = reportCategory === 'death' ? 'critical' : reportCategory === 'injury' ? 'urgent' : 'normal';
      await addDoc(collection(db, 'incidents'), {
        memberUid: user.uid,
        memberId: member.memberId,
        memberName: member.fullName,
        memberMobile: member.mobile,
        subject: INCIDENT_CATEGORY_LABELS[reportCategory],
        category: reportCategory,
        details: `Location: ${incidentLocation.trim()}\n\n${incidentDetails.trim()}`,
        urgency,
        createdAt: serverTimestamp(),
        status: 'new',
      });
      setIncidentSubmitted(true);
      setTimeout(() => setIncidentSubmitted(false), 5000);
    } catch (err) {
      console.error('Error logging incident:', err);
      setIncidentError('Could not save the report. You can still send it directly using WhatsApp below.');
    } finally {
      setIsSubmittingIncident(false);
    }
  };

  const incidentWhatsAppMessage = [
    'Pakistan Labour Community Oman — Member Report',
    `Report type: ${incidentCategory ? INCIDENT_CATEGORY_LABELS[incidentCategory] : 'Not selected'}`,
    `Member: ${member.fullName}`,
    `Member ID: ${member.memberId || 'N/A'}`,
    `Contact: ${member.mobile || 'N/A'}`,
    `Location: ${incidentLocation.trim() || 'Not provided'}`,
    `Details: ${incidentDetails.trim() || 'Not provided'}`,
    'Finance / help line: +968 9676 6876',
    'Fund account: 96766876',
  ].join('\n');
  const incidentWhatsAppUrl = `https://wa.me/96896766876?text=${encodeURIComponent(incidentWhatsAppMessage)}`;

  return (
    <div className="min-h-screen bg-[#F9F7F2] pb-24">
      
      {/* Administrator Quick Notice Banner if Admin */}
      {(member.role === 'admin' || isAdmin) && (
        <div className="bg-[#E4AE2F] text-[#071F25] px-4 py-2.5 text-xs font-bold flex items-center justify-between shadow-md">
          <div className="max-w-7xl mx-auto w-full flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <span className="flex items-center gap-2">
              <ShieldCheck className="w-4 h-4 text-[#071F25]" />
              <span>Administrator Portal: Review, verify, and approve registered members.</span>
            </span>
            <a
              href="/admin/registrations"
              className="inline-flex items-center gap-1.5 px-3 py-1 bg-[#071F25] hover:bg-[#0e3b46] text-white rounded-lg text-xs font-bold transition-colors w-fit"
            >
              <span>Go to Admin Approval Dashboard →</span>
            </a>
          </div>
        </div>
      )}

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
          <div className="hidden md:flex items-center gap-1 overflow-x-auto mt-8 border-b border-white/10 pb-0.5 text-xs font-semibold scrollbar-none">
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

        {notifications.filter((notification) => !notification.read && notification.type === 'announcement' && notification.title.startsWith('Voting is open:')).slice(0, 1).map((notification) => (
          <div key={notification.id} role="status" className="mb-6 rounded-2xl border border-amber-300 bg-amber-50 p-4 shadow-sm sm:flex sm:items-center sm:justify-between sm:gap-4">
            <div>
              <p className="text-[10px] font-extrabold uppercase tracking-wide text-amber-900">New voting notification</p>
              <h2 className="mt-1 text-sm font-bold text-[#071F25]">{notification.title}</h2>
              <p className="mt-1 text-xs leading-relaxed text-stone-700">{notification.body}</p>
            </div>
            <button
              type="button"
              onClick={() => {
                void markNotificationAsRead(notification.id).catch((error) => console.warn('Could not mark voting alert as read:', error));
                setActiveTab('voting');
                window.scrollTo({ top: 400, behavior: 'smooth' });
              }}
              className="mt-3 shrink-0 rounded-xl bg-[#071F25] px-4 py-2.5 text-xs font-bold text-white hover:bg-emerald-900 sm:mt-0"
            >
              Open ballot
            </button>
          </div>
        ))}

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
              <div className="rounded-xl border border-stone-200 p-4">
                <div className="flex items-center gap-4">
                  <img
                    src={photoPreview || member.photoURL || 'https://via.placeholder.com/150'}
                    alt="Member Photo"
                    className="h-20 w-16 rounded-lg border-2 border-[#E4AE2F] object-cover"
                  />
                  <div>
                    <label className="block text-xs font-bold text-[#071F25] mb-1">Card Profile Photo</label>
                    <p className="text-xs text-stone-500">Displayed on your digital membership card and in the admin member list.</p>
                  </div>
                </div>
                {isEditingProfile && (
                  <label htmlFor="edit-photo-file" className="mt-3 inline-flex cursor-pointer items-center gap-2 rounded-lg border border-stone-300 bg-white px-3 py-2 text-xs font-semibold text-stone-700 hover:bg-stone-50">
                    <Upload className="h-4 w-4" />
                    {photoPreview ? 'Change Photo' : 'Upload New Photo'}
                    <input id="edit-photo-file" type="file" accept="image/*" onChange={handlePhotoSelect} className="sr-only" />
                  </label>
                )}
                {isEditingProfile && <p className="mt-2 text-[10px] text-stone-500">Photo is compressed to a small membership-card thumbnail and saved with your member record. No Storage plan or billing is needed.</p>}
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

        {/* TAB 5: MEMBER REPORTS */}
        {activeTab === 'incident' && (
          <div className="max-w-2xl mx-auto bg-white rounded-3xl p-6 sm:p-10 shadow-sm border border-stone-200 animate-in fade-in duration-150">
            <h2 className="text-xl font-bold font-heading text-[#071F25] mb-2">
              Member Reports
            </h2>
            <p className="text-xs text-stone-600 mb-6 leading-relaxed">
              Use this section only for the death of a registered member, an injured member, or a lost or found report. Add where it happened and the details.
            </p>

            <div className="mb-5 rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
              <h3 className="text-xs font-bold text-emerald-950">Community Finance / Help Line</h3>
              <a href="tel:+96896766876" className="mt-1 inline-block font-mono text-sm font-bold text-emerald-900">+968 9676 6876</a>
              <p className="mt-1 text-[10px] text-emerald-900">WhatsApp and call support · Fund account: <strong>96766876</strong></p>
            </div>

            {incidentSubmitted && (
              <div className="mb-4 flex items-center gap-2 rounded-xl border border-emerald-300 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">
                <Check className="h-4 w-4 shrink-0" /> Report saved. You can also send it to the community WhatsApp using the button below.
              </div>
            )}
            {incidentError && <div role="alert" className="mb-4 rounded-xl border border-rose-300 bg-rose-50 p-3 text-xs font-semibold text-rose-900">{incidentError}</div>}

            <form onSubmit={handleSubmitIncident} className="space-y-4">
              <div>
                <label htmlFor="inc-category" className="block text-xs font-bold text-[#071F25] mb-1">Report type</label>
                <select
                  id="inc-category"
                  required
                  value={incidentCategory}
                  onChange={(event) => setIncidentCategory(event.target.value as IncidentCategory | '')}
                  className="w-full rounded-xl border border-stone-300 bg-white px-3 py-2.5 text-xs"
                >
                  <option value="">Choose report type</option>
                  <option value="death">Death of registered member</option>
                  <option value="injury">Injured</option>
                  <option value="lost">Lost</option>
                  <option value="found">Found</option>
                </select>
              </div>

              <div>
                <label htmlFor="inc-location" className="block text-xs font-bold text-[#071F25] mb-1">Location where it happened / item or person was lost or found</label>
                <input
                  id="inc-location"
                  required
                  value={incidentLocation}
                  onChange={(event) => setIncidentLocation(event.target.value)}
                  placeholder="City, wilayat, and specific location"
                  className="w-full rounded-xl border border-stone-300 px-3 py-2.5 text-xs"
                />
              </div>

              <div>
                <label htmlFor="inc-details" className="block text-xs font-bold text-[#071F25] mb-1">Report details</label>
                <textarea
                  id="inc-details"
                  rows={4}
                  required
                  value={incidentDetails}
                  onChange={(event) => setIncidentDetails(event.target.value)}
                  placeholder="Describe what happened and who needs help. Do not include passwords or private account details."
                  className="w-full rounded-xl border border-stone-300 p-3 text-xs focus:ring-2 focus:ring-[#0D5A31]"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <a
                  href={incidentWhatsAppUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center justify-center gap-2 rounded-xl bg-emerald-700 px-4 py-3 text-center text-xs font-bold text-white hover:bg-emerald-800"
                >
                  <ExternalLink className="h-4 w-4" /> Send report via WhatsApp
                </a>
                <button
                  type="submit"
                  disabled={isSubmittingIncident}
                  className="w-full rounded-xl bg-[#071F25] px-4 py-3 text-xs font-bold text-white transition-colors hover:bg-[#0e3742] disabled:opacity-50"
                >
                  {isSubmittingIncident ? 'Saving report...' : 'Save report to community'}
                </button>
              </div>
              <p className="text-center text-[10px] text-stone-500">WhatsApp opens with your report filled in. Review it and tap Send in WhatsApp. You can also save the report here for the community record.</p>
            </form>
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

              <div className="mt-6"><VotingPanel member={member} /></div>
            </div>
          </div>
        )}

      </main>

      <nav
        aria-label="Member portal navigation"
        className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 shadow-[0_-6px_20px_rgba(7,31,37,0.08)] backdrop-blur-md pb-[env(safe-area-inset-bottom)] md:hidden"
      >
        <div className="mx-auto flex max-w-lg items-stretch justify-around">
          {[
            { id: 'card', label: 'Card', fullLabel: 'Membership Card', Icon: CreditCard },
            { id: 'profile', label: 'Profile', fullLabel: 'Profile Details', Icon: User },
            { id: 'rules', label: 'Community', fullLabel: 'Community Rules & Law', Icon: FileText },
            { id: 'support', label: 'Helpline', fullLabel: 'Helpline & Support', Icon: PhoneCall },
            { id: 'incident', label: 'Reports', fullLabel: 'Incident Reporting', Icon: AlertOctagon },
            { id: 'voting', label: 'Voting', fullLabel: 'Voting', Icon: Vote },
          ].map(({ id, label, fullLabel, Icon }) => (
            <button
              key={id}
              type="button"
              aria-label={fullLabel}
              aria-current={activeTab === id ? 'page' : undefined}
              onClick={() => setActiveTab(id as typeof activeTab)}
              className={`flex min-w-0 flex-1 flex-col items-center justify-center gap-1 px-0.5 py-2 text-[9px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-emerald-700 ${
                activeTab === id ? 'text-emerald-900' : 'text-stone-500 hover:text-[#071F25]'
              }`}
            >
              <Icon className={`h-5 w-5 ${activeTab === id ? 'text-emerald-800' : 'text-stone-400'}`} />
              <span className="max-w-full truncate">{label}</span>
            </button>
          ))}
        </div>
      </nav>

      {/* Official Community Charter Modal */}
      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </div>
  );
};
