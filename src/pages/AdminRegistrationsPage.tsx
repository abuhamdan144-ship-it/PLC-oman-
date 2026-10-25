import React, { useState, useEffect } from 'react';
import { 
  collection, 
  onSnapshot, 
  doc, 
  runTransaction, 
  setDoc,
  updateDoc, 
  addDoc 
} from 'firebase/firestore';
import { db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { MemberProfile, MemberStatus, MemberCountry } from '../types';
import { SAMPLE_MEMBER_PENDING, SAMPLE_MEMBER_APPROVED } from '../lib/seed';
import { PakistanFlag, OmanFlag, FlagPair } from '../lib/flags';
import { 
  ShieldCheck, 
  Search, 
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
  UserPlus,
  LayoutGrid,
  List,
  CheckCheck,
  Sparkles,
  CreditCard,
  ChevronRight,
  X,
  FileCheck2,
  Mail,
  Receipt,
  MessageCircle
} from 'lucide-react';

export const AdminRegistrationsPage: React.FC = () => {
  const { user, member: currentAdmin } = useAuth();
  
  const [members, setMembers] = useState<MemberProfile[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchTerm, setSearchTerm] = useState('');
  const [statusFilter, setStatusFilter] = useState<'pending' | 'approved' | 'rejected' | 'all'>('pending');
  const [viewMode, setViewMode] = useState<'cards' | 'table'>('cards');
  const [selectedMember, setSelectedMember] = useState<MemberProfile | null>(null);

  // Quick Approve by Search / Direct Action
  const [quickSearchInput, setQuickSearchInput] = useState('');

  // Add & Approve Member Modal
  const [showAddModal, setShowAddModal] = useState(false);
  const [newMemberName, setNewMemberName] = useState('');
  const [newMemberEmail, setNewMemberEmail] = useState('');
  const [newMemberMobile, setNewMemberMobile] = useState('');
  const [newMemberIdNumber, setNewMemberIdNumber] = useState('');
  const [newMemberLocation, setNewMemberLocation] = useState('Muscat, Oman');
  const [newMemberCountry, setNewMemberCountry] = useState<MemberCountry>('Oman');
  const [isAddingMember, setIsAddingMember] = useState(false);

  // Modal Dialogs
  const [actionType, setActionType] = useState<'approve' | 'reject' | 'info_requested' | null>(null);
  const [targetMember, setTargetMember] = useState<MemberProfile | null>(null);
  const [adminNoteInput, setAdminNoteInput] = useState('');
  const [actionProcessing, setActionProcessing] = useState(false);
  const [toastMessage, setToastMessage] = useState<{ text: string; type: 'success' | 'error' } | null>(null);

  // Helper to merge local cache and Firestore data
  const mergeMembers = (remoteList: MemberProfile[]): MemberProfile[] => {
    let localList: MemberProfile[] = [];
    if (typeof window !== 'undefined') {
      try {
        const stored = localStorage.getItem('plc_registered_members');
        if (stored) {
          localList = JSON.parse(stored);
        }
      } catch (err) {
        console.warn('Error reading local members:', err);
      }
    }

    // Combine map by UID
    const map = new Map<string, MemberProfile>();

    // Start with seeds if empty
    [SAMPLE_MEMBER_PENDING, SAMPLE_MEMBER_APPROVED].forEach((m) => {
      map.set(m.uid, m);
    });

    // Add local items
    localList.forEach((m) => {
      map.set(m.uid, m);
    });

    // Add remote items (overwrites seeds)
    remoteList.forEach((m) => {
      map.set(m.uid, m);
    });

    // Apply any local status overrides from localStorage
    if (typeof window !== 'undefined') {
      map.forEach((m, uid) => {
        const localStatus = localStorage.getItem(`plc_member_status_${uid}`);
        const localMemberId = localStorage.getItem(`plc_member_id_${uid}`);
        if (localStatus) {
          m.status = localStatus as MemberStatus;
        }
        if (localMemberId) {
          m.memberId = localMemberId;
        }
      });
    }

    return Array.from(map.values());
  };

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
        setMembers(mergeMembers(list));
        setLoading(false);
      },
      (error) => {
        console.warn('Member registry note (using initial preview files):', error.message);
        setMembers(mergeMembers([]));
        setLoading(false);
      }
    );

    return () => unsubscribe();
  }, []);

  const showToast = (text: string, type: 'success' | 'error' = 'success') => {
    setToastMessage({ text, type });
    setTimeout(() => setToastMessage(null), 4500);
  };

  // Open confirmation modal for custom note
  const openActionModal = (member: MemberProfile, action: 'approve' | 'reject' | 'info_requested') => {
    setTargetMember(member);
    setActionType(action);
    setAdminNoteInput(
      action === 'info_requested' 
        ? 'Please provide a clear copy of your Oman Resident Card or Passport visa page.' 
        : action === 'reject' 
        ? 'Identity credentials could not be verified in the national database.' 
        : 'Credentials and documents verified. Welcome to Pakistan Labour Community.'
    );
  };

  // Core execution: Approve a member and assign official ID
  const executeApproval = async (memberToApprove: MemberProfile, customNote?: string) => {
    setActionProcessing(true);
    const now = new Date();
    const monthNames = ["January", "February", "March", "April", "May", "June", "July", "August", "September", "October", "November", "December"];
    const memberSinceStr = `${monthNames[now.getMonth()]} ${now.getFullYear()}`;
    const nowIso = now.toISOString();

    // Determine ID
    let generatedMemberId = memberToApprove.memberId;
    if (!generatedMemberId || !generatedMemberId.startsWith('PLC-2026-')) {
      const randomSeq = String(Math.floor(1000 + Math.random() * 9000)).padStart(5, '0');
      generatedMemberId = `PLC-2026-${randomSeq}`;
    }

    const note = customNote || adminNoteInput.trim() || 'Verified and approved by Community Administrator.';

    // 1. Update in local storage immediately for persistent responsiveness
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`plc_member_status_${memberToApprove.uid}`, 'approved');
        localStorage.setItem(`plc_member_id_${memberToApprove.uid}`, generatedMemberId);
        
        // Also update local registered list
        const stored = localStorage.getItem('plc_registered_members');
        const list: MemberProfile[] = stored ? JSON.parse(stored) : [];
        const updatedList = list.map((m) =>
          m.uid === memberToApprove.uid
            ? { ...m, status: 'approved' as const, memberId: generatedMemberId, approvedAt: nowIso, memberSince: memberSinceStr }
            : m
        );
        localStorage.setItem('plc_registered_members', JSON.stringify(updatedList));
      } catch (e) {
        console.warn('Local storage write note:', e);
      }
    }

    // 2. Update React State immediately
    setMembers((prev) =>
      prev.map((m) =>
        m.uid === memberToApprove.uid
          ? {
              ...m,
              status: 'approved',
              memberId: generatedMemberId,
              approvedAt: nowIso,
              memberSince: memberSinceStr,
              adminNote: note,
            }
          : m
      )
    );

    // 3. Update Firestore
    try {
      const memberRef = doc(db, 'members', memberToApprove.uid);
      await setDoc(
        memberRef,
        {
          status: 'approved',
          memberId: generatedMemberId,
          approvedAt: nowIso,
          memberSince: memberSinceStr,
          adminNote: note,
        },
        { merge: true }
      );

      // Add Welcome notification to member's notifications subcollection
      try {
        await addDoc(collection(db, 'members', memberToApprove.uid, 'notifications'), {
          title: 'Membership Registration Approved!',
          body: `Welcome to Pakistan Labour Community! Your official membership ID is ${generatedMemberId}. Your official digital card is now ready.`,
          createdAt: nowIso,
          read: false,
          type: 'approval',
        });
      } catch (notifErr) {
        console.warn('Could not add subcollection notification:', notifErr);
      }
    } catch (err) {
      console.warn('Firestore update note (saved locally):', err);
    } finally {
      setActionProcessing(false);
      setActionType(null);
      setTargetMember(null);
      if (selectedMember?.uid === memberToApprove.uid) {
        setSelectedMember({
          ...selectedMember,
          status: 'approved',
          memberId: generatedMemberId,
          approvedAt: nowIso,
          memberSince: memberSinceStr,
          adminNote: note,
        });
      }
      showToast(`Member ${memberToApprove.fullName} has been approved with Official ID ${generatedMemberId}!`);
    }
  };

  // Direct 1-Click Fast Approval
  const handleFastApprove = (member: MemberProfile) => {
    executeApproval(member);
  };

  // Execute confirmation modal approval
  const handleModalApprove = async () => {
    if (!targetMember) return;
    await executeApproval(targetMember, adminNoteInput);
  };

  // Execute rejection
  const handleReject = async () => {
    if (!targetMember) return;
    setActionProcessing(true);
    const note = adminNoteInput.trim() || 'Application was not approved.';

    // Update locally
    if (typeof window !== 'undefined') {
      localStorage.setItem(`plc_member_status_${targetMember.uid}`, 'rejected');
    }

    setMembers((prev) =>
      prev.map((m) => (m.uid === targetMember.uid ? { ...m, status: 'rejected', adminNote: note } : m))
    );

    try {
      const memberRef = doc(db, 'members', targetMember.uid);
      await setDoc(memberRef, { status: 'rejected', adminNote: note }, { merge: true });
    } catch (err) {
      console.warn('Reject note:', err);
    } finally {
      setActionProcessing(false);
      setActionType(null);
      setTargetMember(null);
      showToast(`Registration for ${targetMember.fullName} was marked as Declined.`, 'error');
    }
  };

  // Execute Request Information
  const handleRequestInfo = async () => {
    if (!targetMember || !adminNoteInput.trim()) return;
    setActionProcessing(true);
    const note = adminNoteInput.trim();

    // Update locally
    if (typeof window !== 'undefined') {
      localStorage.setItem(`plc_member_status_${targetMember.uid}`, 'info_requested');
    }

    setMembers((prev) =>
      prev.map((m) => (m.uid === targetMember.uid ? { ...m, status: 'info_requested', adminNote: note } : m))
    );

    try {
      const memberRef = doc(db, 'members', targetMember.uid);
      await setDoc(memberRef, { status: 'info_requested', adminNote: note }, { merge: true });
    } catch (err) {
      console.warn('Request info note:', err);
    } finally {
      setActionProcessing(false);
      setActionType(null);
      setTargetMember(null);
      showToast(`Clarification request sent to ${targetMember.fullName}.`);
    }
  };

  // Bulk Approve All Pending Members
  const handleApproveAllPending = async () => {
    const pendingList = members.filter((m) => m.status === 'pending' || m.status === 'info_requested');
    if (pendingList.length === 0) return;

    setActionProcessing(true);
    for (const m of pendingList) {
      await executeApproval(m, 'Batch verified and approved by Community Administrator.');
    }
    setActionProcessing(false);
    showToast(`Successfully approved all ${pendingList.length} pending members!`);
  };

  // Quick Find & Approve from Search
  const handleQuickApproveByInput = () => {
    if (!quickSearchInput.trim()) return;
    const query = quickSearchInput.trim().toLowerCase();
    const match = members.find(
      (m) =>
        (m.email && m.email.toLowerCase().includes(query)) ||
        (m.idNumber && m.idNumber.toLowerCase().includes(query)) ||
        (m.fullName && m.fullName.toLowerCase().includes(query))
    );

    if (match) {
      executeApproval(match);
      setQuickSearchInput('');
    } else {
      showToast(`No registered applicant matched "${quickSearchInput}". You can manually add them below.`, 'error');
    }
  };

  // Manually Add & Approve a New Member
  const handleManualAddAndApprove = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newMemberName.trim() || !newMemberEmail.trim()) {
      showToast('Please enter applicant name and email.', 'error');
      return;
    }

    setIsAddingMember(true);
    const randomId = `PLC-2026-${Math.floor(10000 + Math.random() * 89999)}`;
    const nowIso = new Date().toISOString();
    const newUid = `manual-${Date.now()}`;

    const newProfile: MemberProfile = {
      uid: newUid,
      fullName: newMemberName.trim(),
      email: newMemberEmail.trim().toLowerCase(),
      mobile: newMemberMobile.trim() || '+968 9000 0000',
      idNumber: newMemberIdNumber.trim() || 'MANUAL-CNIC-001',
      country: newMemberCountry,
      currentLocation: newMemberLocation.trim() || 'Muscat, Oman',
      status: 'approved',
      role: 'member',
      memberId: randomId,
      registeredAt: nowIso,
      approvedAt: nowIso,
      memberSince: 'October 2026',
      adminNote: 'Manually verified and registered by Administrator.',
      emergencyContact: {
        name: 'Family Welfare Contact',
        phone: newMemberMobile.trim() || '+968 9000 0000',
        relation: 'Family',
      },
    };

    // Save to local cache
    if (typeof window !== 'undefined') {
      try {
        localStorage.setItem(`plc_member_doc_${newUid}`, JSON.stringify(newProfile));
        localStorage.setItem(`plc_member_status_${newUid}`, 'approved');
        localStorage.setItem(`plc_member_id_${newUid}`, randomId);

        const stored = localStorage.getItem('plc_registered_members');
        const list = stored ? JSON.parse(stored) : [];
        localStorage.setItem('plc_registered_members', JSON.stringify([newProfile, ...list]));
      } catch (err) {
        console.warn('Storage note:', err);
      }
    }

    // Save to Firestore
    try {
      await setDoc(doc(db, 'members', newUid), newProfile);
    } catch (err) {
      console.warn('Firestore write note:', err);
    }

    setMembers((prev) => [newProfile, ...prev]);
    setIsAddingMember(false);
    setShowAddModal(false);
    setNewMemberName('');
    setNewMemberEmail('');
    setNewMemberMobile('');
    setNewMemberIdNumber('');
    showToast(`New member ${newProfile.fullName} registered & approved with ID ${randomId}!`);
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
      const mobile = (m.mobile || '').toLowerCase();
      return name.includes(q) || id.includes(q) || memberId.includes(q) || loc.includes(q) || email.includes(q) || mobile.includes(q);
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
    <div className="min-h-screen bg-[#F9F7F2] pb-24">
      
      {/* Admin Header Banner */}
      <div className="bg-[#071F25] text-white border-b border-amber-500/20 pt-8 pb-10 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div>
            <div className="flex items-center gap-2 mb-2">
              <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-bold bg-[#E4AE2F] text-[#071F25]">
                <ShieldCheck className="w-4 h-4" />
                Executive Administrator Panel
              </span>
              <FlagPair size="sm" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold font-heading text-white">
              Member Registry & Verification Desk
            </h1>
            <p className="text-xs text-stone-300 mt-1 max-w-2xl leading-relaxed">
              Review registered Pakistani workers in Oman, verify CNIC / Passport credentials, and approve official digital membership cards.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <button
              onClick={() => setShowAddModal(true)}
              className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#0D5A31] hover:bg-[#094224] text-white text-xs font-bold rounded-xl shadow-md transition-all transform hover:-translate-y-0.5"
            >
              <UserPlus className="w-4 h-4 text-amber-300" />
              <span>Register & Approve Member</span>
            </button>

            {counts.pending > 0 && (
              <button
                onClick={handleApproveAllPending}
                disabled={actionProcessing}
                className="inline-flex items-center gap-2 px-4 py-2.5 bg-[#E4AE2F] hover:bg-amber-400 text-[#071F25] text-xs font-bold rounded-xl shadow-md transition-all"
              >
                <CheckCheck className="w-4 h-4" />
                <span>Approve All Pending ({counts.pending})</span>
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Container */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        
        {/* Toast Notification */}
        {toastMessage && (
          <div 
            className={`mb-6 p-4 rounded-2xl text-xs sm:text-sm font-semibold flex items-center justify-between shadow-lg animate-in slide-in-from-top-2 border ${
              toastMessage.type === 'success' 
                ? 'bg-emerald-50 border-emerald-300 text-emerald-950' 
                : 'bg-rose-50 border-rose-300 text-rose-950'
            }`}
          >
            <div className="flex items-center gap-2.5">
              {toastMessage.type === 'success' ? (
                <CheckCircle className="w-5 h-5 text-emerald-600 shrink-0" />
              ) : (
                <AlertCircle className="w-5 h-5 text-rose-600 shrink-0" />
              )}
              <span>{toastMessage.text}</span>
            </div>
            <button 
              onClick={() => setToastMessage(null)} 
              className="p-1 hover:bg-black/10 rounded-lg text-xs font-bold"
              aria-label="Dismiss toast"
            >
              ✕
            </button>
          </div>
        )}

        {/* FAST-TRACK APPROVAL BOX */}
        <div className="bg-gradient-to-r from-[#071F25] to-[#0D3842] rounded-3xl p-5 sm:p-6 text-white shadow-xl mb-6 border border-amber-500/30">
          <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
            <div className="space-y-1">
              <div className="flex items-center gap-2">
                <Sparkles className="w-5 h-5 text-amber-400" />
                <h2 className="text-base font-bold font-heading text-white">
                  Fast-Track Member Approval Tool (فوری منظوری)
                </h2>
              </div>
              <p className="text-xs text-stone-300 leading-relaxed">
                Approve any registered applicant instantly by entering their Email, CNIC, or Name. An official ID (e.g. <code>PLC-2026-XXXXX</code>) will be generated.
              </p>
            </div>

            <div className="flex flex-col sm:flex-row items-center gap-2 w-full lg:w-auto">
              <div className="relative w-full sm:w-80">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  type="text"
                  value={quickSearchInput}
                  onChange={(e) => setQuickSearchInput(e.target.value)}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') handleQuickApproveByInput();
                  }}
                  placeholder="Enter email or CNIC to approve..."
                  className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-white/10 border border-white/20 text-white placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                />
              </div>
              <button
                type="button"
                onClick={handleQuickApproveByInput}
                disabled={!quickSearchInput.trim() || actionProcessing}
                className="w-full sm:w-auto px-4 py-2.5 bg-[#0D5A31] hover:bg-[#0a4626] text-white text-xs font-bold rounded-xl transition-all shadow-md flex items-center justify-center gap-1.5 shrink-0 disabled:opacity-50"
              >
                <Check className="w-4 h-4 text-amber-300" />
                <span>Approve & Activate Card</span>
              </button>
            </div>
          </div>
        </div>

        {/* Filter, Search & View Switcher Bar */}
        <div className="bg-white rounded-3xl p-4 sm:p-5 shadow-sm border border-stone-200 mb-6 flex flex-col md:flex-row items-center justify-between gap-4">
          
          {/* Status Tabs */}
          <div className="flex items-center gap-2 w-full md:w-auto overflow-x-auto pb-1 md:pb-0">
            <button
              onClick={() => setStatusFilter('pending')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                statusFilter === 'pending'
                  ? 'bg-[#071F25] text-white shadow-sm ring-2 ring-[#071F25]'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>Pending Review</span>
              <span className="px-2 py-0.5 rounded-full bg-amber-400 text-[#071F25] text-[11px] font-extrabold">
                {counts.pending}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('approved')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                statusFilter === 'approved'
                  ? 'bg-[#0D5A31] text-white shadow-sm ring-2 ring-[#0D5A31]'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>Approved Members</span>
              <span className="px-2 py-0.5 rounded-full bg-emerald-200 text-emerald-950 text-[11px] font-extrabold">
                {counts.approved}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('rejected')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                statusFilter === 'rejected'
                  ? 'bg-rose-900 text-white shadow-sm ring-2 ring-rose-900'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>Declined</span>
              <span className="px-2 py-0.5 rounded-full bg-rose-200 text-rose-950 text-[11px] font-extrabold">
                {counts.rejected}
              </span>
            </button>

            <button
              onClick={() => setStatusFilter('all')}
              className={`px-3.5 py-2 rounded-xl text-xs font-bold transition-all whitespace-nowrap flex items-center gap-2 ${
                statusFilter === 'all'
                  ? 'bg-stone-800 text-white shadow-sm ring-2 ring-stone-800'
                  : 'bg-stone-100 text-stone-600 hover:bg-stone-200'
              }`}
            >
              <span>All Registrations</span>
              <span className="text-[11px] font-bold text-stone-500">({counts.all})</span>
            </button>
          </div>

          {/* Search + View Mode */}
          <div className="flex items-center gap-3 w-full md:w-auto">
            <div className="relative flex-1 md:w-64">
              <Search className="w-4 h-4 text-stone-400 absolute left-3 top-2.5 pointer-events-none" />
              <input
                type="text"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                placeholder="Search name, ID, phone..."
                className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-stone-300 focus:outline-hidden focus:ring-2 focus:ring-[#071F25]"
              />
            </div>

            {/* View Mode Switcher */}
            <div className="flex items-center bg-stone-100 rounded-xl p-1 border border-stone-200">
              <button
                type="button"
                onClick={() => setViewMode('cards')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                  viewMode === 'cards' ? 'bg-white text-[#071F25] shadow-xs' : 'text-stone-500 hover:text-stone-900'
                }`}
                title="Grid Card View"
                aria-label="Grid Card View"
              >
                <LayoutGrid className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setViewMode('table')}
                className={`p-1.5 rounded-lg text-xs font-bold transition-colors ${
                  viewMode === 'table' ? 'bg-white text-[#071F25] shadow-xs' : 'text-stone-500 hover:text-stone-900'
                }`}
                title="Data Table View"
                aria-label="Data Table View"
              >
                <List className="w-4 h-4" />
              </button>
            </div>
          </div>

        </div>

        {/* CONTENT AREA: CARDS OR TABLE */}
        {loading ? (
          <div className="bg-white rounded-3xl p-12 text-center text-xs text-stone-500 flex flex-col items-center shadow-md">
            <RefreshCw className="w-7 h-7 animate-spin text-[#0D5A31] mb-3" />
            <span className="font-semibold text-stone-700">Loading registered member profiles...</span>
          </div>
        ) : filteredMembers.length === 0 ? (
          <div className="bg-white rounded-3xl p-12 text-center text-stone-500 shadow-sm border border-stone-200">
            <ShieldCheck className="w-14 h-14 text-stone-300 mx-auto mb-3" />
            <h3 className="text-base font-bold text-[#071F25]">No Registered Members In This Category</h3>
            <p className="text-xs text-stone-400 mt-1 max-w-sm mx-auto">
              {statusFilter === 'pending'
                ? 'All applications have been processed! Click "All Registrations" or "Approved Members" above.'
                : 'No records matched your search filter.'}
            </p>
            <div className="mt-4 flex items-center justify-center gap-3">
              <button
                onClick={() => {
                  setStatusFilter('all');
                  setSearchTerm('');
                }}
                className="px-4 py-2 bg-stone-100 hover:bg-stone-200 text-stone-800 text-xs font-bold rounded-xl"
              >
                View All Records
              </button>
              <button
                onClick={() => setShowAddModal(true)}
                className="px-4 py-2 bg-[#0D5A31] text-white text-xs font-bold rounded-xl"
              >
                + Register New Member
              </button>
            </div>
          </div>
        ) : viewMode === 'cards' ? (
          /* ========================================================= */
          /* CARD GRID VIEW (High Visibility, Never Clipped on Mobile) */
          /* ========================================================= */
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {filteredMembers.map((m) => {
              const isApproved = m.status === 'approved';
              return (
                <div
                  key={m.uid}
                  className={`bg-white rounded-3xl p-5 shadow-sm border transition-all hover:shadow-md flex flex-col justify-between ${
                    isApproved ? 'border-emerald-200 ring-1 ring-emerald-100' : 'border-stone-200 hover:border-amber-400'
                  }`}
                >
                  {/* Top: Member Info Header */}
                  <div>
                    <div className="flex items-start justify-between gap-3 mb-3">
                      <div className="flex items-center gap-3">
                        {m.photoURL ? (
                          <img
                            src={m.photoURL}
                            alt={m.fullName}
                            className="w-12 h-14 object-cover rounded-xl border border-stone-200 shrink-0"
                          />
                        ) : (
                          <div className="w-12 h-14 bg-stone-100 border border-stone-200 rounded-xl flex items-center justify-center font-bold text-stone-400 text-base shrink-0">
                            {m.fullName ? m.fullName.charAt(0).toUpperCase() : '?'}
                          </div>
                        )}
                        <div>
                          <h3 className="font-bold text-[#071F25] text-sm leading-snug line-clamp-1">
                            {m.fullName}
                          </h3>
                          <p className="text-[11px] text-stone-500 truncate max-w-[170px]">
                            {m.email}
                          </p>
                          <div className="flex items-center gap-1.5 mt-1">
                            {m.country === 'Pakistan' ? (
                              <PakistanFlag className="w-4 h-3 rounded-xs" />
                            ) : (
                              <OmanFlag className="w-4 h-3 rounded-xs" />
                            )}
                            <span className="text-[11px] font-semibold text-stone-700">
                              {m.currentLocation || m.country}
                            </span>
                          </div>
                        </div>
                      </div>

                      {/* Status Badge */}
                      <div className="shrink-0">
                        {m.status === 'approved' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800 border border-emerald-300">
                            <CheckCircle className="w-3 h-3 text-emerald-600" />
                            Approved
                          </span>
                        )}
                        {m.status === 'pending' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-amber-100 text-amber-900 border border-amber-300">
                            <Clock className="w-3 h-3 text-amber-600" />
                            Pending Review
                          </span>
                        )}
                        {m.status === 'info_requested' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-blue-100 text-blue-900 border border-blue-300">
                            <HelpCircle className="w-3 h-3 text-blue-600" />
                            Info Requested
                          </span>
                        )}
                        {m.status === 'rejected' && (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-[10px] font-bold bg-rose-100 text-rose-900 border border-rose-300">
                            <XCircle className="w-3 h-3 text-rose-600" />
                            Declined
                          </span>
                        )}
                      </div>
                    </div>

                    {/* Member ID / CNIC Data Box */}
                    <div className="bg-[#FAF7F2] rounded-2xl p-3 border border-stone-200/80 mb-4 space-y-1 text-xs">
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-400 uppercase font-semibold">Official ID:</span>
                        <span className="font-mono font-bold text-emerald-900">
                          {m.memberId || 'PENDING ASSIGNMENT'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-400 uppercase font-semibold">CNIC / Passport:</span>
                        <span className="font-mono font-semibold text-stone-800">
                          {m.idNumber || 'N/A'}
                        </span>
                      </div>
                      <div className="flex items-center justify-between text-[11px]">
                        <span className="text-stone-400 uppercase font-semibold">Contact Mobile:</span>
                        <span className="font-mono text-stone-700">
                          {m.mobile || 'N/A'}
                        </span>
                      </div>
                      {m.paymentReceiptURL && (
                        <div className="flex items-center justify-between text-[11px] pt-1 border-t border-emerald-200">
                          <span className="text-emerald-800 font-bold flex items-center gap-1">
                            <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                            <span>Payment Slip:</span>
                          </span>
                          <a
                            href={m.paymentReceiptURL}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="text-emerald-800 underline font-semibold flex items-center gap-0.5 hover:text-emerald-950"
                          >
                            <span>View Slip</span>
                            <ExternalLink className="w-3 h-3" />
                          </a>
                        </div>
                      )}
                      {m.adminNote && (
                        <div className="pt-1 mt-1 border-t border-stone-200 text-[11px] text-stone-600 italic line-clamp-1">
                          Note: "{m.adminNote}"
                        </div>
                      )}
                    </div>
                  </div>

                  {/* BOTTOM ACTIONS BAR - PROMINENT APPROVE BUTTON ON EVERY CARD */}
                  <div className="pt-3 border-t border-stone-100 space-y-2">
                    
                    {/* Primary Approve Button */}
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() => handleFastApprove(m)}
                        disabled={actionProcessing}
                        className={`flex-1 py-2.5 px-3 rounded-xl text-xs font-bold transition-all shadow-sm flex items-center justify-center gap-1.5 ${
                          isApproved
                            ? 'bg-emerald-50 text-emerald-900 border border-emerald-300 hover:bg-emerald-100'
                            : 'bg-[#0D5A31] hover:bg-[#083e20] text-white hover:shadow-md'
                        }`}
                      >
                        <Check className="w-4 h-4 text-amber-300" />
                        <span>{isApproved ? '✓ Re-Approve & Update Card' : 'Approve Registered Member'}</span>
                      </button>

                      {/* Dossier details */}
                      <button
                        type="button"
                        onClick={() => setSelectedMember(m)}
                        className="p-2.5 bg-stone-100 hover:bg-stone-200 text-stone-700 rounded-xl transition-colors"
                        title="View Full Member Dossier"
                        aria-label={`View dossier of ${m.fullName}`}
                      >
                        <Eye className="w-4 h-4" />
                      </button>
                    </div>

                    {/* Secondary actions: Request info, Reject, Note */}
                    <div className="flex items-center justify-between gap-2 text-[11px]">
                      <button
                        type="button"
                        onClick={() => openActionModal(m, 'approve')}
                        className="text-emerald-800 hover:underline font-semibold flex items-center gap-1"
                      >
                        <span>Approve with Note</span>
                      </button>

                      <button
                        type="button"
                        onClick={() => openActionModal(m, 'info_requested')}
                        className="text-amber-800 hover:underline font-semibold"
                      >
                        Request Info
                      </button>

                      <button
                        type="button"
                        onClick={() => openActionModal(m, 'reject')}
                        className="text-rose-700 hover:underline font-semibold"
                      >
                        Decline
                      </button>
                    </div>

                  </div>
                </div>
              );
            })}
          </div>
        ) : (
          /* ========================================================= */
          /* TABLE VIEW (Desktop Tabular View with Direct Action Buttons) */
          /* ========================================================= */
          <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden">
            <div className="overflow-x-auto">
              <table className="w-full text-left border-collapse text-xs">
                <thead>
                  <tr className="bg-stone-50 border-b border-stone-200 text-stone-500 font-bold uppercase tracking-wider text-[10px]">
                    <th className="py-4 px-4">Applicant / Member</th>
                    <th className="py-4 px-4">Country & City</th>
                    <th className="py-4 px-4">CNIC / Passport</th>
                    <th className="py-4 px-4">Status</th>
                    <th className="py-4 px-4 text-center">Official ID</th>
                    <th className="py-4 px-4 text-right">Approval Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-stone-100">
                  {filteredMembers.map((m) => {
                    const isApproved = m.status === 'approved';
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
                              Pending
                            </span>
                          )}
                          {m.status === 'info_requested' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-blue-100 text-blue-800 border border-blue-300">
                              <HelpCircle className="w-3 h-3 text-blue-600" />
                              Info Needed
                            </span>
                          )}
                          {m.status === 'rejected' && (
                            <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-[11px] font-bold bg-rose-100 text-rose-800 border border-rose-200">
                              <XCircle className="w-3 h-3 text-rose-600" />
                              Declined
                            </span>
                          )}
                        </td>

                        {/* Member ID */}
                        <td className="py-3.5 px-4 text-center">
                          {m.memberId ? (
                            <span className="font-mono text-[11px] text-emerald-800 font-bold bg-emerald-50 px-2 py-0.5 rounded-md border border-emerald-200">
                              {m.memberId}
                            </span>
                          ) : (
                            <span className="text-stone-400 font-mono text-[10px]">
                              None
                            </span>
                          )}
                        </td>

                        {/* Action Buttons: CLEAR, DIRECT APPROVE ON EVERY ROW */}
                        <td className="py-3.5 px-4 text-right">
                          <div className="flex items-center justify-end gap-1.5">
                            
                            {/* Prominent Approve Button */}
                            <button
                              type="button"
                              onClick={() => handleFastApprove(m)}
                              disabled={actionProcessing}
                              className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-xl text-xs font-bold shadow-xs transition-colors ${
                                isApproved
                                  ? 'bg-emerald-100 text-emerald-900 border border-emerald-300 hover:bg-emerald-200'
                                  : 'bg-[#0D5A31] hover:bg-[#083e21] text-white'
                              }`}
                              title={isApproved ? 'Re-Approve and Refresh Member Card' : 'Approve Registration'}
                            >
                              <Check className="w-3.5 h-3.5" />
                              <span>{isApproved ? 'Re-Approve' : 'Approve Member'}</span>
                            </button>

                            {/* Info request */}
                            <button
                              type="button"
                              onClick={() => openActionModal(m, 'info_requested')}
                              className="px-2 py-1.5 bg-stone-100 hover:bg-stone-200 text-stone-700 text-xs font-semibold rounded-xl transition-colors"
                              title="Request Clarification"
                            >
                              Info
                            </button>

                            {/* Decline */}
                            <button
                              type="button"
                              onClick={() => openActionModal(m, 'reject')}
                              className="p-1.5 text-rose-600 hover:text-rose-800 hover:bg-rose-50 rounded-xl transition-colors"
                              title="Decline Application"
                              aria-label={`Decline ${m.fullName}`}
                            >
                              <XCircle className="w-4 h-4" />
                            </button>

                            {/* Inspect File */}
                            <button
                              type="button"
                              onClick={() => setSelectedMember(m)}
                              className="p-1.5 text-stone-600 hover:text-[#071F25] hover:bg-stone-100 rounded-xl transition-colors"
                              title="Inspect Full File"
                              aria-label={`View dossier of ${m.fullName}`}
                            >
                              <Eye className="w-4 h-4" />
                            </button>

                          </div>
                        </td>

                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        )}

      </div>

      {/* ========================================================= */}
      {/* CONFIRMATION & NOTE MODAL DIALOG */}
      {/* ========================================================= */}
      {actionType && targetMember && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150">
            
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                {actionType === 'approve' && <CheckCircle className="w-5 h-5 text-emerald-600" />}
                {actionType === 'reject' && <XCircle className="w-5 h-5 text-rose-600" />}
                {actionType === 'info_requested' && <HelpCircle className="w-5 h-5 text-amber-600" />}
                <h3 className="font-bold text-[#071F25] text-base font-heading">
                  {actionType === 'approve' && 'Approve Community Member'}
                  {actionType === 'reject' && 'Decline Registration'}
                  {actionType === 'info_requested' && 'Request Additional Information'}
                </h3>
              </div>
              <button
                onClick={() => {
                  setActionType(null);
                  setTargetMember(null);
                }}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <div className="text-xs text-stone-600 space-y-2">
              <p>
                Applicant: <strong className="text-stone-900">{targetMember.fullName}</strong>
              </p>
              <p>
                CNIC/Passport: <strong className="font-mono text-stone-800">{targetMember.idNumber}</strong>
              </p>
              
              {actionType === 'approve' && (
                <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-900 leading-relaxed">
                  Approving will automatically generate the official Member ID (e.g. <code>PLC-2026-XXXXX</code>) and unlock their digital membership card immediately.
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
                {actionType === 'approve' ? 'Approval Note for Member (Optional)' : 'Message / Reason for Applicant'}
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
                  onClick={handleModalApprove}
                  disabled={actionProcessing}
                  className="flex-1 py-2 text-xs font-bold bg-[#0D5A31] text-white hover:bg-[#083f22] rounded-xl shadow-xs disabled:opacity-50"
                >
                  {actionProcessing ? 'Generating ID & Approving...' : 'Confirm & Approve Member'}
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

      {/* ========================================================= */}
      {/* INSPECT MEMBER DOSSIER MODAL WITH DIRECT APPROVE ACTION */}
      {/* ========================================================= */}
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
                  <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                    selectedMember.status === 'approved' 
                      ? 'bg-emerald-100 text-emerald-800' 
                      : 'bg-amber-100 text-amber-800'
                  }`}>
                    {selectedMember.status.toUpperCase()}
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
                  <span>{selectedMember.registeredAt ? new Date(selectedMember.registeredAt).toLocaleString() : 'Recent'}</span>
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

              {/* Payment Receipt / Proof of Contribution */}
              <div className="p-3.5 rounded-xl bg-emerald-50/80 border border-emerald-300 space-y-2">
                <div className="flex items-center justify-between">
                  <span className="text-[10px] font-bold uppercase text-emerald-900 flex items-center gap-1.5">
                    <Receipt className="w-3.5 h-3.5 text-emerald-700" />
                    <span>Payment Receipt / Contribution Proof (رسید)</span>
                  </span>
                  {selectedMember.paymentReceiptURL ? (
                    <span className="text-[10px] font-bold text-emerald-800 bg-emerald-100 px-2 py-0.5 rounded-md border border-emerald-300">
                      Slip Attached
                    </span>
                  ) : (
                    <span className="text-[10px] font-medium text-stone-500">
                      No web slip attached
                    </span>
                  )}
                </div>

                {selectedMember.paymentReceiptURL ? (
                  <div className="flex items-center gap-3 pt-1">
                    <img
                      src={selectedMember.paymentReceiptURL}
                      alt="Payment Receipt"
                      className="w-16 h-16 object-cover rounded-lg border border-emerald-300 shadow-2xs"
                    />
                    <div className="text-xs">
                      <a
                        href={selectedMember.paymentReceiptURL}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-emerald-800 font-bold underline hover:text-emerald-950"
                      >
                        <span>Open Full Slip / Screenshot</span>
                        <ExternalLink className="w-3.5 h-3.5" />
                      </a>
                      {selectedMember.receiptReference && (
                        <p className="text-[11px] text-stone-600 mt-0.5 font-mono">
                          Ref: {selectedMember.receiptReference}
                        </p>
                      )}
                    </div>
                  </div>
                ) : (
                  <p className="text-[11px] text-stone-600 italic">
                    Applicant may have sent the payment slip directly via WhatsApp. You can verify with them below:
                  </p>
                )}

                {/* Direct WhatsApp Contact Button for Admin */}
                {selectedMember.mobile && (
                  <div className="pt-2 border-t border-emerald-200/60">
                    <a
                      href={`https://wa.me/${selectedMember.mobile.replace(/[^0-9]/g, '')}?text=${encodeURIComponent(
                        `السلام علیکم ${selectedMember.fullName}! پاکستان کمیونٹی عمان ایڈمن ڈیسک کی جانب سے آپ کی ممبرشپ رجسٹریشن اور فیس / فنڈ رسید کی تصدیق کے لیے رابطہ کیا جا رہا ہے۔`
                      )}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center justify-center gap-2 w-full py-2 px-3 bg-[#25D366] hover:bg-[#1EBE5D] text-white rounded-lg text-xs font-bold transition-colors shadow-2xs"
                    >
                      <MessageCircle className="w-4 h-4 text-white" />
                      <span>Contact {selectedMember.fullName.split(' ')[0]} on WhatsApp ({selectedMember.mobile})</span>
                    </a>
                  </div>
                )}
              </div>

              {/* Admin Note if any */}
              {selectedMember.adminNote && (
                <div className="p-3 rounded-xl bg-stone-100 border border-stone-200">
                  <span className="text-[10px] font-bold uppercase text-stone-500 block">Current Admin Note</span>
                  <p className="text-stone-800 mt-0.5">{selectedMember.adminNote}</p>
                </div>
              )}
            </div>

            {/* MODAL FOOTER WITH PROMINENT APPROVE BUTTON */}
            <div className="flex items-center justify-between gap-2 pt-3 border-t border-stone-100">
              <button
                type="button"
                onClick={() => setSelectedMember(null)}
                className="px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
              >
                Close File
              </button>

              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const m = selectedMember;
                    setSelectedMember(null);
                    openActionModal(m, 'reject');
                  }}
                  className="px-3 py-2 text-xs font-semibold text-rose-700 hover:bg-rose-50 rounded-xl border border-rose-200"
                >
                  Decline
                </button>

                <button
                  type="button"
                  onClick={() => {
                    executeApproval(selectedMember);
                  }}
                  className="px-4 py-2 text-xs font-bold bg-[#0D5A31] text-white rounded-xl hover:bg-[#094023] shadow-sm flex items-center gap-1.5"
                >
                  <Check className="w-3.5 h-3.5" />
                  <span>{selectedMember.status === 'approved' ? 'Re-Approve & Update' : 'Approve Member Application'}</span>
                </button>
              </div>
            </div>

          </div>
        </div>
      )}

      {/* ========================================================= */}
      {/* REGISTER & APPROVE NEW MEMBER MODAL */}
      {/* ========================================================= */}
      {showAddModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-stone-200 space-y-4 animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-stone-100 pb-3">
              <div className="flex items-center gap-2">
                <UserPlus className="w-5 h-5 text-[#0D5A31]" />
                <h3 className="font-bold text-[#071F25] text-base font-heading">
                  Register & Approve Member Instantly
                </h3>
              </div>
              <button
                onClick={() => setShowAddModal(false)}
                className="text-stone-400 hover:text-stone-700 text-sm font-bold"
              >
                ✕
              </button>
            </div>

            <p className="text-xs text-stone-600 leading-relaxed">
              Add a member directly from the administration desk. The applicant will be marked as <strong>Approved</strong> immediately and issued an official membership card.
            </p>

            <form onSubmit={handleManualAddAndApprove} className="space-y-3">
              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Full Official Name (as on CNIC/Passport) *
                </label>
                <input
                  type="text"
                  required
                  value={newMemberName}
                  onChange={(e) => setNewMemberName(e.target.value)}
                  placeholder="e.g. Muhammad Aslam"
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#0D5A31]"
                />
              </div>

              <div>
                <label className="block text-xs font-bold text-stone-700 mb-1">
                  Registered Email Address *
                </label>
                <input
                  type="email"
                  required
                  value={newMemberEmail}
                  onChange={(e) => setNewMemberEmail(e.target.value)}
                  placeholder="name@example.com"
                  className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#0D5A31]"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Mobile Phone
                  </label>
                  <input
                    type="text"
                    value={newMemberMobile}
                    onChange={(e) => setNewMemberMobile(e.target.value)}
                    placeholder="+968 9123 4567"
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#0D5A31]"
                  />
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    CNIC or Passport
                  </label>
                  <input
                    type="text"
                    value={newMemberIdNumber}
                    onChange={(e) => setNewMemberIdNumber(e.target.value)}
                    placeholder="35201-1234567-1"
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#0D5A31]"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    Country
                  </label>
                  <select
                    value={newMemberCountry}
                    onChange={(e) => setNewMemberCountry(e.target.value as MemberCountry)}
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#0D5A31]"
                  >
                    <option value="Oman">Sultanate of Oman</option>
                    <option value="Pakistan">Pakistan</option>
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-bold text-stone-700 mb-1">
                    City / Wilayat
                  </label>
                  <input
                    type="text"
                    value={newMemberLocation}
                    onChange={(e) => setNewMemberLocation(e.target.value)}
                    placeholder="Muscat, Oman"
                    className="w-full text-xs p-2.5 rounded-xl border border-stone-300 focus:ring-2 focus:ring-[#0D5A31]"
                  />
                </div>
              </div>

              <div className="flex items-center gap-2 pt-3 border-t border-stone-100">
                <button
                  type="button"
                  onClick={() => setShowAddModal(false)}
                  className="flex-1 py-2.5 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-xl"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isAddingMember}
                  className="flex-1 py-2.5 text-xs font-bold bg-[#0D5A31] hover:bg-[#083e20] text-white rounded-xl shadow-md disabled:opacity-50"
                >
                  {isAddingMember ? 'Registering...' : 'Save & Issue Approved Card'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

    </div>
  );
};
