import React, { useEffect, useState } from 'react';
import { doc, getDoc, onSnapshot, serverTimestamp, setDoc } from 'firebase/firestore';
import { Check, Clock, Vote, UserRound } from 'lucide-react';
import { db } from '../lib/firebase';
import type { CommunityElection, ElectionOption, MemberProfile } from '../types';

interface VotingPanelProps { member: MemberProfile }
type ElectionRecord = CommunityElection & { id: string };

export const VotingPanel: React.FC<VotingPanelProps> = ({ member }) => {
  const [election, setElection] = useState<ElectionRecord | null>(null);
  const [selectedOptionId, setSelectedOptionId] = useState('');
  const [hasVoted, setHasVoted] = useState(false);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    let unsubscribeElection: (() => void) | undefined;
    const unsubscribeSettings = onSnapshot(doc(db, 'settings', 'portal'), (settings) => {
      unsubscribeElection?.();
      const electionId = settings.exists() ? settings.data().activeElectionId as string | undefined : undefined;
      setHasVoted(false);
      setSelectedOptionId('');
      if (!electionId) {
        setElection(null);
        setLoading(false);
        return;
      }
      setLoading(true);
      unsubscribeElection = onSnapshot(doc(db, 'elections', electionId), (snapshot) => {
        setElection(snapshot.exists() ? ({ id: snapshot.id, ...snapshot.data() } as ElectionRecord) : null);
        setLoading(false);
      }, (error) => {
        console.error('Could not load the active ballot:', error);
        setMessage('The active ballot could not be loaded.');
        setLoading(false);
      });
    }, (error) => {
      console.error('Could not load voting settings:', error);
      setMessage('Voting is temporarily unavailable.');
      setLoading(false);
    });
    return () => { unsubscribeSettings(); unsubscribeElection?.(); };
  }, []);

  useEffect(() => {
    if (!election) return;
    let cancelled = false;
    setHasVoted(false);
    setSelectedOptionId('');
    getDoc(doc(db, 'elections', election.id, 'votes', member.uid)).then((snapshot) => {
      if (cancelled || !snapshot.exists()) return;
      setHasVoted(true);
      setSelectedOptionId((snapshot.data().optionId as string | undefined) || '');
    }).catch((error) => {
      console.warn('Could not check the member vote record:', error);
    });
    return () => { cancelled = true; };
  }, [election, member.uid]);

  const options: ElectionOption[] = election?.options || [];
  const closesAt = election?.closesAt?.toDate?.();
  const isClosed = !election || election.status !== 'open' || (closesAt ? closesAt.getTime() <= Date.now() : false);

  const submitVote = async () => {
    if (!election) return;
    if (!selectedOptionId || !election.optionIds?.includes(selectedOptionId)) {
      setMessage('Select one nominated candidate before submitting your vote.');
      return;
    }
    setSubmitting(true);
    setMessage(null);
    try {
      const voteRef = doc(db, 'elections', election.id, 'votes', member.uid);
      if ((await getDoc(voteRef)).exists()) {
        setHasVoted(true);
        setMessage('Your vote has already been recorded and cannot be changed or resubmitted.');
        return;
      }
      // Firestore rules permit only this create-only shape; update/delete are denied.
      await setDoc(voteRef, {
        memberUid: member.uid,
        optionId: selectedOptionId,
        submittedAt: serverTimestamp(),
      });
      setHasVoted(true);
      setMessage('Your vote was recorded. It cannot be edited or submitted again.');
    } catch (error) {
      console.error('Could not submit vote:', error);
      setMessage('The vote was not accepted. It may already be recorded, or voting may have closed. Refresh and check your status.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="rounded-2xl bg-stone-50 p-5 text-sm text-stone-600">Loading the active ballot…</div>;
  if (!election) return <div className="rounded-2xl bg-stone-50 p-5 text-sm text-stone-600">No ballot is currently open. The administrator will announce the next voting schedule here.</div>;
  if (!options.length) return <div className="rounded-2xl border border-amber-200 bg-amber-50 p-5 text-sm leading-relaxed text-amber-950">This ballot uses an older format and cannot accept votes under the current one-choice Firestore rules. Please ask the administrator to publish the updated ballot format.</div>;

  return <div className="space-y-5">
    <div className="rounded-2xl border border-amber-200 bg-amber-50/70 p-4">
      <div className="flex items-start justify-between gap-3">
        <div>
          <h3 className="font-bold text-[#071F25]">{election.title}</h3>
          {election.postTitle && <p className="mt-1 text-xs font-bold text-emerald-800">Post: {election.postTitle}</p>}
          {election.description && <p className="mt-1 text-xs text-stone-600">{election.description}</p>}
        </div>
        <span className={`inline-flex shrink-0 items-center gap-1 rounded-full px-2 py-1 text-[10px] font-bold ${isClosed ? 'bg-stone-200 text-stone-700' : 'bg-emerald-100 text-emerald-900'}`}>
          {isClosed ? 'Closed' : <><Clock className="h-3 w-3" /> Open</>}
        </span>
      </div>
      {closesAt && <p className="mt-3 text-[11px] font-semibold text-stone-500">Voting closes: {closesAt.toLocaleString()}</p>}
      {election.votingRequirements && <div className="mt-3 rounded-xl border border-amber-200 bg-white/80 p-3"><p className="text-[10px] font-extrabold uppercase tracking-wide text-amber-900">Voting requirements</p><p className="mt-1 whitespace-pre-wrap text-xs leading-relaxed text-stone-700">{election.votingRequirements}</p></div>}
      <p className="mt-3 text-[11px] font-semibold text-stone-600">One approved member, one nominee, one vote. A submitted vote cannot be changed or resubmitted.</p>
    </div>

    {message && <div role="status" className="rounded-xl border border-emerald-200 bg-emerald-50 p-3 text-xs font-semibold text-emerald-900">{message}</div>}

    <fieldset className="rounded-2xl border border-stone-200 bg-white p-4" disabled={hasVoted || isClosed}>
      <legend className="px-1 text-sm font-bold text-[#071F25]">Choose one nominee for {election.postTitle || 'this post'}</legend>
      <div className="mt-2 space-y-2">
        {options.map((option) => (
          <label key={option.id} className={`flex cursor-pointer items-start gap-3 rounded-xl border p-3 transition-colors ${selectedOptionId === option.id ? 'border-emerald-500 bg-emerald-50' : 'border-stone-200 hover:bg-stone-50'} ${hasVoted || isClosed ? 'cursor-not-allowed' : ''}`}>
            <input type="radio" name={`election-${election.id}`} value={option.id} checked={selectedOptionId === option.id} disabled={hasVoted || isClosed} onChange={() => setSelectedOptionId(option.id)} className="mt-1 accent-emerald-700" />
            {option.photoURL ? (
              <img src={option.photoURL} alt={`Photo of ${option.label}`} className="h-16 w-16 shrink-0 rounded-xl border border-stone-200 object-cover" />
            ) : (
              <div className="flex h-16 w-16 shrink-0 items-center justify-center rounded-xl bg-stone-100 text-stone-500"><UserRound className="h-7 w-7" /></div>
            )}
            <span className="min-w-0 flex-1">
              <span className="block text-sm font-bold text-[#071F25]">{option.label}</span>
              {option.memberId && <span className="mt-0.5 block text-[10px] font-mono text-emerald-800">{option.memberId}</span>}
              {option.bio && <span className="mt-1 block whitespace-pre-wrap text-xs leading-relaxed text-stone-600">{option.bio}</span>}
            </span>
            {selectedOptionId === option.id && <Check className="mt-1 h-4 w-4 shrink-0 text-emerald-700" />}
          </label>
        ))}
      </div>
    </fieldset>

    <button type="button" onClick={submitVote} disabled={submitting || hasVoted || isClosed} className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-[#071F25] px-4 py-3 text-sm font-bold text-white disabled:cursor-not-allowed disabled:opacity-50">
      {hasVoted ? <><Check className="h-4 w-4 text-emerald-300" /> Vote recorded — locked</> : submitting ? 'Submitting…' : <><Vote className="h-4 w-4 text-amber-300" /> Submit my one vote</>}
    </button>
  </div>;
};
