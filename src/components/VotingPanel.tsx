import React, { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { Check, Clock, Vote } from 'lucide-react';
import { db } from '../lib/firebase';
import type { CommunityElection, ElectionPosition, MemberProfile } from '../types';

interface VotingPanelProps { member: MemberProfile }

type SelectionMap = Record<string, string>;

export const VotingPanel: React.FC<VotingPanelProps> = ({ member }) => {
  const [election, setElection] = useState<CommunityElection | null>(null);
  const [selection, setSelection] = useState<SelectionMap>({});
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeElection: (() => void) | undefined;
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'portal'), (settings) => {
      unsubscribeElection?.();
      const electionId = settings.exists() ? settings.data().activeElectionId as string | undefined : undefined;
      if (!electionId) { setElection(null); setLoading(false); return; }
      unsubscribeElection = onSnapshot(doc(db, 'elections', electionId), (snapshot) => {
        setElection(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as CommunityElection & { id: string }) : null);
        setLoading(false);
      }, () => { setMessage('The active ballot could not be loaded.'); setLoading(false); });
    }, () => { setMessage('Voting is temporarily unavailable.'); setLoading(false); });
    return () => { unsubscribeSettings(); unsubscribeElection?.(); };
  }, []);

  useEffect(() => {
    if (!election || !('id' in election)) return;
    getDoc(doc(db, 'elections', (election as CommunityElection & { id: string }).id, 'votes', member.uid)).then((snapshot) => {
      if (snapshot.exists()) { setHasVoted(true); setSelection((snapshot.data().selections || {}) as SelectionMap); }
    }).catch(() => undefined);
  }, [election, member.uid]);

  const positions: ElectionPosition[] = election?.positions || [];
  const choose = (positionId: string, nomineeId: string) => setSelection((previous) => ({ ...previous, [positionId]: nomineeId }));

  const submitVote = async () => {
    if (!election || !('id' in election)) return;
    if (positions.some((position) => !selection[position.id])) { setMessage('Please select one nominee for every cabinet position.'); return; }
    setSubmitting(true); setMessage(null);
    try {
      const electionId = (election as CommunityElection & { id: string }).id;
      const voteRef = doc(db, 'elections', electionId, 'votes', member.uid);
      if ((await getDoc(voteRef)).exists()) { setHasVoted(true); setMessage('Your vote has already been recorded.'); return; }
      await setDoc(voteRef, { memberUid: member.uid, selections: selection, submittedAt: serverTimestamp() });
      setHasVoted(true); setMessage('Your vote was submitted successfully and cannot be changed.');
    } catch (error) {
      console.error('Could not submit vote:', error);
      setMessage('Could not submit your vote. Please try again.');
    } finally { setSubmitting(false); }
  };

  if (loading) return <div className="rounded-2xl bg-stone-50 p-5 text-sm text-stone-600">Loading the active ballot…</div>;
  if (!election || !positions.length) return <div className="rounded-2xl bg-stone-50 p-5 text-sm text-stone-600">No cabinet ballot is currently open. The administrator will publish the next voting schedule.</div>;
  const closesAt = election.closesAt?.toDate?.();
  const isClosed = election.status !== 'open' || (closesAt ? closesAt.getTime() <= Date.now() : false);

  return <div className="space-y-5">
    <div className="rounded-2xl bg-amber-50/70 border border-amber-200 p-4">
      <div className="flex items-start justify-between gap-3"><div><h3 className="font-bold text-[#071F25]">{election.title}</h3><p className="mt-1 text-xs text-stone-600">{election.description}</p></div><span className={`inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${isClosed ? 'bg-stone-200 text-stone-700' : 'bg-emerald-100 text-emerald-900'}`}>{isClosed ? 'Closed' : <><Clock className="h-3 w-3" /> Open</>}</span></div>
      {closesAt && <p className="mt-3 text-[11px] font-semibold text-stone-500">Voting closes: {closesAt.toLocaleString()}</p>}
    </div>
    {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">{message}</div>}
    {positions.map((position) => <fieldset key={position.id} className="rounded-2xl border border-stone-200 bg-white p-4"><legend className="px-1 text-sm font-bold text-[#071F25]">{position.title}</legend><div className="mt-2 space-y-2">{position.nominees.map((nominee) => <label key={nominee.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${selection[position.id] === nominee.id ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:bg-stone-50'}`}><input type="radio" name={position.id} checked={selection[position.id] === nominee.id} disabled={hasVoted || isClosed} onChange={() => choose(position.id, nominee.id)} className="mt-1 accent-emerald-700" /><span><span className="block text-sm font-bold text-[#071F25]">{nominee.name}</span>{nominee.memberId && <span className="block text-[10px] font-mono text-emerald-800">{nominee.memberId}</span>}{nominee.bio && <span className="mt-1 block text-xs text-stone-600">{nominee.bio}</span>}</span></label>)}</div></fieldset>)}
    <button type="button" onClick={submitVote} disabled={submitting || hasVoted || isClosed} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#071F25] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">{hasVoted ? <><Check className="h-4 w-4 text-emerald-300" /> Vote recorded</> : submitting ? 'Submitting…' : <><Vote className="h-4 w-4 text-amber-300" /> Submit my cabinet vote</>}</button>
  </div>;
};
