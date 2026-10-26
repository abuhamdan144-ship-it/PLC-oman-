import React, { useEffect, useState } from 'react';
import {
  collection,
  doc,
  getDocs,
  onSnapshot,
  serverTimestamp,
  Timestamp,
  updateDoc,
  writeBatch,
} from 'firebase/firestore';
import { Link } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { db } from '../lib/firebase';
import {
  AlertTriangle,
  Check,
  ExternalLink,
  FileText,
  RefreshCw,
  ShieldCheck,
  Vote,
  type LucideIcon,
} from 'lucide-react';
import type { CommunityElection, ElectionNominee, ElectionPosition, MemberProfile } from '../types';

type AdminSection = 'ballot' | 'reports' | 'verification';
type IncidentStatus = 'new' | 'reviewing' | 'resolved';

interface IncidentRecord {
  id: string;
  memberUid: string;
  memberId: string;
  memberName: string;
  memberMobile: string;
  subject: string;
  category: string;
  details: string;
  urgency: string;
  createdAt: Timestamp | string;
  status: IncidentStatus;
}

const adminSections: { id: AdminSection; label: string; icon: LucideIcon }[] = [
  { id: 'ballot', label: 'Voting & cabinet', icon: Vote },
  { id: 'reports', label: 'Incident reports', icon: AlertTriangle },
  { id: 'verification', label: 'QR verification', icon: ShieldCheck },
];

const toDateInput = (date: Date) => {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60000);
  return local.toISOString().slice(0, 16);
};

const incidentDate = (value: Timestamp | string | undefined) => {
  if (!value) return 'Date unavailable';
  const date = typeof value === 'string' ? new Date(value) : value.toDate();
  return Number.isNaN(date.getTime()) ? 'Date unavailable' : date.toLocaleString();
};

export const AdminPortalPage: React.FC = () => {
  const { user, member: admin } = useAuth();
  const [section, setSection] = useState<AdminSection>('ballot');
  const [activeElectionId, setActiveElectionId] = useState<string | null>(null);
  const [activeElection, setActiveElection] = useState<CommunityElection | null>(null);
  const [voteTally, setVoteTally] = useState<Record<string, number>>({});
  const [incidentRecords, setIncidentRecords] = useState<IncidentRecord[]>([]);
  const [loadingIncidents, setLoadingIncidents] = useState(true);
  const [electionTitle, setElectionTitle] = useState('Community Cabinet Election');
  const [electionDescription, setElectionDescription] = useState('Select one cabinet to represent the community.');
  const [electionPositions, setElectionPositions] = useState('President: Nominee One | PLC-2026-00001 | Community leadership\nVice President: Nominee Two | PLC-2026-00002 | Welfare coordination\nGeneral Secretary: Nominee Three | PLC-2026-00003 | Administration\nTreasurer: Nominee Four | PLC-2026-00004 | Finance and records\nWelfare Secretary: Nominee Five | PLC-2026-00005 | Member welfare\nMedia & Communication Secretary: Nominee Six | PLC-2026-00006 | Community communications\nRegional Representative: Nominee Seven | PLC-2026-00007 | Regional coordination');
  const [closesAt, setClosesAt] = useState(() => toDateInput(new Date(Date.now() + 7 * 24 * 60 * 60 * 1000)));
  const [isCreatingElection, setIsCreatingElection] = useState(false);
  const [isClosingElection, setIsClosingElection] = useState(false);
  const [isSyncingPublicRecords, setIsSyncingPublicRecords] = useState(false);
  const [notice, setNotice] = useState<{ text: string; error?: boolean } | null>(null);

  useEffect(() => {
    return onSnapshot(
      doc(db, 'settings', 'portal'),
      (snapshot) => setActiveElectionId(snapshot.exists() ? (snapshot.data().activeElectionId as string) || null : null),
      (error) => {
        console.error('Admin could not read portal settings:', error);
        setNotice({ text: 'Could not load portal settings. Check the deployed Firestore rules.', error: true });
      },
    );
  }, []);

  useEffect(() => {
    if (!activeElectionId) {
      setActiveElection(null);
      setVoteTally({});
      return;
    }

    const unsubscribeElection = onSnapshot(
      doc(db, 'elections', activeElectionId),
      (snapshot) => setActiveElection(snapshot.exists() ? (snapshot.data() as CommunityElection) : null),
      (error) => {
        console.error('Admin could not load active ballot:', error);
        setNotice({ text: 'Could not load the active ballot.', error: true });
      },
    );
    const unsubscribeVotes = onSnapshot(
      collection(db, 'elections', activeElectionId, 'votes'),
      (snapshot) => {
        const tally: Record<string, number> = {};
        snapshot.forEach((vote) => {
          const data = vote.data();
          const selections = data.selections as Record<string, string> | undefined;
          if (selections) {
            Object.entries(selections).forEach(([positionId, nomineeId]) => {
              const key = `${positionId}:${nomineeId}`;
              tally[key] = (tally[key] || 0) + 1;
            });
          }
        });
        setVoteTally(tally);
      },
      (error) => {
        console.error('Admin could not load ballot counts:', error);
      },
    );
    return () => {
      unsubscribeElection();
      unsubscribeVotes();
    };
  }, [activeElectionId]);

  useEffect(() => {
    const unsubscribe = onSnapshot(
      collection(db, 'incidents'),
      (snapshot) => {
        const list = snapshot.docs.map((item) => ({ id: item.id, ...item.data() }) as IncidentRecord);
        list.sort((a, b) => {
          const getTime = (value: Timestamp | string | undefined) => {
            if (!value) return 0;
            return typeof value === 'string' ? new Date(value).getTime() : value.toMillis();
          };
          return getTime(b.createdAt) - getTime(a.createdAt);
        });
        setIncidentRecords(list);
        setLoadingIncidents(false);
      },
      (error) => {
        console.error('Admin could not read incident reports:', error);
        setNotice({ text: 'Could not load reports. Verify administrator access and Firestore rules.', error: true });
        setLoadingIncidents(false);
      },
    );
    return () => unsubscribe();
  }, []);

  const showNotice = (text: string, error = false) => {
    setNotice({ text, error });
    window.setTimeout(() => setNotice(null), 5000);
  };

  const handleCreateElection = async (event: React.FormEvent) => {
    event.preventDefault();
    if (!user) return;
    const positions: ElectionPosition[] = electionPositions.split('\n').map((line, positionIndex) => {
      const [titlePart, nomineesPart = ''] = line.split(':');
      const title = titlePart.trim();
      const nominees: ElectionNominee[] = nomineesPart.split(',').map((raw, nomineeIndex) => {
        const [namePart, memberIdPart, bioPart] = raw.split('|').map((value) => value?.trim() || '');
        return { id: `nominee-${positionIndex + 1}-${nomineeIndex + 1}`, name: namePart, memberId: memberIdPart || undefined, bio: bioPart || undefined };
      }).filter((nominee) => nominee.name);
      return { id: `position-${positionIndex + 1}`, title, nominees };
    }).filter((position) => position.title && position.nominees.length > 0);
    const closeDate = new Date(closesAt);
    if (!positions.length || positions.some((position) => position.nominees.length < 2)) {
      showNotice('Add every cabinet position with at least two nominees. Use: Position: Name | Member ID | Bio', true);
      return;
    }
    if (Number.isNaN(closeDate.getTime()) || closeDate.getTime() <= Date.now()) {
      showNotice('Choose a closing date and time in the future.', true);
      return;
    }

    setIsCreatingElection(true);
    try {
      const electionRef = doc(collection(db, 'elections'));
      const batch = writeBatch(db);
      if (activeElectionId) {
        batch.update(doc(db, 'elections', activeElectionId), { status: 'closed', closedAt: serverTimestamp() });
      }
      batch.set(electionRef, {
        title: electionTitle.trim(),
        description: electionDescription.trim(),
        positions,
        positionIds: positions.map((position) => position.id),
        status: 'open',
        closesAt: Timestamp.fromDate(closeDate),
        createdAt: serverTimestamp(),
        createdBy: user.uid,
      });
      batch.set(doc(db, 'settings', 'portal'), {
        activeElectionId: electionRef.id,
        updatedAt: serverTimestamp(),
        updatedBy: user.uid,
      }, { merge: true });
      await batch.commit();
      showNotice('The new ballot is live. The previous ballot has been closed.');
    } catch (error) {
      console.error('Could not create the community ballot:', error);
      showNotice('Could not publish the ballot. Check your admin access and try again.', true);
    } finally {
      setIsCreatingElection(false);
    }
  };

  const handleCloseElection = async () => {
    if (!activeElectionId) return;
    setIsClosingElection(true);
    try {
      await updateDoc(doc(db, 'elections', activeElectionId), { status: 'closed', closedAt: serverTimestamp() });
      showNotice('The active ballot is now closed.');
    } catch (error) {
      console.error('Could not close the ballot:', error);
      showNotice('Could not close the ballot. Please try again.', true);
    } finally {
      setIsClosingElection(false);
    }
  };

  const handleIncidentStatus = async (incidentId: string, status: IncidentStatus) => {
    try {
      await updateDoc(doc(db, 'incidents', incidentId), { status, statusUpdatedAt: serverTimestamp() });
      showNotice(`Report marked ${status}.`);
    } catch (error) {
      console.error('Could not update incident status:', error);
      showNotice('Could not update report status.', true);
    }
  };

  const handleSyncPublicRecords = async () => {
    setIsSyncingPublicRecords(true);
    try {
      const [membersSnapshot, publicSnapshot] = await Promise.all([
        getDocs(collection(db, 'members')),
        getDocs(collection(db, 'publicMembers')),
      ]);
      const approved = membersSnapshot.docs.filter((item) => item.data().status === 'approved' && item.data().role === 'member');
      const approvedIds = new Set(approved.map((item) => item.id));
      for (let offset = 0; offset < approved.length; offset += 450) {
        const batch = writeBatch(db);
        approved.slice(offset, offset + 450).forEach((item) => {
          const data = item.data() as MemberProfile;
          const publicRecord = {
            uid: item.id,
            memberId: data.memberId || '',
            fullName: data.fullName,
            country: data.country,
            currentLocation: data.currentLocation || '',
            photoURL: data.photoURL || '',
            status: 'approved',
            memberSince: data.memberSince || '',
          };
          batch.set(doc(db, 'publicMembers', item.id), publicRecord, { merge: true });
        });
        await batch.commit();
      }
      const staleRecords = publicSnapshot.docs.filter((item) => !approvedIds.has(item.id));
      for (let offset = 0; offset < staleRecords.length; offset += 450) {
        const batch = writeBatch(db);
        staleRecords.slice(offset, offset + 450).forEach((item) => batch.delete(item.ref));
        await batch.commit();
      }
      showNotice(`Synced ${approved.length} approved record${approved.length === 1 ? '' : 's'} and removed ${staleRecords.length} stale public record${staleRecords.length === 1 ? '' : 's'}.`);
    } catch (error) {
      console.error('Could not sync QR verification records:', error);
      showNotice('Could not sync verification records. Ensure the updated Firestore rules are deployed.', true);
    } finally {
      setIsSyncingPublicRecords(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] pb-12">
      <header className="bg-[#071F25] px-4 py-6 text-white sm:px-6">
        <div className="mx-auto flex max-w-6xl flex-wrap items-center justify-between gap-4">
          <div>
            <span className="inline-flex items-center gap-1.5 rounded-full bg-amber-300 px-2.5 py-1 text-[10px] font-extrabold uppercase tracking-wide text-[#071F25]"><ShieldCheck className="h-3.5 w-3.5" /> Administrator portal</span>
            <h1 className="mt-2 text-2xl font-extrabold">Community operations</h1>
            <p className="mt-1 text-xs text-stone-300">Voting, welfare reports and safe QR verification records.</p>
          </div>
          <div className="flex gap-2">
            <Link to="/admin/registrations" className="rounded-lg border border-white/20 px-3 py-2 text-xs font-bold text-white hover:bg-white/10">Member registry</Link>
            <Link to="/member" className="rounded-lg bg-amber-300 px-3 py-2 text-xs font-bold text-[#071F25] hover:bg-amber-200">Member portal</Link>
          </div>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-4 py-5 sm:px-6 sm:py-7">
        {notice && <div role="status" className={`mb-4 rounded-xl border p-3 text-sm font-semibold ${notice.error ? 'border-rose-200 bg-rose-50 text-rose-900' : 'border-emerald-200 bg-emerald-50 text-emerald-900'}`}>{notice.text}</div>}
        <nav aria-label="Administrator tools" className="mb-5 flex gap-2 overflow-x-auto rounded-2xl border border-stone-200 bg-white p-2 shadow-sm">
          {adminSections.map(({ id, label, icon: Icon }) => (
            <button key={id} type="button" onClick={() => setSection(id)} aria-current={section === id ? 'page' : undefined} className={`inline-flex shrink-0 items-center gap-2 rounded-xl px-4 py-3 text-xs font-bold ${section === id ? 'bg-[#071F25] text-white' : 'text-stone-600 hover:bg-stone-100'}`}>
              <Icon className="h-4 w-4" /> {label}
            </button>
          ))}
        </nav>

        {section === 'ballot' && (
          <div className="grid grid-cols-1 gap-5 lg:grid-cols-[1.1fr_0.9fr]">
            <section className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
              <div className="mb-5 flex items-start gap-3">
                <div className="rounded-xl bg-amber-100 p-2.5 text-amber-900"><Vote className="h-5 w-5" /></div>
                <div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Admin-managed options</p><h2 className="text-lg font-bold text-[#071F25]">Create a cabinet election</h2><p className="mt-1 text-xs leading-relaxed text-stone-600">Each option is one cabinet/candidate group. Publishing a new ballot closes the previous one.</p></div>
              </div>
              <form onSubmit={handleCreateElection} className="space-y-4">
                <TextField label="Ballot title" value={electionTitle} onChange={setElectionTitle} required />
                <label className="block text-xs font-bold text-[#071F25]">Instructions / description
                  <textarea value={electionDescription} onChange={(event) => setElectionDescription(event.target.value)} rows={3} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-3 text-sm font-normal" />
                </label>
                <label className="block text-xs font-bold text-[#071F25]">Cabinet positions and nominees <span className="font-normal text-stone-500">(one position per line; separate nominees with commas)</span>
                  <textarea required value={electionPositions} onChange={(event) => setElectionPositions(event.target.value)} rows={8} placeholder={'President: Ali Khan | PLC-2026-00001 | Welfare experience, Hamza Ahmed | PLC-2026-00002 | Muscat representative'} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-3 text-sm font-normal" />
                  <span className="mt-1 block text-[10px] font-normal text-stone-500">Format: <strong>Position: Nominee | Member ID | Short bio, Nominee 2 | Member ID | Short bio</strong></span>
                </label>
                <label className="block text-xs font-bold text-[#071F25]">Voting closes at
                  <input type="datetime-local" required value={closesAt} onChange={(event) => setClosesAt(event.target.value)} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-3 text-sm font-normal" />
                </label>
                <button type="submit" disabled={isCreatingElection} className="w-full rounded-xl bg-[#071F25] px-4 py-3 text-sm font-bold text-white hover:bg-emerald-900 disabled:opacity-50">{isCreatingElection ? 'Publishing…' : 'Publish ballot to approved members'}</button>
              </form>
            </section>

            <section className="space-y-4">
              <div className="rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
                <h2 className="font-bold text-[#071F25]">Current ballot</h2>
                {!activeElection ? (
                  <p className="mt-3 rounded-xl bg-stone-50 p-4 text-sm text-stone-600">No active ballot is configured.</p>
                ) : (
                  <>
                    <div className="mt-3 rounded-xl bg-stone-50 p-4">
                      <div className="flex items-start justify-between gap-2"><h3 className="font-bold text-[#071F25]">{activeElection.title}</h3><span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${activeElection.status === 'open' ? 'bg-emerald-100 text-emerald-900' : 'bg-stone-200 text-stone-700'}`}>{activeElection.status}</span></div>
                      <p className="mt-1 text-xs text-stone-600">Closes {activeElection.closesAt?.toDate?.().toLocaleString() || 'date unavailable'}</p>
                      <div className="mt-4 space-y-2">
                        {(activeElection.positions || []).map((position) => <div key={position.id} className="space-y-1"><p className="text-xs font-bold uppercase tracking-wide text-emerald-800">{position.title}</p>{position.nominees.map((nominee) => <div key={nominee.id} className="flex items-center justify-between gap-3 rounded-lg border border-stone-200 bg-white px-3 py-2 text-sm"><span>{nominee.name}</span><span className="font-mono font-bold text-emerald-900">{voteTally[`${position.id}:${nominee.id}`] || 0} votes</span></div>)}</div>)}
                      </div>
                      <p className="mt-3 text-xs font-semibold text-stone-500">Total ballots: {Object.values(voteTally).reduce((sum, count) => sum + count, 0)}</p>
                    </div>
                    {activeElection.status === 'open' && <button type="button" onClick={handleCloseElection} disabled={isClosingElection} className="mt-3 w-full rounded-xl border border-rose-200 px-4 py-3 text-xs font-bold text-rose-900 hover:bg-rose-50 disabled:opacity-50">{isClosingElection ? 'Closing…' : 'Close this ballot now'}</button>}
                  </>
                )}
              </div>
              <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">Only approved members can read and vote in the active ballot. The Firestore rules enforce one write per member per election; a submitted vote cannot be changed.</div>
            </section>
          </div>
        )}

        {section === 'reports' && (
          <section>
            <div className="mb-4 rounded-3xl bg-[#071F25] p-5 text-white">
              <p className="text-[10px] font-bold uppercase tracking-wider text-amber-300">Private to admins</p>
              <h2 className="mt-1 text-xl font-extrabold">Community incident reports</h2>
              <p className="mt-1 text-xs text-stone-300">Review sensitive welfare cases and update their progress.</p>
            </div>
            {loadingIncidents ? <div className="rounded-2xl bg-white p-6 text-center text-sm text-stone-600">Loading reports…</div> : incidentRecords.length === 0 ? <div className="rounded-2xl border border-stone-200 bg-white p-6 text-center text-sm text-stone-600">No incident reports have been submitted.</div> : (
              <div className="space-y-3">
                {incidentRecords.map((incident) => (
                  <article key={incident.id} className="rounded-2xl border border-stone-200 bg-white p-4 shadow-sm sm:p-5">
                    <div className="flex flex-wrap items-start justify-between gap-3">
                      <div>
                        <div className="flex flex-wrap items-center gap-2"><h3 className="font-bold text-[#071F25]">{incident.subject}</h3><StatusBadge status={incident.status || 'new'} /></div>
                        <p className="mt-1 text-xs text-stone-500">{incident.memberName} · {incident.memberId || 'Member'} · {incidentDate(incident.createdAt)}</p>
                      </div>
                      <a href={`tel:${incident.memberMobile}`} className="rounded-lg border border-stone-200 px-3 py-2 text-xs font-bold text-emerald-900 hover:bg-emerald-50">Call member: {incident.memberMobile || '—'}</a>
                    </div>
                    <div className="mt-3 grid grid-cols-1 gap-2 text-xs sm:grid-cols-3">
                      <p className="rounded-lg bg-stone-50 p-2"><strong>Type:</strong> {incident.category}</p><p className="rounded-lg bg-stone-50 p-2"><strong>Urgency:</strong> {incident.urgency}</p><p className="rounded-lg bg-stone-50 p-2"><strong>Status:</strong> {incident.status || 'new'}</p>
                    </div>
                    <p className="mt-3 whitespace-pre-wrap rounded-xl border border-stone-100 bg-stone-50 p-3 text-sm leading-relaxed text-stone-700">{incident.details}</p>
                    <div className="mt-3 flex flex-wrap gap-2">
                      {incident.status !== 'reviewing' && incident.status !== 'resolved' && <button type="button" onClick={() => handleIncidentStatus(incident.id, 'reviewing')} className="rounded-lg bg-amber-100 px-3 py-2 text-xs font-bold text-amber-950">Mark reviewing</button>}
                      {incident.status !== 'resolved' && <button type="button" onClick={() => handleIncidentStatus(incident.id, 'resolved')} className="inline-flex items-center gap-1 rounded-lg bg-emerald-800 px-3 py-2 text-xs font-bold text-white"><Check className="h-3.5 w-3.5" /> Mark resolved</button>}
                      {incident.status === 'resolved' && <button type="button" onClick={() => handleIncidentStatus(incident.id, 'reviewing')} className="rounded-lg border border-stone-300 px-3 py-2 text-xs font-bold text-stone-700">Reopen report</button>}
                    </div>
                  </article>
                ))}
              </div>
            )}
          </section>
        )}

        {section === 'verification' && (
          <section className="mx-auto max-w-3xl rounded-3xl border border-stone-200 bg-white p-5 shadow-sm sm:p-7">
            <div className="flex items-start gap-3">
              <div className="rounded-xl bg-emerald-100 p-2.5 text-emerald-900"><ShieldCheck className="h-5 w-5" /></div>
              <div><p className="text-[10px] font-bold uppercase tracking-wider text-emerald-800">Privacy-safe QR lookup</p><h2 className="text-lg font-bold text-[#071F25]">Sync public verification records</h2><p className="mt-2 text-sm leading-relaxed text-stone-600">The QR verifier uses a separate minimal record. It contains the member name, ID, country, location, photo, membership date and active status—never CNIC/passport, email, phone or emergency-contact details.</p></div>
            </div>
            <button type="button" onClick={handleSyncPublicRecords} disabled={isSyncingPublicRecords} className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-xl bg-[#071F25] px-4 py-3 text-sm font-bold text-white disabled:opacity-50"><RefreshCw className={`h-4 w-4 ${isSyncingPublicRecords ? 'animate-spin' : ''}`} />{isSyncingPublicRecords ? 'Syncing…' : 'Sync all approved members'}</button>
            <p className="mt-3 text-xs leading-relaxed text-stone-500">Run this once after deploying the updated Firestore rules to migrate existing approved members. New approvals create their public record automatically.</p>
            <a href="https://console.firebase.google.com/project/pakistan-labour-community/firestore/databases/-default-/rules" target="_blank" rel="noreferrer" className="mt-4 inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-900 underline">Open Firestore rules in Firebase Console <ExternalLink className="h-3 w-3" /></a>
          </section>
        )}
      </main>
      <footer className="mx-auto max-w-6xl px-4 pt-6 text-center text-[11px] text-stone-500 sm:px-6">Signed in as {admin?.fullName || user?.email || 'administrator'} · <Link to="/admin/registrations" className="font-semibold text-emerald-900 underline">Member registration approvals</Link></footer>
    </div>
  );
};

const TextField: React.FC<{ label: string; value: string; onChange: (value: string) => void; required?: boolean }> = ({ label, value, onChange, required = false }) => (
  <label className="block text-xs font-bold text-[#071F25]">{label}<input required={required} value={value} onChange={(event) => onChange(event.target.value)} className="mt-1.5 w-full rounded-xl border border-stone-300 px-3 py-3 text-sm font-normal" /></label>
);

const StatusBadge: React.FC<{ status: IncidentStatus }> = ({ status }) => (
  <span className={`rounded-full px-2 py-1 text-[10px] font-bold uppercase ${status === 'resolved' ? 'bg-emerald-100 text-emerald-900' : status === 'reviewing' ? 'bg-amber-100 text-amber-950' : 'bg-rose-100 text-rose-900'}`}><FileText className="mr-1 inline h-3 w-3" />{status}</span>
);
