import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { 
  collection, 
  onSnapshot, 
  doc, 
  runTransaction, 
  updateDoc, 
  addDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { MemberProfile, MemberStatus } from '../types';
import { PakistanFlag, OmanFlag, FlagPair } from '../lib/flags';
import { 
  ShieldCheck, 
  Search, 
  Filter, 
  CheckCircle, 
  XCircle, 
  HelpCircle, 
  Clock, 
  AlertCircle, 
  Eye, 
  User, 
  MapPin, 
  Phone, 
  Calendar,
  Check,
  Send,
  RefreshCw,
  ExternalLink,
  ChevronDown
} from 'lucide-react';

export const AdminRegistrationsPage: React.FC = () => {
  const { user, member: currentAdmin } = useAuth();
  
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);

  // Modal Dialogs
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'info_requested' | null>(null);
  const [targetMember, setTargetMember] = useState<MemberProfile | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Real-time listener for all members
  useEffect(() => {
    setLoading(true);
    const membersColl = collection(db, 'members');
    
    const unsubscribe = onSnapshot(
      membersColl,
      (snapshot) => {
        const list: MemberProfile[] = [];
        snapshot.forEach((doc) => {
          list.push({
            uid: doc.id,
            ...doc.data(),
          } as MemberProfile);
        });
        setMembers(list);
        setLoadError(null);
        setLoading(false);
      },
      (error) => {
        console.error('Could not load the member registry:', error.message);
        setMembers([]);
        setLoadError(
          error.code === 'permission-denied'
            ? 'Firestore denied access to the member registry. Confirm this account has role: "admin" in the members collection and deploy the latest Firestore rules.'
            : `Could not load the member registry: ${error.message}`,
        );
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4000);
  };

  // Open confirmation modal
  const openActionModal = (member: MemberProfile, action: 'approve' | 'reject' | 'info_requested') => {
    setTargetMember(member);
    setActionType(action);
    setAdminNoteInput(
      action === 'info_requested' 
        ? 'Please provide a clear copy of your Oman Resident Card or Passport visa page.' 
        : action === 'reject' 
        ? 'Identity credentials could not be verified in the national database.' 
        : ''
    );
  };

  // Execute approval transaction
  const handleApprove = async () => {
    if (!targetMember) return;
    setActionProcessing(true);

    try {
      let generatedMemberId = '';
      const now = new Date();
      const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
      const memberSinceStr = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
      const nowIso = now.toISOString();

      // Transaction to safely generate unique sequential Member ID (PLC-2026-00001)
      const counterRef = doc(db, 'system', 'memberCounter');
      const memberRef = doc(db, 'members', targetMember.uid);
      const publicMemberRef = doc(db, 'publicMembers', targetMember.uid);

      await runTransaction(db, async (transaction) => {
        const counterDoc = await transaction.get(counterRef);
        let nextCount = 1;
        if (counterDoc.exists()) {
          nextCount = (counterDoc.data().currentCount || 0) + 1;
        }

        transaction.set(counterRef, { currentCount: nextCount, lastUpdated: nowIso }, { merge: true });

        const paddedCount = String(nextCount).padStart(5, '0');
        generatedMemberId = `PLC-2026-${paddedCount}`;

        transaction.update(memberRef, {
          status: 'approved',
          memberId: generatedMemberId,
          approvedAt: nowIso,
          memberSince: memberSinceStr,
          adminNote: adminNoteInput.trim() || 'Verified and approved by Community Administrator.',
        });

        transaction.set(publicMemberRef, {
          uid: targetMember.uid,
          memberId: generatedMemberId,
          fullName: targetMember.fullName,
          country: targetMember.country,
          currentLocation: targetMember.currentLocation || '',
          photoURL: targetMember.photoURL || '',
          status: 'approved',
          memberSince: memberSinceStr,
        });
      });

      // Add Welcome notification to member's notifications subcollection
      try {
        await addDoc(collection(db, 'members', targetMember.uid, 'notifications'), {
          title: 'Membership Registration Approved!',
          body: `Welcome to Pakistan Labour Community! Your membership ID is ${generatedMemberId}. Your official digital card is now ready.`,
          createdAt: nowIso,
          read: false,
          type: 'approval',
        });
      } catch (notifErr) {
        console.warn('Could not add subcollection notification:', notifErr);
      }

      showToast(`Member ${targetMember.fullName} approved with ID ${generatedMemberId}!`);
      setActionType(null);
      setTargetMember(null);
    } catch (err) {
      console.error('Member approval failed; no approval was granted:', err);
      showToast(`Could not approve ${targetMember.fullName}. Check Firestore access and try again.`, 'error');
      setActionType(null);
      setTargetMember(null);
    } finally {
      setActionProcessing(false);
    }
  };

  // Execute rejection
  const handleReject = async () => {
    if (!targetMember) return;
    setActionProcessing(true);

    try {
      const nowIso = new Date().toISOString();
      const memberRef = doc(db, 'members', targetMember.uid);

      await updateDoc(memberRef, {
        status: 'rejected',
        adminNote: adminNoteInput.trim() || 'Application was not approved.',
      });

      // Add notification
      try {
        await addDoc(collection(db, 'members', targetMember.uid, 'notifications'), {
          title: 'Registration Application Update',
          body: `Your registration review was declined: ${adminNoteInput.trim() || 'Identity could not be confirmed.'}`,
          createdAt: nowIso,
          read: false,
          type: 'alert',
        });
      } catch (e) {
        console.warn(e);
      }

      showToast(`Registration for ${targetMember.fullName} was declined.`);
      setActionType(null);
      setTargetMember(null);
    } catch (err) {
      console.error('Registration rejection failed; no status was changed:', err);
      showToast(`Could not decline ${targetMember.fullName}. Check Firestore access and try again.`, 'error');
      setActionType(null);
      setTargetMember(null);
    } finally {
      setActionProcessing(false);
    }
  };

  // Execute Request Information
  const handleRequestInfo = async () => {
    if (!targetMember || !adminNoteInput.trim()) return;
    setActionProcessing(true);

    try {
      const nowIso = new Date().toISOString();
      const memberRef = doc(db, 'members', targetMember.uid);

      await updateDoc(memberRef, {
        status: 'info_requested',
        adminNote: adminNoteInput.trim(),
      });

      // Add notification to member's notifications subcollection
      try {
        await addDoc(collection(db, 'members', targetMember.uid, 'notifications'), {
          title: 'Additional Information Requested',
          body: `Administrator note: ${adminNoteInput.trim()}`,
          createdAt: nowIso,
          read: false,
          type: 'info_request',
        });
      } catch (e) {
        console.warn(e);
      }

      showToast(`Information clarification requested from ${targetMember.fullName}.`);
      setActionType(null);
      setTargetMember(null);
    } catch (err) {
      console.error('Information request failed; no status was changed:', err);
      showToast(`Could not request information from ${targetMember.fullName}. Check Firestore access and try again.`, 'error');
      setActionType(null);
      setTargetMember(null);
    } finally {
      setActionProcessing(false);
    }
  };

  // Filter list
  const filteredMembers = members.filter((m) => {
    // Status filter
    if (statusFilter === 'pending') {
      if (m.status !== 'pending' && m.status !== 'info_requested') return false;
    } else if (statusFilter !== 'all') {
      if (m.status !== statusFilter) return false;
    }

    // Search query
    if (searchTerm.trim()) {
      const q = searchTerm.toLowerCase();
      const name = (m.fullName || '').toLowerCase();
      const id = (m.idNumber || '').toLowerCase();
      const memberId = (m.memberId || '').toLowerCase();
      const loc = (m.currentLocation || '').toLowerCase();
      const email = (m.email || '').toLowerCase();
      return name.includes(q) || id.includes(q) || memberId.includes(q) || loc.includes(q) || email.includes(q);
    }

    return true;
  });

  const counts = {
    pending: members.filter((m) => m.status === 'pending' || m.status === 'info_requested').length,
    approved: members.filter((m) => m.status === 'approved').length,
    rejected: members.filter((m) => m.status === 'rejected').length,
    all: members.length,
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] pb-20">
      
      {/* Admin Header */}
      <div className="bg-[#071F25] text-white border-b border-amber-500/20 pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 mb-1">
              <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-bold bg-amber-400 text-[#071F25]">
                <ShieldCheck className="w-3.5 h-3.5" />
                Administrator Panel
              </span>
              <FlagPair size="sm" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
              Member Registry & Verification Desk
            </h1>
            <p className="text-xs text-stone-300 mt-1">
              Review registrations, verify CNIC/Passport credentials, and approve digital membership cards.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="text-xs text-stone-300 hidden sm:inline">
              Admin: <strong className="text-amber-300">{currentAdmin?.fullName || user?.email}</strong>
            </span>
            <Link to="/admin/portal" className="inline-flex items-center gap-1.5 rounded-lg bg-amber-300 px-3 py-2 text-xs font-bold text-[#071F25] hover:bg-amber-200">
              <ExternalLink className="h-3.5 w-3.5" /> Portal controls
            </Link>
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div 
            className={`mb-6 p-4 rounded-xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-md animate-in slide-in-from-top-2 ${
              toastMessage.type === 'success' 
                ? 'bg-emerald-100 border border-emerald-300 text-emerald-900' 
                : 'bg-rose-100 border border-rose-300 text-rose-900'
            }`}
          >
            <span>{toastMessage.text}</span>
            <button onClick={() => setToastMessage(null)} className="text-xs font-bold">✕</button>
          </div>
        )}

        {/* Filter & Search Bar */}
        <div className="bg-white rounded-2xl p-4 sm:p-5 shadow-sm border border-stone-200 mb-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-1.5 w-full sm:w-auto overflow-x-auto pb-1 sm:pb-0">
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'pending'
                  ? 'bg-[#071F25] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>Pending & Review</span>
              <span className="px-1.5 py-0.2 rounded-full bg-amber-400 text-[#071F25] text-[10px] font-extrabold">
                {counts.pending}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'approved'
                  ? 'bg-[#0D5A31] text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>Approved</span>
              <span className="px-1.5 py-0.2 rounded-full bg-emerald-200 text-emerald-900 text-[10px] font-extrabold">
                {counts.approved}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'rejected'
                  ? 'bg-rose-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>Rejected</span>
              <span className="px-1.5 py-0.2 rounded-full bg-rose-200 text-rose-900 text-[10px] font-extrabold">
                {counts.rejected}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3 py-1.5 rounded-xl text-xs font-bold transition-colors whitespace-nowrap flex items-center gap-1.5 ${
                statusFilter === 'all'
                  ? 'bg-stone-800 text-white shadow-xs'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>All Records</span>
              <span className="text-[10px] font-bold text-stone-400">({counts.all})</span>
            </button>
          </div>

          {/* Search Input */}
          <div className="relative w-full sm:w-72">
            <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Search by name, ID, CNIC..."
              className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#071F25]"
            />
          </div>

        </div>

        {/* Member Table */}
        <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden">
          {loading ? (
            <div className="p-12 text-center text-xs text-stone-500 flex flex-col items-center">
              <RefreshCw className="w-6 h-6 animate-spin text-[#0D5A31] mb-2" />
              <span>Loading registered member files...</span>
            </div>
          ) : loadError ? (
            <div className="p-12 text-center text-rose-700">
              <AlertCircle className="w-12 h-12 text-rose-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-rose-900">Member registry could not be loaded</p>
              <p className="text-xs text-rose-700 mt-2 max-w-xl mx-auto">{loadError}</p>
            </div>
          ) : filteredMembers.length === 0 ? (
            <div className="p-12 text-center text-stone-500">
              <ShieldCheck className="w-12 h-12 text-stone-300 mx-auto mb-3" />
              <p className="text-sm font-bold text-[#071F25]">No member registrations found</p>
              <p className="text-xs text-stone-400 mt-1">
                {statusFilter === 'pending'
                  ? 'Great job! There are no pending applications waiting for review.'
                  : 'Try adjusting your search query or filter.'}
              </p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-3.5 px-4">Applicant / Member</th>
                    <th className="py-3.5 px-4">Country & Location</th>
                    <th className="py-3.5 px-4">CNIC / Passport</th>
                    <th className="py-3.5 px-4">Submitted</th>
                    <th className="py-3.5 px-4">Status</th>
                    <th className="py-3.5 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredMembers.map((m) => {
                    return (
                      <tr key={m.uid} className="hover:bg-amber-50/30 transition-colors">
                        
                        {/* Member Name + Photo */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-3">
                            {m.photoURL ? (
                              <img
                                src={m.photoURL}
                                alt={m.fullName}
                                className="w-9 h-11 object-cover rounded-md border border-stone-200 shrink-0"
                              />
                            ) : (
                              <div className="w-9 h-11 bg-stone-100 border border-stone-200 rounded-md flex items-center justify-center font-bold text-stone-400 text-sm shrink-0">
                                {m.fullName ? m.fullName.charAt(0) : '?'}
                              </div>
                            )}
                            <div>
                              <div className="font-bold text-[#071F25] text-xs">
                                {m.fullName}
                              </div>
                              <div className="text-[11px] text-stone-500">
                                {m.email}
                              </div>
                              {m.memberId && (
                                <span className="font-mono text-[10px] text-emerald-800 font-bold">
                                  {m.memberId}
                                </span>
                              )}
                            </div>
                          </div>
                        </td>

                        {/* Country & Location */}
                        <td className="py-3.5 px-4">
                          <div className="flex items-center gap-1.5">
                            {m.country === 'Pakistan' ? (
                              <PakistanFlag className="w-4 h-3" />
                            ) : (
                              <OmanFlag className="w-4 h-3" />
                            )}
                            <span className="font-semibold text-stone-800">{m.country}</span>
                          </div>
                          <span className="text-stone-500 text-[11px] block truncate max-w-[140px]">
                            {m.currentLocation || 'Unspecified'}
                          </span>
                        </td>

                        {/* ID Number */}
                        <td className="py-3.5 px-4">
                          <span className="font-mono text-stone-800 font-medium">
                            {m.idNumber || 'N/A'}
                          </span>
                          <span className="text-stone-500 text-[10px] block">
                            {m.mobile}
                          </span>
                        </td>

                        {/* Registered Date */}
                        <td className="py-3.5 px-4 text-stone-600">
                          {m.registeredAt ? new Date(m.registeredAt).toLocaleDateString() : 'Recent'}
                        </td>

                        {/* Status Badge */}
                        <td className="py-3.5 px-4">
                          {m.status === 'approved' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-200">
                              <CheckCircle className="w-3 h-3 text-emerald-600" />
                              Approved
                            </span>
                          )}
                          {m.status === 'pending' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-amber-100 text-amber-800 border border-amber-300">
                              <Clock className="w-3 h-3 text-amber-600" />
                              Pending Review
                            </span>
                          )}
                          {m.status === 'info_requested' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              <Clock className="w-3 h-3 text-blue-600" />
                              Info Requested
                            </span>
                          )}
                          {m.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Rejected
                            </span>
                          )}
                        </td>

                        {/* Action Buttons */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* Inspect File Button */}
                            <button
                              onClick={() => setSelectedMember(m)}
                              className="p-1.5 text-stone-600 hover:text-[#071F25] hover:bg-stone-100 rounded-lg transition-colors"
                              title="Inspect Full File"
                              aria-label={`View details of ${m.fullName}`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                            {/* If pending or info requested, show Approve, Reject, Request Info */}
                            {m.status !== 'approved' && (
                              <button
                                onClick={() => openActionModal(m, 'approve')}
                                className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#0D5A31] hover:bg-[#083e21] text-white text-[11px] font-bold rounded-lg shadow-xs transition-colors"
                              >
                                <Check className="w-3 h-3" />
                                <span>Approve</span>
                              </button>
                            )}

                            {m.status !== 'approved' && m.status !== 'rejected' && (
                              <>
                                <button
                                  onClick={() => openActionModal(m, 'info_requested')}
                                  className="inline-flex items-center gap-1 px-2 py-1 bg-amber-50 hover:bg-amber-100 text-amber-900 border border-amber-300 text-[11px] font-semibold rounded-lg transition-colors"
                                  title="Request Information"
                                >
                                  <span>Request Info</span>
                                </button>

                                <button
                                  onClick={() => openActionModal(m, 'reject')}
                                  className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-lg transition-colors"
                                  title="Reject Registration"
                                  aria-label={`Reject registration of ${m.fullName}`}
                                >
                                  <XCircle className="w-4 h-4" />
                                </button>
                              </>
                            )}

                            {m.status === 'approved' && (
                              <span className="text-[11px] text-stone-400 font-medium">
                                Card Active
                              </span>
                            )}

                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>

      </div>

      {/* Confirmation & Note Modal Dialog */}
      {actionType && targetMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                {actionType === 'approve' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                {actionType === 'reject' && <XCircle className="w-5 h-5 text-rose-600" />}
                {actionType === 'info_requested' && <HelpCircle className="w-5 h-5 text-amber-600" />}
                <h3 className="font-bold text-[#071F25] text-base font-heading">
                  {actionType === 'approve' && 'Confirm Member Approval'}
                  {actionType === 'reject' && 'Decline Registration'}
                  {actionType === 'info_requested' && 'Request Additional Information'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setActionType(null);
                  setTargetMember(null);
                }}
                className="text-stone-400 hover:text-stone-700"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-stone-600 space-y-2">
              <p>
                Target Applicant: <strong className="text-stone-900">{targetMember.fullName}</strong>
              </p>
              <p>
                CNIC/Passport: <strong className="font-mono text-stone-800">{targetMember.idNumber}</strong>
              </p>
              
              {actionType === 'approve' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 leading-relaxed">
                  Approving will automatically generate the next sequential official Member ID (e.g. <code>PLC-2026-XXXXX</code>) and unlock the member's dashboard and digital card immediately.
                </div>
              )}

              {actionType === 'reject' && (
                <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-900 leading-relaxed">
                  The applicant will see a clear decline notice with the reason specified below.
                </div>
              )}

              {actionType === 'info_requested' && (
                <div className="p-3 bg-amber-50 border border-amber-200 rounded-xl text-amber-900 leading-relaxed">
                  The applicant's status will reflect "Information Requested", displaying your specific note so they can respond.
                </div>
              )}
            </div>

            <div>
              <label htmlFor="adminNoteInput" className="block text-xs font-bold text-stone-700 mb-1">
                {actionType === 'approve' ? 'Approval Note (Optional)' : 'Message / Reason for Applicant'}
              </label>
              <textarea
                id="adminNoteInput"
                rows={3}
                value={adminNoteInput}
                onChange={(e) => setAdminNoteInput(e.target.value)}
                placeholder="Enter details visible to the applicant..."
                className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#071F25]"
              />
            </div>

            <div className="flex items-center gap-2 pt-2 border-t border-stone-100">
              <button
                type="button"
                onClick={() => {
                  setActionType(null);
                  setTargetMember(null);
                }}
                className="flex-1 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Cancel
              </button>

              {actionType === 'approve' && (
                <button
                  type="button"
                  onClick={handleApprove}
                  disabled={actionProcessing}
                  className="flex-1 py-2 text-xs font-bold bg-[#0D5A31] text-white hover:bg-[#083f22] rounded-xl shadow-xs disabled:opacity-50"
                >
                  {actionProcessing ? 'Generating ID...' : 'Confirm & Approve'}
                </button>
              )}

              {actionType === 'reject' && (
                <button
                  type="button"
                  onClick={handleReject}
                  disabled={actionProcessing}
                  className="flex-1 py-2 text-xs font-bold bg-rose-700 text-white hover:bg-rose-800 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {actionProcessing ? 'Processing...' : 'Confirm Decline'}
                </button>
              )}

              {actionType === 'info_requested' && (
                <button
                  type="button"
                  onClick={handleRequestInfo}
                  disabled={actionProcessing || !adminNoteInput.trim()}
                  className="flex-1 py-2 text-xs font-bold bg-amber-600 text-white hover:bg-amber-700 rounded-xl shadow-xs disabled:opacity-50"
                >
                  {actionProcessing ? 'Sending...' : 'Send Request Note'}
                </button>
              )}
            </div>

          </div>
        </div>
      )}

      {/* Inspect Member File Modal */}
      {selectedMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150 max-h-[90vh] overflow-y-auto">
            
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-[#0D5A31]" />
                <h3 className="font-bold text-[#071F25] text-base font-heading">
                  Applicant Dossier & Verification File
                </h3>
              </div>
              <button
                onClick={() => setSelectedMember(null)}
                className="text-stone-400 hover:text-stone-700 font-bold"
              >
                ✕
              </button>
            </div>

            <div className="flex items-center gap-4 p-4 rounded-2xl bg-stone-50 border border-stone-200">
              {selectedMember.photoURL ? (
                <img
                  src={selectedMember.photoURL}
                  alt={selectedMember.fullName}
                  className="w-20 h-24 object-cover rounded-xl border-2 border-amber-400 shadow-sm"
                />
              ) : (
                <div className="w-20 h-24 bg-stone-200 rounded-xl flex items-center justify-center font-bold text-stone-500">
                  No Photo
                </div>
              )}
              <div>
                <h4 className="font-bold text-base text-[#071F25]">{selectedMember.fullName}</h4>
                <p className="text-xs text-stone-500">{selectedMember.email}</p>
                <div className="mt-2 flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-emerald-800 bg-emerald-50 px-2 py-0.5 rounded border border-emerald-200">
                    {selectedMember.memberId || 'ID PENDING APPROVAL'}
                  </span>
                </div>
              </div>
            </div>

            <div className="space-y-2 text-xs">
              <div className="grid grid-cols-2 gap-2">
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100">
                  <span className="text-[10px] text-stone-400 block uppercase">Mobile Phone</span>
                  <span className="font-mono font-semibold">{selectedMember.mobile}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100">
                  <span className="text-[10px] text-stone-400 block uppercase">Country & Wilayat</span>
                  <span className="font-semibold">{selectedMember.country} ({selectedMember.currentLocation})</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100">
                  <span className="text-[10px] text-stone-400 block uppercase">National CNIC / Passport</span>
                  <span className="font-mono font-semibold text-emerald-900">{selectedMember.idNumber}</span>
                </div>
                <div className="p-2.5 rounded-lg bg-stone-50 border border-stone-100">
                  <span className="text-[10px] text-stone-400 block uppercase">Registered On</span>
                  <span>{selectedMember.registeredAt ? new Date(selectedMember.registeredAt).toLocaleString() : 'N/A'}</span>
                </div>
              </div>

              {/* Emergency Contact */}
              <div className="p-3 rounded-xl bg-amber-50/60 border border-amber-200">
                <span className="text-[10px] font-bold uppercase text-amber-900 block">Emergency Contact</span>
                <p className="font-semibold text-stone-900 mt-0.5">
                  {selectedMember.emergencyContact?.name} ({selectedMember.emergencyContact?.relation || 'Family'})
                </p>
                <p className="font-mono text-stone-700">{selectedMember.emergencyContact?.phone}</p>
              </div>

              {/* Admin Note if any */}
              {selectedMember.adminNote && (
                <div className="p-3 rounded-xl bg-stone-100 border border-stone-200">
                  <span className="text-[10px] font-bold uppercase text-stone-500 block">Current Admin Note</span>
                  <p className="text-stone-800 mt-0.5">{selectedMember.adminNote}</p>
                </div>
              )}
            </div>

            <div className="flex items-center justify-end gap-2 pt-3 border-t border-stone-100">
              <button
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Close
              </button>
              {selectedMember.status !== 'approved' && (
                <button
                  onClick={() => {
                    const m = selectedMember;
                    setSelectedMember(null);
                    openActionModal(m, 'approve');
                  }}
                  className="px-4 py-2 text-xs font-bold bg-[#0D5A31] text-white rounded-xl hover:bg-[#094023]"
                >
                  Approve Application
                </button>
              )}
            </div>

          </div>
        </div>
      )}

    </div>
  );
};
