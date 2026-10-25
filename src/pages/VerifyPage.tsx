import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import type { PublicMemberProfile } from '../types';
import { PakistanLabourCommunityLogo } from '../lib/logo';
import { FlagPair } from '../lib/flags';
import { AlertCircle, ArrowLeft, CheckCircle2, Clock, MapPin } from 'lucide-react';

export const VerifyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const memberIdParam = searchParams.get('id');
  const uid = searchParams.get('uid');
  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<PublicMemberProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    async function verifyMembership() {
      if (!uid) {
        setError('The verification code is missing its member reference.');
        setLoading(false);
        return;
      }

      try {
        const snapshot = await getDoc(doc(db, 'publicMembers', uid));
        if (!active) return;
        if (!snapshot.exists()) {
          setError('No active public verification record was found. The membership may be inactive or awaiting initial migration. Please contact community administration.');
          return;
        }
        const data = snapshot.data() as PublicMemberProfile;
        if (memberIdParam && data.memberId !== memberIdParam) {
          setError('The membership ID does not match this verification record.');
          return;
        }
        if (data.status !== 'approved') {
          setError('This membership is not currently active.');
          return;
        }
        setMember(data);
      } catch (verificationError) {
        console.error('Public membership verification failed:', verificationError);
        if (active) setError('Verification is temporarily unavailable. Please check the connection and try again.');
      } finally {
        if (active) setLoading(false);
      }
    }

    void verifyMembership();
    return () => { active = false; };
  }, [uid, memberIdParam]);

  return (
    <div className="flex min-h-screen flex-col items-center justify-center bg-[#F9F7F2] px-4 py-10">
      <div className="w-full max-w-md">
        <header className="mb-6 text-center">
          <PakistanLabourCommunityLogo size={68} className="mx-auto mb-3" />
          <div className="mb-2 flex items-center justify-center gap-2"><FlagPair size="md" /><span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">Public membership check</span></div>
          <h1 className="text-xl font-bold text-[#071F25] sm:text-2xl">Credential verification</h1>
        </header>

        <div className="overflow-hidden rounded-3xl border border-stone-200 bg-white shadow-xl">
          {loading ? (
            <div className="space-y-3 p-10 text-center">
              <div className="mx-auto h-10 w-10 animate-spin rounded-full border-4 border-emerald-800 border-t-transparent" />
              <p className="text-sm text-stone-600">Checking the public member record…</p>
            </div>
          ) : error || !member ? (
            <div className="space-y-4 p-8 text-center">
              <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-rose-100 text-rose-700"><AlertCircle className="h-8 w-8" /></div>
              <h2 className="text-lg font-bold text-rose-900">Unable to verify this card</h2>
              <p className="text-sm leading-relaxed text-stone-600">{error || 'This card code could not be verified.'}</p>
              <Link to="/login" className="inline-flex items-center gap-1.5 rounded-xl bg-[#071F25] px-4 py-2.5 text-xs font-bold text-white"><ArrowLeft className="h-4 w-4" /> Member sign in</Link>
            </div>
          ) : (
            <>
              <div className="bg-emerald-900 p-6 text-center text-white">
                <div className="mx-auto mb-2 flex h-12 w-12 items-center justify-center rounded-full bg-white/15"><CheckCircle2 className="h-7 w-7 text-white" /></div>
                <span className="mb-1 block text-[10px] font-bold uppercase tracking-[0.2em] text-amber-300">Community verification</span>
                <h2 className="text-lg font-extrabold">VERIFIED ACTIVE MEMBER</h2>
                <p className="mt-1 font-mono text-xs font-semibold text-emerald-100">Member ID: {member.memberId || memberIdParam || 'N/A'}</p>
              </div>
              <div className="space-y-4 p-6 text-sm">
                <div className="flex items-center gap-4 border-b border-stone-100 pb-4">
                  {member.photoURL ? <img src={member.photoURL} alt={member.fullName} className="h-20 w-16 shrink-0 rounded-xl border-2 border-amber-400 object-cover" /> : <div className="flex h-20 w-16 shrink-0 items-center justify-center rounded-xl bg-stone-100 font-bold text-stone-500">Photo</div>}
                  <div>
                    <span className="block text-[10px] uppercase tracking-wider text-stone-400">Official member name</span>
                    <h3 className="text-base font-bold text-[#071F25]">{member.fullName}</h3>
                    <div className="mt-1 flex items-center gap-1.5 text-xs text-stone-600"><MapPin className="h-3.5 w-3.5 text-emerald-800" />{member.currentLocation || member.country}</div>
                  </div>
                </div>
                <div className="grid grid-cols-2 gap-3 text-xs">
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-3"><span className="block text-[10px] uppercase text-stone-400">Country</span><strong className="mt-1 block text-stone-800">{member.country}</strong></div>
                  <div className="rounded-xl border border-stone-200 bg-stone-50 p-3"><span className="block text-[10px] uppercase text-stone-400">Member since</span><strong className="mt-1 block text-stone-800">{member.memberSince || '—'}</strong></div>
                </div>
                <div className="rounded-xl border border-amber-200 bg-amber-50 p-3 text-xs leading-relaxed text-stone-700"><strong>Privacy note:</strong> This public check confirms active membership only. Contact information and CNIC/passport details are not displayed.</div>
                <div className="pt-1 text-center"><Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-emerald-900 hover:underline"><Clock className="h-3.5 w-3.5" /> Member sign-in portal</Link></div>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};
