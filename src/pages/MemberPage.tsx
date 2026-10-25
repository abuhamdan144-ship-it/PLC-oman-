import React, { useEffect, useState } from 'react';
import {
  addDoc,
  collection,
  doc,
  onSnapshot,
  runTransaction,
  serverTimestamp,
  Timestamp,
  updateDoc,
} from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import {
  AlertTriangle,
  Calendar,
  Check,
  CreditCard,
  Edit3,
  ExternalLink,
  FileText,
  Newspaper,
  PhoneCall,
  Save,
  ShieldCheck,
  Upload,
  User,
  Vote,
  type LucideIcon,
} from 'lucide-react';
import { MembershipCard } from '../components/MembershipCard';
import { TermsModal } from '../components/TermsModal';
import { useAuth } from '../hooks/useAuth';
import { compressImage } from '../lib/imageCompressor';
import { FlagPair } from '../lib/flags';
import { db, storage } from '../lib/firebase';
import { officialNewsSources, portalContacts } from '../lib/portalResources';
import type { CommunityElection, ElectionOption } from '../types';

type MemberTab = 'member' | 'voting' | 'incidents' | 'contacts' | 'news';

const memberTabs: { id: MemberTab; label: string; shortLabel: string; icon: LucideIcon }[] = [
  { id: 'member', label: 'My membership', shortLabel: 'Member', icon: CreditCard },
  { id: 'voting', label: 'Community vote', shortLabel: 'Voting', icon: Vote },
  { id: 'incidents', label: 'Incident reports', shortLabel: 'Reports', icon: AlertTriangle },
  { id: 'contacts', label: 'Emergency contacts', shortLabel: 'Contacts', icon: PhoneCall },
  { id: 'news', label: 'News & rules', shortLabel: 'News', icon: Newspaper },
];

const incidentCategories = [
  { value: 'death', label: 'Death / bereavement support' },
  { value: 'injury', label: 'Injury / medical emergency' },
  { value: 'lost', label: 'Lost person, item or document' },
  { value: 'found', label: 'Found person or item' },
  { value: 'wages', label: 'Unpaid wages / labour issue' },
  { value: 'other', label: 'Other community welfare request' },
];

export const MemberPage: React.FC = () => {
  const { member, user } = useAuth();
  const [activeTab, setActiveTab] = useState<MemberTab>('member');
  const [showTermsModal, setShowTermsModal] = useState(false);

  const [isEditingProfile, setIsEditingProfile] = useState(false);
  const [editMobile, setEditMobile] = useState(member?.mobile || '');
  const [editLocation, setEditLocation] = useState(member?.currentLocation || '');
  const [editEmergencyName, setEditEmergencyName] = useState(member?.emergencyContact?.name || '');
  const [editEmergencyPhone, setEditEmergencyPhone] = useState(member?.emergencyContact?.phone || '');
  const [editEmergencyRelation, setEditEmergencyRelation] = useState(member?.emergencyContact?.relation || 'Family');
  const [newPhotoFile, setNewPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [profileMessage, setProfileMessage] = useState<{ text: string; error: boolean } | null>(null);

  const [activeElectionId, setActiveElectionId] = useState<string | null>(null);
  const [election, setElection] = useState<CommunityElection | null>(null);
  const [electionLoading, setElectionLoading] = useState(true);
  const [electionError, setElectionError] = useState('');
  const [myVote, setMyVote] = useState<{ optionId: string } | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [isCastingVote, setIsCastingVote] = useState(false);
  const [voteMessage, setVoteMessage] = useState('');

  const [incidentSubject, setIncidentSubject] = useState('');
  const [incidentCategory, setIncidentCategory] = useState('death');
  const [incidentUrgency, setIncidentUrgency] = useState('normal');
  const [incidentDetails, setIncidentDetails] = useState('');
  const [incidentSubmitted, setIncidentSubmitted] = useState(false);
  const [incidentError, setIncidentError] = useState('');
  const [isSubmittingIncident, setIsSubmittingIncident] = useState(false);

  useEffect(() => {
    if (!member) return;
    setEditMobile(member.mobile || '');
    setEditLocation(member.currentLocation || '');
    setEditEmergencyName(member.emergencyContact?.name || '');
    setEditEmergencyPhone(member.emergencyContact?.phone || '');
    setEditEmergencyRelation(member.emergencyContact?.relation || 'Family');
  }, [member]);

  useEffect(() => {
    const settingsRef = doc(db, 'settings', 'portal');
    return onSnapshot(
      settingsRef,
      (snapshot) => {
        setActiveElectionId(snapshot.exists() ? (snapshot.data().activeElectionId as string) || null : null);
        setElectionError('');
      },
      (error) => {
        console.error('Could not load the active community ballot:', error);
        setElectionError('Voting is temporarily unavailable. Please try again later.');
        setElectionLoading(false);
      },
    );
  }, []);

  useEffect(() => {
    setElection(null);
    setMyVote(null);
    setSelectedOptionId('');
    setVoteMessage('');
    setElectionLoading(Boolean(activeElectionId));
    if (!activeElectionId || !user) {
      setElectionLoading(false);
      return;
    }

    const electionRef = doc(db, 'elections', activeElectionId);
    const voteRef = doc(db, 'elections', activeElectionId, 'votes', user.uid);
    const stopElection = onSnapshot(
      electionRef,
      (snapshot) => {
        setElection(snapshot.exists() ? (snapshot.data() as CommunityElection) : null);
        setElectionLoading(false);
      },
      (error) => {
        console.error('Could not load the election:', error);
        setElectionError('The ballot could not be loaded. Please contact an administrator.');
        setElectionLoading(false);
      },
    );
    const stopVote = onSnapshot(
      voteRef,
      (snapshot) => {
        setMyVote(snapshot.exists() ? (snapshot.data() as { optionId: string }) : null);
      },
      (error) => {
        console.error('Could not load the member ballot:', error);
      },
    );
    return () => {
      stopElection();
      stopVote();
    };
  }, [activeElectionId, user]);

  if (!member) return null;

  const handlePhotoSelect = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setProfileMessage({ text: 'Choose a valid image file.', error: true });
      return;
    }
    setNewPhotoFile(file);
    setPhotoPreview(URL.createObjectURL(file));
  };

  const handleUpdateProfile = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    setIsUpdatingProfile(true);
    setProfileMessage(null);

    try {
      let photoURL = member.photoURL || '';
      if (newPhotoFile) {
        const compressedBlob = await compressImage(newPhotoFile, 400 * 1024, 800);
        const storageRef = ref(storage, `profile-photos/${user.uid}/profile_${Date.now()}.jpg`);
        const uploadResult = await uploadBytes(storageRef, compressedBlob, { contentType: 'image/jpeg' });
        photoURL = await getDownloadURL(uploadResult.ref);
      }

      await updateDoc(doc(db, 'members', user.uid), {
        mobile: editMobile.trim(),
        currentLocation: editLocation.trim(),
        emergencyContact: {
          name: editEmergencyName.trim(),
          phone: editEmergencyPhone.trim(),
          relation: editEmergencyRelation.trim() || 'Family',
        },
        photoURL,
      });

      // The QR page stores no private contact or identity fields. Keep only its public location/photo in sync.
      try {
        await updateDoc(doc(db, 'publicMembers', user.uid), {
          currentLocation: editLocation.trim(),
          photoURL,
        });
      } catch (publicRecordError) {
        console.warn('Public verification record will need an admin sync:', publicRecordError);
      }

      setProfileMessage({ text: 'Your member details were updated.', error: false });
      setIsEditingProfile(false);
      setNewPhotoFile(null);
      setPhotoPreview(null);
    } catch (error) {
      console.error('Profile update failed:', error);
      setProfileMessage({ text: 'Could not save your details. Please check your connection and try again.', error: true });
    } finally {
      setIsUpdatingProfile(false);
    }
  };

  const resetProfileForm = () => {
    setEditMobile(member.mobile || '');
    setEditLocation(member.currentLocation || '');
    setEditEmergencyName(member.emergencyContact?.name || '');
    setEditEmergencyPhone(member.emergencyContact?.phone || '');
    setEditEmergencyRelation(member.emergencyContact?.relation || 'Family');
    setNewPhotoFile(null);
    setPhotoPreview(null);
    setProfileMessage(null);
    setIsEditingProfile(false);
  };

  const handleCastVote = async () => {
    if (!user || !activeElectionId || !election || !selectedOptionId) return;
    setIsCastingVote(true);
    setVoteMessage('');

    try {
      const electionRef = doc(db, 'elections', activeElectionId);
      const voteRef = doc(db, 'elections', activeElectionId, 'votes', user.uid);
      await runTransaction(db, async (transaction) => {
        const electionSnapshot = await transaction.get(electionRef);
        const voteSnapshot = await transaction.get(voteRef);
        if (!electionSnapshot.exists()) throw new Error('This ballot is no longer available.');
        if (voteSnapshot.exists()) throw new Error('Your vote has already been recorded for this ballot.');

        const electionData = electionSnapshot.data();
        const optionIds = (electionData.optionIds || []) as string[];
        const closesAt = electionData.closesAt as Timestamp | undefined;
        if (electionData.status !== 'open' || !closesAt || closesAt.toDate().getTime() <= Date.now()) {
          throw new Error('This ballot is closed.');
        }
        if (!optionIds.includes(selectedOptionId)) throw new Error('Select one of the listed cabinet options.');

        transaction.set(voteRef, {
          memberUid: user.uid,
          optionId: selectedOptionId,
          submittedAt: serverTimestamp(),
        });
      });
      setVoteMessage('Your vote has been recorded securely. You can vote only once in this ballot.');
    } catch (error) {
      console.error('Could not submit the member ballot:', error);
      setVoteMessage(error instanceof Error ? error.message : 'Your vote could not be submitted. Please try again.');
    } finally {
      setIsCastingVote(false);
    }
  };

  const handleSubmitIncident = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    if (!incidentSubject.trim() || !incidentDetails.trim()) {
      setIncidentError('Add a short subject and describe the situation so the welfare team can understand it.');
      return;
    }

    setIsSubmittingIncident(true);
    setIncidentError('');
    try {
      await addDoc(collection(db, 'incidents'), {
        memberUid: user.uid,
        memberId: member.memberId || '',
        memberName: member.fullName,
        memberMobile: member.mobile,
        subject: incidentSubject.trim(),
        category: incidentCategory,
        details: incidentDetails.trim(),
        urgency: incidentUrgency,
        createdAt: serverTimestamp(),
        status: 'new',
      });
      setIncidentSubmitted(true);
      setIncidentSubject('');
      setIncidentDetails('');
      setIncidentUrgency('normal');
    } catch (error) {
      console.error('Could not submit the incident report:', error);
      setIncidentError('Your report was not sent. Please check your connection or call an official emergency number if urgent.');
    } finally {
      setIsSubmittingIncident(false);
    }
  };

  const electionClosesAt = election?.closesAt?.toDate?.();
  const ballotIsOpen = Boolean(
    election && election.status === 'open' && electionClosesAt && electionClosesAt.getTime() > Date.now(),
  );
  const selectedVoteLabel = election?.options?.find((option: ElectionOption) => option.id === myVote?.optionId)?.label;

  return (
    <div className="min-h-screen bg-[#F9F7F2] pb-24 md:pb-10">
      <section className="bg-[#071F25] text-white border-b border-amber-500/30 px-4 py-5 sm:px-6 md:py-7">
        <div className="mx-auto flex max-w-6xl items-center justify-between gap-3">
          <div className="min-w-0">
            <div className="mb-1 flex items-center gap-2 text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-300">
              <ShieldCheck className="h-4 w-4" /> Approved member portal
            </div>
            <h1 className="truncate text-xl font-extrabold sm:text-2xl">Assalam-o-alaikum, {member.fullName.split(' ')[0]}</h1>
            <p className="mt-1 flex flex-wrap items-center gap-x-2 text-xs text-stone-300">
              <span className="font-mono text-amber-300">{member.memberId || 'Member ID pending'}</span>
              <span aria-hidden="true">·</span>
              <span>{member.currentLocation || member.country}</span>
            </p>
          </div>
          <FlagPair size="sm" />
        </div>

        <nav aria-label="Member portal sections" className="mx-auto mt-6 hidden max-w-6xl gap-2 overflow-x-auto md:flex">
          {memberTabs.map(({ id, label, icon: Icon }) => (
            <button
              key={id}
              type="button"
              onClick={() => setActiveTab(id)}
              aria-current={activeTab === id ? 'page' : undefined}
              className={`inline-flex shrink-0 items-center gap-2 rounded-t-xl px-4 py-3 text-xs font-bold transition-colors ${
                activeTab === id ? 'bg-[#F9F7F2] text-[#071F25]' : 'text-stone-300 hover:bg-white/10 hover:text-white'
              }`}
            >
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>
      </section>

      <main className="mx-auto max-w-6xl px-4 pt-5 sm:px-6 md:pt-7">
        {profileMessage && activeTab === 'member' && (
          <div role="status" className={`mb-4 rounded-xl border p-3 text-sm ${profileMessage.error ? 'border-rose-200 bg-rose-50 text-rose-800' : 'border-emerald-200 bg-emerald-50 text-emerald-800'}`}>
            {profileMessage.text}
          </div>
        )}

        {activeTab === 'member' && (
          <section className="space-y-4 animate-in fade-in duration-150">
            <div className="rounded-3xl border border-stone-200 bg-white p-4 shadow-sm sm:p-7">
              <div className="mb-4 text-center">
                <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-emerald-800">Your digital membership</p>
                <h2 className="mt-1 text-lg font-bold text-[#071F25] sm:text-xl">Membership card</h2>
              </div>
              <MembershipCard member={member} />
            </div>

            <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-center justify-between gap-3 border-b border-stone-100 pb-4">
                <div className="flex items-center gap-2">
                  <User className="h-5 w-5 text-emerald-800" />
                  <div>
                    <h2 className="font-bold text-[#071F25]">Member details</h2>
                    <p className="text-xs text-stone-500">Your registration and contact information</p>
                  </div>
                </div>
                {!isEditingProfile && (
                  <button
                    type="button"
                    onClick={() => { setIsEditingProfile(true); setProfileMessage(null); }}
                    className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-emerald-200 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-50"
                  >
                    <Edit3 className="h-3.5 w-3.5" /> Edit
                  </button>
                )}
              </div>

              {!isEditingProfile ? (
                <>
                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2 lg:grid-cols-3">
                    <Detail label="Full name" value={member.fullName} />
                    <Detail label="Membership ID" value={member.memberId || 'Pending'} mono />
                    <Detail label="Status" value="Approved member" />
                    <Detail label="Country" value={member.country} />
                    <Detail label="Current location" value={member.currentLocation || 'Not provided'} />
                    <Detail label="Member since" value={member.memberSince || '—'} />
                    <Detail label="Mobile number" value={member.mobile || 'Not provided'} />
                    <Detail label="Email" value={member.email || 'Not provided'} />
                    <Detail label="Emergency contact" value={`${member.emergencyContact?.name || 'Not provided'} · ${member.emergencyContact?.phone || '—'}`} />
                  </div>
                  <div className="mt-4 rounded-xl bg-stone-50 p-3 text-xs text-stone-600">
                    Your verified identity details are protected and are not shown on the public QR verification page.
                  </div>
                </>
              ) : (
                <form onSubmit={handleUpdateProfile} className="space-y-4">
                  <div className="flex items-center gap-4 rounded-xl border border-stone-200 p-3">
                    {photoPreview || member.photoURL ? (
                      <img src={photoPreview || member.photoURL} alt="Member profile" className="h-16 w-14 rounded-lg border border-amber-300 object-cover" />
                    ) : (
                      <div className="flex h-16 w-14 items-center justify-center rounded-lg bg-emerald-50 text-xl font-bold text-emerald-900">{member.fullName.charAt(0)}</div>
                    )}
                    <div>
                      <p className="text-sm font-semibold text-[#071F25]">Card photo</p>
                      <label className="mt-1 inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-stone-300 px-3 py-2 text-xs font-semibold hover:bg-stone-50">
                        <Upload className="h-3.5 w-3.5" /> Choose photo
                        <input type="file" accept="image/*" onChange={handlePhotoSelect} className="sr-only" />
                      </label>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                    <FormField label="Mobile number" value={editMobile} onChange={setEditMobile} type="tel" />
                    <FormField label="Current city / wilayat" value={editLocation} onChange={setEditLocation} />
                    <FormField label="Emergency contact name" value={editEmergencyName} onChange={setEditEmergencyName} />
                    <FormField label="Emergency contact phone" value={editEmergencyPhone} onChange={setEditEmergencyPhone} type="tel" />
                    <FormField label="Emergency contact relation" value={editEmergencyRelation} onChange={setEditEmergencyRelation} />
                  </div>
                  <div className="flex justify-end gap-2 border-t border-stone-100 pt-4">
                    <button type="button" onClick={resetProfileForm} className="rounded-lg px-4 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100">Cancel</button>
                    <button type="submit" disabled={isUpdatingProfile} className="inline-flex items-center gap-2 rounded-lg bg-emerald-900 px-4 py-2 text-xs font-bold text-white disabled:opacity-50">
                      <Save className="h-4 w-4" /> {isUpdatingProfile ? 'Saving…' : 'Save details'}
                    </button>
                  </div>
                </form>
              )}
            </div>
          </section>
        )}

        {activeTab === 'voting' && (
          <section className="mx-auto max-w-3xl animate-in fade-in duration-150">
            <PanelHeading icon={Vote} eyebrow="Member ballot" title="Choose your community cabinet" description="Voting is available only to approved members. Each member can submit one ballot for each election." />
            {electionError && <MessageBox tone="error">{electionError}</MessageBox>}
            {electionLoading ? (
              <LoadingCard label="Loading the current ballot…" />
            ) : !activeElectionId || !election ? (
              <EmptyCard title="No active ballot" body="The community administrator has not published a cabinet election yet. Check back later." />
            ) : (
              <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
                <div className="flex flex-wrap items-center justify-between gap-3">
                  <span className={`rounded-full px-3 py-1 text-[11px] font-bold uppercase tracking-wide ${ballotIsOpen ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-100 text-stone-600'}`}>
                    {ballotIsOpen ? 'Open ballot' : 'Closed ballot'}
                  </span>
                  {electionClosesAt && <span className="inline-flex items-center gap-1.5 text-xs text-stone-500"><Calendar className="h-4 w-4" /> Closes {electionClosesAt.toLocaleString()}</span>}
                </div>
                <h2 className="mt-4 text-xl font-bold text-[#071F25]">{election.title}</h2>
                <p className="mt-2 text-sm leading-relaxed text-stone-600">{election.description}</p>

                {myVote ? (
                  <div className="mt-6 rounded-2xl border border-emerald-200 bg-emerald-50 p-4" role="status">
                    <div className="flex items-start gap-3">
                      <Check className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800" />
                      <div>
                        <p className="font-bold text-emerald-950">Your ballot has been submitted</p>
                        <p className="mt-1 text-sm text-emerald-900">{selectedVoteLabel || 'Your selection is recorded.'} You cannot vote again in this election.</p>
                      </div>
                    </div>
                  </div>
                ) : ballotIsOpen ? (
                  <div className="mt-6 space-y-3">
                    {(election.options || []).map((option) => (
                      <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-2xl border p-4 transition-colors ${selectedOptionId === option.id ? 'border-emerald-700 bg-emerald-50' : 'border-stone-200 hover:border-emerald-300'}`}>
                        <input type="radio" name="cabinet-option" value={option.id} checked={selectedOptionId === option.id} onChange={() => setSelectedOptionId(option.id)} className="mt-1 h-4 w-4 accent-emerald-800" />
                        <span className="font-semibold text-[#071F25]">{option.label}</span>
                      </label>
                    ))}
                    <button type="button" onClick={handleCastVote} disabled={!selectedOptionId || isCastingVote} className="mt-2 w-full rounded-xl bg-[#071F25] px-4 py-3 text-sm font-bold text-white hover:bg-emerald-900 disabled:cursor-not-allowed disabled:opacity-50">
                      {isCastingVote ? 'Submitting ballot…' : 'Submit my vote'}
                    </button>
                    {voteMessage && <MessageBox tone="info">{voteMessage}</MessageBox>}
                    <p className="text-center text-[11px] text-stone-500">Please check your choice before submitting. A submitted ballot cannot be changed.</p>
                  </div>
                ) : (
                  <div className="mt-6 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">This ballot is closed. The administrator can publish a new election when the next cabinet selection opens.</div>
                )}
              </div>
            )}
          </section>
        )}

        {activeTab === 'incidents' && (
          <section className="mx-auto max-w-2xl animate-in fade-in duration-150">
            <PanelHeading icon={AlertTriangle} eyebrow="Community welfare" title="Report an incident" description="Submit a death, injury, lost/found, labour or other welfare report to the approved community team." />
            <div className="mb-4 rounded-xl border border-rose-200 bg-rose-50 p-3 text-sm text-rose-900">
              If anyone is in immediate danger, call <a href="tel:9999" className="font-extrabold underline">ROP emergency 9999</a> first. Do not wait for a portal reply.
            </div>
            {incidentSubmitted ? (
              <div className="rounded-3xl border border-emerald-200 bg-white p-7 text-center shadow-sm">
                <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-emerald-100 text-emerald-900"><Check className="h-6 w-6" /></div>
                <h2 className="mt-3 text-lg font-bold text-emerald-950">Report received</h2>
                <p className="mt-2 text-sm text-stone-600">Your report is saved for the community welfare team. For official Oman labour complaints, use the Ministry of Labour link in Contacts.</p>
                <button type="button" onClick={() => setIncidentSubmitted(false)} className="mt-5 rounded-lg bg-emerald-900 px-4 py-2 text-xs font-bold text-white">Submit another report</button>
              </div>
            ) : (
              <form onSubmit={handleSubmitIncident} className="space-y-4 rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
                <FormField label="Subject / short summary" value={incidentSubject} onChange={setIncidentSubject} required placeholder="For example: found passport near Ruwi" />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <label className="block text-xs font-bold text-[#071F25]">Incident type
                    <select value={incidentCategory} onChange={(event) => setIncidentCategory(event.target.value)} className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm font-normal">
                      {incidentCategories.map((category) => <option key={category.value} value={category.value}>{category.label}</option>)}
                    </select>
                  </label>
                  <label className="block text-xs font-bold text-[#071F25]">Urgency
                    <select value={incidentUrgency} onChange={(event) => setIncidentUrgency(event.target.value)} className="mt-1.5 w-full rounded-xl border border-stone-300 bg-white px-3 py-3 text-sm font-normal">
                      <option value="normal">Standard</option><option value="urgent">Urgent</option><option value="critical">Critical — also call 9999 if life-threatening</option>
                    </select>
                  </label>
                </div>
                <label className="block text-xs font-bold text-[#071F25]">What happened and what help is needed?
                  <textarea required rows={5} value={incidentDetails} onChange={(event) => setIncidentDetails(event.target.value)} placeholder="Share the location, dates, people involved and safe contact details. Avoid posting passwords or bank PINs." className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-3 text-sm font-normal leading-relaxed" />
                </label>
                {incidentError && <MessageBox tone="error">{incidentError}</MessageBox>}
                <button type="submit" disabled={isSubmittingIncident} className="w-full rounded-xl bg-[#071F25] px-4 py-3 text-sm font-bold text-white disabled:opacity-50">{isSubmittingIncident ? 'Sending report…' : 'Send private report'}</button>
                <p className="text-center text-[11px] text-stone-500">Reports are visible to authorized administrators, not to other members.</p>
              </form>
            )}
          </section>
        )}

        {activeTab === 'contacts' && (
          <section className="animate-in fade-in duration-150">
            <PanelHeading icon={PhoneCall} eyebrow="Keep these numbers handy" title="Emergency & community contacts" description="Tap a number to call. Official sources are linked on each contact card." />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {portalContacts.map((contact) => (
                <article key={contact.name} className={`rounded-2xl border bg-white p-4 shadow-sm ${contact.priority === 'emergency' ? 'border-rose-200 ring-1 ring-rose-100' : 'border-stone-200'}`}>
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <p className="font-bold text-[#071F25]">{contact.name}</p>
                      <p className="mt-1 text-xs leading-relaxed text-stone-600">{contact.description}</p>
                    </div>
                    {contact.priority === 'emergency' && <span className="rounded-full bg-rose-100 px-2 py-1 text-[10px] font-bold uppercase text-rose-900">Emergency</span>}
                  </div>
                  <a href={contact.dialHref} className="mt-4 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-xl bg-[#071F25] px-3 py-2 font-mono text-base font-extrabold text-white hover:bg-emerald-900">
                    <PhoneCall className="h-4 w-4" /> {contact.number}
                  </a>
                  {contact.whatsappHref && <a href={contact.whatsappHref} target="_blank" rel="noreferrer" className="mt-2 inline-flex text-xs font-semibold text-emerald-900 underline">Open official WhatsApp contact</a>}
                  <a href={contact.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-stone-500 underline">Source: {contact.sourceLabel} <ExternalLink className="h-3 w-3" /></a>
                </article>
              ))}
            </div>

            <div className="mt-4 grid grid-cols-1 gap-3 md:grid-cols-2">
              <ResourceCard icon={FileText} title="File an official Oman labour complaint" description="Gov.om describes the Ministry of Labour complaint process and how unresolved cases may proceed to court." href="https://gov.om/en/w/record-labor-complaint-" source="Official Gov.om service" />
              <ResourceCard icon={ShieldCheck} title="Worker rights and duties" description="Read the current official Oman Ministry of Labour guidance. This portal is not legal advice." href="https://www.mol.gov.om/pages/Employee-Rights-And-Duties" source="Oman Ministry of Labour" />
            </div>
            <p className="mt-4 rounded-xl bg-stone-100 p-3 text-xs leading-relaxed text-stone-600">The Supreme Judicial Council number above is for general enquiries; Gov.om does not list it as a dedicated labour-court hotline. Start a labour dispute through the Ministry of Labour complaint service.</p>
          </section>
        )}

        {activeTab === 'news' && (
          <section className="animate-in fade-in duration-150">
            <PanelHeading icon={Newspaper} eyebrow="Live publisher links" title="News, labour rules & updates" description="Pakistan and Oman headlines, worker-rights guidance, and new-rule publications from official publishers." />
            <div className="grid grid-cols-1 gap-3 md:grid-cols-2">
              {officialNewsSources.map((source) => (
                <a key={source.title} href={source.url} target="_blank" rel="noreferrer" className="group rounded-2xl border border-stone-200 bg-white p-5 shadow-sm transition hover:border-emerald-400 hover:shadow-md">
                  <span className="inline-flex rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold uppercase tracking-wide text-emerald-900">{source.category}</span>
                  <h2 className="mt-3 flex items-center justify-between gap-3 text-base font-bold text-[#071F25]">
                    {source.title}<ExternalLink className="h-4 w-4 shrink-0 text-emerald-800 transition group-hover:translate-x-0.5" />
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-stone-600">{source.description}</p>
                  <p className="mt-4 text-xs font-semibold text-stone-500">{source.sourceLabel}</p>
                </a>
              ))}
            </div>
            <div className="mt-4 rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-amber-950">
              Headlines and rules open at the source website so members see the publisher’s current version. Confirm important legal or employment decisions with the Ministry of Labour or a qualified adviser.
            </div>
          </section>
        )}
      </main>

      <nav aria-label="Mobile member navigation" className="fixed inset-x-0 bottom-0 z-40 border-t border-stone-200 bg-white/95 px-1 pt-1 shadow-[0_-6px_20px_rgba(7,31,37,0.08)] backdrop-blur md:hidden" style={{ paddingBottom: 'max(env(safe-area-inset-bottom), 0.35rem)' }}>
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {memberTabs.map(({ id, shortLabel, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setActiveTab(id)} aria-current={activeTab === id ? 'page' : undefined} className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-lg px-1 text-[10px] font-semibold transition-colors ${activeTab === id ? 'text-emerald-900' : 'text-stone-500 hover:text-[#071F25]'}`}>
              <Icon className={`h-5 w-5 ${activeTab === id ? 'text-emerald-800' : ''}`} />
              <span>{shortLabel}</span>
            </button>
          ))}
        </div>
      </nav>

      <div className="mx-auto hidden max-w-6xl px-6 pb-5 pt-4 text-center text-[11px] text-stone-500 md:block">
        Need help? Open <button type="button" onClick={() => setShowTermsModal(true)} className="font-semibold text-emerald-900 underline">community charter</button>.
      </div>
      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </div>
  );
};

const Detail: React.FC<{ label: string; value: string; mono?: boolean }> = ({ label, value, mono = false }) => (
  <div className="rounded-xl bg-stone-50 p-3">
    <p className="text-[10px] font-bold uppercase tracking-wide text-stone-500">{label}</p>
    <p className={`mt-1 break-words text-sm font-semibold text-[#071F25] ${mono ? 'font-mono' : ''}`}>{value}</p>
  </div>
);

const FormField: React.FC<{
  label: string;
  value: string;
  onChange: (value: string) => void;
  type?: string;
  required?: boolean;
  placeholder?: string;
}> = ({ label, value, onChange, type = 'text', required = false, placeholder }) => (
  <label className="block text-xs font-bold text-[#071F25]">{label}
    <input type={type} required={required} value={value} onChange={(event) => onChange(event.target.value)} placeholder={placeholder} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-3 text-sm font-normal focus:border-emerald-700 focus:outline-none focus:ring-2 focus:ring-emerald-100" />
  </label>
);

const PanelHeading: React.FC<{ icon: LucideIcon; eyebrow: string; title: string; description: string }> = ({ icon: Icon, eyebrow, title, description }) => (
  <div className="mb-4 rounded-3xl bg-[#071F25] p-5 text-white sm:p-6">
    <div className="flex items-start gap-3">
      <div className="rounded-xl bg-amber-300 p-2.5 text-[#071F25]"><Icon className="h-5 w-5" /></div>
      <div>
        <p className="text-[10px] font-bold uppercase tracking-[0.18em] text-amber-300">{eyebrow}</p>
        <h1 className="mt-1 text-xl font-extrabold sm:text-2xl">{title}</h1>
        <p className="mt-2 max-w-2xl text-sm leading-relaxed text-stone-300">{description}</p>
      </div>
    </div>
  </div>
);

const ResourceCard: React.FC<{ icon: LucideIcon; title: string; description: string; href: string; source: string }> = ({ icon: Icon, title, description, href, source }) => (
  <a href={href} target="_blank" rel="noreferrer" className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm hover:border-emerald-400">
    <div className="flex items-start gap-3">
      <Icon className="mt-0.5 h-5 w-5 shrink-0 text-emerald-800" />
      <div>
        <h3 className="font-bold text-[#071F25]">{title}</h3>
        <p className="mt-1 text-xs leading-relaxed text-stone-600">{description}</p>
        <p className="mt-3 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-900">{source} <ExternalLink className="h-3 w-3" /></p>
      </div>
    </div>
  </a>
);

const MessageBox: React.FC<{ tone: 'error' | 'info'; children: React.ReactNode }> = ({ tone, children }) => (
  <div role="status" className={`rounded-xl border p-3 text-sm ${tone === 'error' ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-amber-200 bg-amber-50 text-amber-950'}`}>{children}</div>
);

const LoadingCard: React.FC<{ label: string }> = ({ label }) => (
  <div className="rounded-2xl border border-stone-200 bg-white p-8 text-center text-sm text-stone-600 shadow-sm">{label}</div>
);

const EmptyCard: React.FC<{ title: string; body: string }> = ({ title, body }) => (
  <div className="rounded-3xl border border-stone-200 bg-white p-8 text-center shadow-sm">
    <Vote className="mx-auto h-8 w-8 text-stone-400" />
    <h2 className="mt-3 font-bold text-[#071F25]">{title}</h2>
    <p className="mt-2 text-sm text-stone-600">{body}</p>
  </div>
);
