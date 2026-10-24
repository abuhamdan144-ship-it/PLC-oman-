import React, { useEffect, useState } from 'react';
import { useSearchParams, Link } from 'react-router-dom';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../lib/firebase';
import { MemberProfile } from '../types';
import { PakistanLabourCommunityLogo } from '../lib/logo';
import { FlagPair, PakistanFlag, OmanFlag } from '../lib/flags';
import { 
  ShieldCheck, 
  CheckCircle2, 
  AlertCircle, 
  Calendar, 
  MapPin, 
  ArrowLeft,
  Clock
} from 'lucide-react';

export const VerifyPage: React.FC = () => {
  const [searchParams] = useSearchParams();
  const memberId = searchParams.get('id');
  const uid = searchParams.get('uid');

  const [loading, setLoading] = useState(true);
  const [member, setMember] = useState<MemberProfile | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function verifyMembership() {
      if (!uid) {
        setError('Missing member reference parameter.');
        setLoading(false);
        return;
      }

      try {
        const docRef = doc(db, 'members', uid);
        const docSnap = await getDoc(docRef);

        if (docSnap.exists()) {
          const data = docSnap.data() as MemberProfile;
          setMember(data);
        } else {
          setError('No community membership record was found for this code.');
        }
      } catch (err) {
        console.error('Verification error:', err);
        setError('Verification network check timed out.');
      } finally {
        setLoading(false);
      }
    }

    verifyMembership();
  }, [uid]);

  const maskIdNumber = (id?: string) => {
    if (!id) return 'N/A';
    if (id.length > 8) {
      return `${id.substring(0, 5)}-*****-${id.substring(id.length - 2)}`;
    }
    return id.replace(/.(?=.{2})/g, '*');
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-md w-full">
        
        {/* Header Logo (Brand Authorized) */}
        <div className="text-center mb-6">
          <PakistanLabourCommunityLogo size={68} className="mx-auto mb-3" />
          <div className="flex items-center justify-center gap-2 mb-1">
            <FlagPair size="md" />
            <span className="text-xs font-semibold uppercase tracking-wider text-emerald-800">
              Official Membership Verification
            </span>
          </div>
          <h1 className="text-xl sm:text-2xl font-bold font-heading text-[#071F25]">
            Credential Validation Result
          </h1>
        </div>

        {/* Verification Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-stone-200 overflow-hidden">
          {loading ? (
            <div className="p-10 text-center space-y-3">
              <div className="w-10 h-10 border-3 border-[#0D5A31] border-t-transparent rounded-full animate-spin mx-auto" />
              <p className="text-xs font-semibold text-stone-600">
                Checking central community registry...
              </p>
            </div>
          ) : error || !member ? (
            <div className="p-8 text-center space-y-4">
              <div className="w-14 h-14 bg-rose-100 text-rose-600 rounded-full flex items-center justify-center mx-auto">
                <AlertCircle className="w-8 h-8" />
              </div>
              <h2 className="text-lg font-bold text-rose-900">
                Unverified or Inactive Credential
              </h2>
              <p className="text-xs text-stone-600 leading-relaxed">
                {error || 'This card code could not be verified against the active community member database.'}
              </p>
              <div className="pt-2">
                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 px-4 py-2 bg-[#071F25] text-white text-xs font-bold rounded-xl"
                >
                  <ArrowLeft className="w-4 h-4" />
                  <span>Return to Portal</span>
                </Link>
              </div>
            </div>
          ) : (
            <div>
              {/* Status Banner */}
              <div className={`p-6 text-center text-white ${
                member.status === 'approved' ? 'bg-[#0D5A31]' : 'bg-[#071F25]'
              }`}>
                <div className="w-12 h-12 bg-white/20 rounded-full flex items-center justify-center mx-auto mb-2 backdrop-blur-xs">
                  {member.status === 'approved' ? (
                    <CheckCircle2 className="w-7 h-7 text-white" />
                  ) : (
                    <Clock className="w-7 h-7 text-amber-300" />
                  )}
                </div>
                <span className="text-[10px] font-bold uppercase tracking-widest text-amber-300 block mb-1">
                  Community Verification
                </span>
                <h2 className="text-lg font-bold">
                  {member.status === 'approved' ? 'VERIFIED ACTIVE MEMBER' : 'STATUS: UNDER REVIEW'}
                </h2>
                <p className="font-mono text-xs text-emerald-200 mt-1 font-semibold">
                  Member ID: {member.memberId || memberId || 'N/A'}
                </p>
              </div>

              {/* Dossier Information */}
              <div className="p-6 space-y-4 text-xs">
                <div className="flex items-center gap-4 pb-4 border-b border-stone-100">
                  {member.photoURL ? (
                    <img
                      src={member.photoURL}
                      alt={member.fullName}
                      className="w-16 h-20 object-cover rounded-xl border-2 border-amber-400 shrink-0"
                    />
                  ) : (
                    <div className="w-16 h-20 bg-stone-100 rounded-xl border border-stone-200 flex items-center justify-center font-bold text-stone-400 shrink-0">
                      Photo
                    </div>
                  )}
                  <div>
                    <span className="text-[10px] text-stone-400 uppercase tracking-wider block">Official Member Name</span>
                    <h3 className="font-bold text-base text-[#071F25]">{member.fullName}</h3>
                    <div className="flex items-center gap-1.5 mt-1 text-stone-600">
                      <MapPin className="w-3.5 h-3.5 text-[#0D5A31]" />
                      <span>{member.currentLocation || member.country}</span>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-2 gap-3 text-stone-700">
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-[10px] text-stone-400 uppercase block">Affiliation</span>
                    <span className="font-semibold">{member.country}</span>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200">
                    <span className="text-[10px] text-stone-400 uppercase block">Registered Since</span>
                    <span className="font-semibold">{member.memberSince || '2026'}</span>
                  </div>
                  <div className="p-3 bg-stone-50 rounded-xl border border-stone-200 col-span-2">
                    <span className="text-[10px] text-stone-400 uppercase block">National ID / Passport</span>
                    <span className="font-mono font-semibold">{maskIdNumber(member.idNumber)}</span>
                  </div>
                </div>

                <div className="p-3 rounded-xl bg-amber-50/70 border border-amber-200 text-stone-600 leading-relaxed text-[11px]">
                  <strong>Authentication Statement:</strong> This digital record confirms the holder is a registered, vetted member of the Pakistan Labour Community in the Sultanate of Oman.
                </div>

                <div className="pt-2 text-center">
                  <Link
                    to="/login"
                    className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#0D5A31] hover:underline"
                  >
                    <span>Member Sign In Portal</span>
                  </Link>
                </div>
              </div>
            </div>
          )}
        </div>

      </div>
    </div>
  );
};
