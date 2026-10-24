import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { doc, setDoc } from 'firebase/firestore';
import { ref, uploadBytes, getDownloadURL } from 'firebase/storage';
import { auth, db, storage } from '../lib/firebase';
import { PakistanLabourCommunityLogo } from '../lib/logo';
import { FlagPair } from '../lib/flags';
import { compressImage } from '../lib/imageCompressor';
import { MemberCountry } from '../types';
import { SAMPLE_MEMBER_PENDING } from '../lib/seed';
import { TermsModal } from '../components/TermsModal';
import { 
  User, 
  Mail, 
  Phone, 
  Lock, 
  MapPin, 
  FileCheck, 
  Camera, 
  Upload, 
  AlertCircle, 
  CheckCircle2, 
  ArrowRight,
  Shield,
  HelpCircle,
  Copy,
  ExternalLink,
  Check
} from 'lucide-react';

interface RegistrationErrorState {
  code?: string;
  title: string;
  message: string;
  actionType?: 'enable_email_auth' | 'authorize_domain' | 'rules_permission' | 'general';
}

export const RegisterPage: React.FC = () => {
  const navigate = useNavigate();

  // Form Fields
  const [fullName, setFullName] = useState('');
  const [email, setEmail] = useState('');
  const [mobile, setMobile] = useState('');
  const [country, setCountry] = useState<MemberCountry>('Oman');
  const [currentLocation, setCurrentLocation] = useState('');
  const [idNumber, setIdNumber] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [emergencyName, setEmergencyName] = useState('');
  const [emergencyPhone, setEmergencyPhone] = useState('');
  const [acceptTerms, setAcceptTerms] = useState(false);
  const [showTermsModal, setShowTermsModal] = useState(false);
  const [photoFile, setPhotoFile] = useState<File | null>(null);
  const [photoPreview, setPhotoPreview] = useState<string | null>(null);

  // States
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submitError, setSubmitError] = useState<RegistrationErrorState | null>(null);
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});
  const [copiedDomain, setCopiedDomain] = useState(false);

  const handlePhotoSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      const file = e.target.files[0];
      if (!file.type.startsWith('image/')) {
        setFieldErrors(prev => ({ ...prev, photo: 'Please select a valid image file (JPG, PNG, WebP).' }));
        return;
      }
      setFieldErrors(prev => {
        const copy = { ...prev };
        delete copy.photo;
        return copy;
      });
      setPhotoFile(file);
      const url = URL.createObjectURL(file);
      setPhotoPreview(url);
    }
  };

  const handleFillDemo = () => {
    setFullName(SAMPLE_MEMBER_PENDING.fullName);
    setEmail(`bilal.sample_${Math.floor(1000 + Math.random() * 9000)}@example.com`);
    setMobile(SAMPLE_MEMBER_PENDING.mobile);
    setCountry(SAMPLE_MEMBER_PENDING.country);
    setCurrentLocation(SAMPLE_MEMBER_PENDING.currentLocation);
    setIdNumber(SAMPLE_MEMBER_PENDING.idNumber);
    setPassword('Pakistan2026!');
    setConfirmPassword('Pakistan2026!');
    setEmergencyName(SAMPLE_MEMBER_PENDING.emergencyContact.name);
    setEmergencyPhone(SAMPLE_MEMBER_PENDING.emergencyContact.phone);
    setAcceptTerms(true);
    setFieldErrors({});
  };

  const validate = (): boolean => {
    const errors: Record<string, string> = {};

    if (!fullName.trim() || fullName.trim().length < 3) {
      errors.fullName = 'Please enter your full official name (as on CNIC/Passport).';
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!email.trim() || !emailRegex.test(email.trim())) {
      errors.email = 'Please enter a valid email address.';
    }

    if (!mobile.trim() || mobile.trim().length < 7) {
      errors.mobile = 'Please enter a valid contact phone number with country code.';
    }

    if (!currentLocation.trim()) {
      errors.currentLocation = 'Please provide your current city or district (e.g. Muscat, Sohar, Lahore).';
    }

    if (!idNumber.trim() || idNumber.trim().length < 6) {
      errors.idNumber = 'Please enter your CNIC or Passport number for verification.';
    }

    if (!password || password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.';
    }

    if (password !== confirmPassword) {
      errors.confirmPassword = 'Passwords do not match.';
    }

    if (!acceptTerms) {
      errors.acceptTerms = 'You must confirm your details and agree to community guidelines.';
    }

    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitError(null);

    if (!validate()) {
      return;
    }

    setIsSubmitting(true);

    try {
      // 1. Create Firebase Auth user
      const userCredential = await createUserWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // 2. Upload photo if selected (compress client-side to < 500 KB first)
      let photoURL = '';
      if (photoFile) {
        try {
          const compressedBlob = await compressImage(photoFile, 400 * 1024, 800);
          const storageRef = ref(storage, `profile-photos/${user.uid}/profile_${Date.now()}.jpg`);
          const uploadResult = await uploadBytes(storageRef, compressedBlob, {
            contentType: 'image/jpeg',
          });
          photoURL = await getDownloadURL(uploadResult.ref);
        } catch (photoErr) {
          console.warn('Photo upload warning (continuing registration without photo):', photoErr);
        }
      }

      // 3. Create members/{uid} document with status "pending" and role "member"
      const memberDocRef = doc(db, 'members', user.uid);
      const nowIso = new Date().toISOString();

      await setDoc(memberDocRef, {
        fullName: fullName.trim(),
        email: email.trim().toLowerCase(),
        mobile: mobile.trim(),
        country,
        currentLocation: currentLocation.trim(),
        idNumber: idNumber.trim(),
        photoURL: photoURL || '',
        status: 'pending',
        adminNote: '',
        registeredAt: nowIso,
        emergencyContact: {
          name: emergencyName.trim() || 'Next of kin',
          phone: emergencyPhone.trim() || mobile.trim(),
          relation: 'Family'
        },
        role: 'member'
      });

      // 4. Redirect to /pending-approval
      navigate('/pending-approval');

    } catch (err: unknown) {
      console.error('Registration failed:', err);
      
      let errorObj: RegistrationErrorState = {
        title: 'Unable to Complete Registration',
        message: 'A network or unexpected error occurred. Please verify your connection and try again.',
        actionType: 'general'
      };

      if (typeof err === 'object' && err !== null) {
        const error = err as { code?: string; message?: string };
        const code = error.code || '';
        errorObj.code = code;

        if (code === 'auth/operation-not-allowed') {
          errorObj = {
            code,
            title: 'Firebase Email/Password Sign-In Disabled',
            message: 'Email & Password authentication has not been enabled yet in the Firebase Console for project "pakistan-labour-community".',
            actionType: 'enable_email_auth'
          };
        } else if (code === 'auth/unauthorized-domain') {
          errorObj = {
            code,
            title: 'Domain Not Authorized in Firebase',
            message: 'This web preview domain has not been added to your Firebase project authorized domains list.',
            actionType: 'authorize_domain'
          };
        } else if (code === 'auth/email-already-in-use') {
          errorObj = {
            code,
            title: 'Email Address Already Registered',
            message: 'An account with this email already exists. Please sign in or use password reset.',
            actionType: 'general'
          };
        } else if (code === 'auth/invalid-email') {
          errorObj = {
            code,
            title: 'Invalid Email Address',
            message: 'The email address format is invalid. Please check for typographical errors.',
            actionType: 'general'
          };
        } else if (code === 'auth/weak-password') {
          errorObj = {
            code,
            title: 'Weak Password',
            message: 'Password must be at least 8 characters long.',
            actionType: 'general'
          };
        } else if (code === 'auth/network-request-failed') {
          errorObj = {
            code,
            title: 'Network Connection Issue',
            message: 'Could not connect to Firebase Authentication. Check your internet connection or browser security extensions.',
            actionType: 'general'
          };
        } else if (code.includes('permission-denied') || (error.message && error.message.includes('permission-denied'))) {
          errorObj = {
            code,
            title: 'Firestore Permission Denied',
            message: 'Firestore security rules blocked saving the member record. Please deploy the included firestore.rules to allow pending members.',
            actionType: 'rules_permission'
          };
        } else {
          errorObj = {
            code,
            title: 'Firebase Registration Error',
            message: error.message || 'Firebase rejected the request.',
            actionType: 'general'
          };
        }
      }

      setSubmitError(errorObj);
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleCopyCurrentDomain = () => {
    if (typeof window !== 'undefined') {
      navigator.clipboard.writeText(window.location.hostname);
      setCopiedDomain(true);
      setTimeout(() => setCopiedDomain(false), 2500);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-2xl mx-auto w-full">
        
        {/* Header Branding Area (Authorized Logo usage) */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <PakistanLabourCommunityLogo size={72} />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <FlagPair size="md" />
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-800">
              Oman & Pakistan • ممبر رجسٹریشن
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#071F25] font-heading tracking-tight">
            Join Pakistan Labour Community
          </h1>
          <p className="mt-2 text-sm sm:text-base text-stone-600 max-w-lg mx-auto">
            Register once. Stay connected. Access support built around our community.
          </p>
        </div>

        {/* Registration Card Form */}
        <div className="bg-white rounded-2xl shadow-xl border border-stone-200/80 p-6 sm:p-10">
          
          {submitError && (
            <div 
              role="alert"
              className="mb-6 p-4 rounded-xl bg-amber-50/90 border border-amber-300 text-stone-900 text-xs sm:text-sm flex flex-col gap-2.5 animate-in fade-in"
            >
              <div className="flex items-start gap-3">
                <AlertCircle className="w-5 h-5 text-amber-700 shrink-0 mt-0.5" />
                <div className="flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-bold text-base text-[#071F25]">{submitError.title}</p>
                    {submitError.code && (
                      <span className="font-mono text-[10px] bg-amber-200/80 text-amber-950 px-2 py-0.5 rounded font-semibold shrink-0">
                        {submitError.code}
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-stone-700 mt-1 leading-relaxed">{submitError.message}</p>
                </div>
              </div>

              {/* Step-by-Step Instructions for Firebase Console Setup */}
              {submitError.actionType === 'enable_email_auth' && (
                <div className="mt-2 p-3.5 bg-white rounded-xl border border-amber-300/80 text-xs text-stone-700 space-y-2.5">
                  <p className="font-bold text-emerald-950 flex items-center gap-1.5">
                    <span>How to enable in Firebase Console (30 seconds):</span>
                  </p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-stone-600 text-[11px] leading-relaxed">
                    <li>
                      Open your Firebase project{' '}
                      <a 
                        href="https://console.firebase.google.com/project/pakistan-labour-community/authentication/providers" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="font-bold text-[#0D5A31] underline inline-flex items-center gap-0.5"
                      >
                        <span>Authentication Sign-in method</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>.
                    </li>
                    <li>Click on <strong>Email/Password</strong> under the Native providers list.</li>
                    <li>Toggle the <strong>Enable</strong> switch to ON (leave Email link off) and click <strong>Save</strong>.</li>
                    <li>Return to this page and click <strong>Submit Community Registration</strong> again.</li>
                  </ol>
                  <div className="pt-1">
                    <a
                      href="https://console.firebase.google.com/project/pakistan-labour-community/authentication/providers"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-[#0D5A31] text-white font-bold rounded-lg text-xs hover:bg-[#094224] transition-colors"
                    >
                      <span>Open Firebase Auth Providers</span>
                      <ExternalLink className="w-3.5 h-3.5" />
                    </a>
                  </div>
                </div>
              )}

              {submitError.actionType === 'authorize_domain' && (
                <div className="mt-2 p-3.5 bg-white rounded-xl border border-amber-300/80 text-xs text-stone-700 space-y-2.5">
                  <p className="font-bold text-stone-900">Add preview domain to Authorized Domains:</p>
                  <ol className="list-decimal pl-4 space-y-1.5 text-stone-600 text-[11px]">
                    <li>
                      Open{' '}
                      <a 
                        href="https://console.firebase.google.com/project/pakistan-labour-community/authentication/settings" 
                        target="_blank" 
                        rel="noopener noreferrer" 
                        className="font-bold text-[#0D5A31] underline inline-flex items-center gap-0.5"
                      >
                        <span>Firebase Authentication Settings</span>
                        <ExternalLink className="w-3 h-3" />
                      </a>.
                    </li>
                    <li>Scroll down to the <strong>Authorized domains</strong> section and click <strong>Add domain</strong>.</li>
                    <li>Paste your current domain:</li>
                  </ol>
                  <div className="flex items-center gap-2">
                    <code className="bg-stone-100 px-2 py-1 rounded text-xs font-mono font-bold text-emerald-900 flex-1 truncate">
                      {typeof window !== 'undefined' ? window.location.hostname : 'current-domain'}
                    </code>
                    <button
                      type="button"
                      onClick={handleCopyCurrentDomain}
                      className="inline-flex items-center gap-1 px-2.5 py-1 bg-stone-200 hover:bg-stone-300 text-stone-800 text-xs font-semibold rounded-lg shrink-0"
                    >
                      {copiedDomain ? <Check className="w-3.5 h-3.5 text-emerald-700" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedDomain ? 'Copied' : 'Copy'}</span>
                    </button>
                  </div>
                </div>
              )}

              {submitError.actionType === 'rules_permission' && (
                <div className="mt-2 p-3.5 bg-white rounded-xl border border-amber-300/80 text-xs text-stone-700 space-y-1.5">
                  <p className="font-bold text-stone-900">Firestore Rules Notice:</p>
                  <p className="text-[11px] text-stone-600">
                    Deploy the repository's <code>firestore.rules</code> file to Firebase or check your Firestore rules in the Firebase console.
                  </p>
                </div>
              )}

              {submitError.title.includes('Already Registered') && (
                <div className="pt-1">
                  <Link to="/login" className="text-xs font-bold text-[#0D5A31] hover:underline">
                    Go to Sign In →
                  </Link>
                </div>
              )}
            </div>
          )}

          <form onSubmit={handleSubmit} noValidate className="space-y-6">
            
            {/* Step Notice */}
            <div className="bg-emerald-50/70 border border-emerald-200/80 rounded-xl p-3.5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
              <div className="flex items-start gap-3">
                <Shield className="w-5 h-5 text-[#0D5A31] shrink-0 mt-0.5" />
                <div className="text-xs text-stone-700 leading-relaxed">
                  <span className="font-bold text-[#0D5A31]">Civic Verification Notice:</span> Your submission will be carefully reviewed by a community administrator. Approved members receive an official digital membership card.
                </div>
              </div>
              <button
                type="button"
                onClick={handleFillDemo}
                className="shrink-0 px-2.5 py-1 text-[11px] font-bold text-[#0D5A31] bg-white hover:bg-emerald-100 border border-emerald-300 rounded-lg transition-colors whitespace-nowrap"
                title="Fill sample applicant details for quick testing"
              >
                ⚡ Prefill Sample Details
              </button>
            </div>

            {/* Profile Photo Upload (Optional, with client-side compression) */}
            <div className="flex flex-col sm:flex-row items-center gap-5 p-4 rounded-xl bg-stone-50 border border-stone-200">
              <div className="relative">
                {photoPreview ? (
                  <img
                    src={photoPreview}
                    alt="Selected preview"
                    className="w-20 h-24 object-cover rounded-xl border-2 border-[#E4AE2F] shadow-sm"
                  />
                ) : (
                  <div className="w-20 h-24 rounded-xl bg-stone-200 border-2 border-dashed border-stone-300 flex flex-col items-center justify-center text-stone-500">
                    <Camera className="w-6 h-6 mb-1" />
                    <span className="text-[10px] font-medium">Photo</span>
                  </div>
                )}
              </div>

              <div className="flex-1 text-center sm:text-left">
                <label className="block text-xs font-bold text-[#071F25] mb-1">
                  Member Photo (Optional for Membership Card)
                </label>
                <p className="text-[11px] text-stone-500 mb-2 leading-relaxed">
                  Clear front-facing passport style photo. Automatically compressed to under 500 KB.
                </p>
                <label className="inline-flex items-center gap-1.5 px-3 py-1.5 bg-white hover:bg-stone-100 text-stone-700 border border-stone-300 rounded-lg text-xs font-semibold cursor-pointer shadow-xs transition-colors">
                  <Upload className="w-3.5 h-3.5 text-stone-500" />
                  <span>{photoPreview ? 'Change Photo' : 'Upload Photo'}</span>
                  <input
                    type="file"
                    accept="image/*"
                    onChange={handlePhotoSelect}
                    className="sr-only"
                  />
                </label>
                {fieldErrors.photo && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.photo}</p>
                )}
              </div>
            </div>

            {/* Section 1: Personal Details */}
            <div className="space-y-4">
              <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider pb-1 border-b border-stone-200">
                1. Personal & Contact Information
              </h2>

              {/* Full Name */}
              <div>
                <label htmlFor="fullName" className="block text-xs font-bold text-[#071F25] mb-1">
                  Full Name <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <User className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="fullName"
                    type="text"
                    required
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="e.g. Muhammad Tariq Khan"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm text-[#071F25] placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#0D5A31] transition-colors ${
                      fieldErrors.fullName ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                    }`}
                  />
                </div>
                {fieldErrors.fullName && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.fullName}</p>
                )}
              </div>

              {/* Email & Mobile */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="email" className="block text-xs font-bold text-[#071F25] mb-1">
                    Email Address <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      id="email"
                      type="email"
                      required
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="name@example.com"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm text-[#071F25] placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#0D5A31] transition-colors ${
                        fieldErrors.email ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                      }`}
                    />
                  </div>
                  {fieldErrors.email && (
                    <p className="text-xs text-rose-600 mt-1">{fieldErrors.email}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="mobile" className="block text-xs font-bold text-[#071F25] mb-1">
                    Mobile Number <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Phone className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      id="mobile"
                      type="tel"
                      required
                      value={mobile}
                      onChange={(e) => setMobile(e.target.value)}
                      placeholder="+968 9123 4567 or +92 300..."
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm text-[#071F25] placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#0D5A31] transition-colors ${
                        fieldErrors.mobile ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                      }`}
                    />
                  </div>
                  {fieldErrors.mobile && (
                    <p className="text-xs text-rose-600 mt-1">{fieldErrors.mobile}</p>
                  )}
                </div>
              </div>

              {/* Country & Current Location */}
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="country" className="block text-xs font-bold text-[#071F25] mb-1">
                    Current Country of Stay <span className="text-rose-500">*</span>
                  </label>
                  <select
                    id="country"
                    value={country}
                    onChange={(e) => setCountry(e.target.value as MemberCountry)}
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm text-[#071F25] bg-white focus:outline-hidden focus:ring-2 focus:ring-[#0D5A31]"
                  >
                    <option value="Oman">Sultanate of Oman (عُمان)</option>
                    <option value="Pakistan">Pakistan (پاکستان)</option>
                  </select>
                </div>

                <div>
                  <label htmlFor="currentLocation" className="block text-xs font-bold text-[#071F25] mb-1">
                    City / Wilayat / District <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <MapPin className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      id="currentLocation"
                      type="text"
                      required
                      value={currentLocation}
                      onChange={(e) => setCurrentLocation(e.target.value)}
                      placeholder={country === 'Oman' ? 'e.g. Ruwi, Muscat or Sohar' : 'e.g. Lahore, Rawalpindi'}
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm text-[#071F25] placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#0D5A31] transition-colors ${
                        fieldErrors.currentLocation ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                      }`}
                    />
                  </div>
                  {fieldErrors.currentLocation && (
                    <p className="text-xs text-rose-600 mt-1">{fieldErrors.currentLocation}</p>
                  )}
                </div>
              </div>

              {/* CNIC or Passport Number */}
              <div>
                <label htmlFor="idNumber" className="block text-xs font-bold text-[#071F25] mb-1">
                  CNIC or Passport Number <span className="text-rose-500">*</span>
                </label>
                <div className="relative">
                  <FileCheck className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                  <input
                    id="idNumber"
                    type="text"
                    required
                    value={idNumber}
                    onChange={(e) => setIdNumber(e.target.value)}
                    placeholder="e.g. 37405-1234567-9 or Passport # AB1234567"
                    className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm text-[#071F25] placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#0D5A31] transition-colors ${
                      fieldErrors.idNumber ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                    }`}
                  />
                </div>
                <p className="text-[11px] text-stone-500 mt-1">
                  Used exclusively for authentic community verification and printed partially masked on your card.
                </p>
                {fieldErrors.idNumber && (
                  <p className="text-xs text-rose-600 mt-1">{fieldErrors.idNumber}</p>
                )}
              </div>
            </div>

            {/* Section 2: Emergency Contact */}
            <div className="space-y-4 pt-2">
              <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider pb-1 border-b border-stone-200">
                2. Emergency Contact / Next of Kin
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="emergencyName" className="block text-xs font-bold text-[#071F25] mb-1">
                    Contact Name & Relation
                  </label>
                  <input
                    id="emergencyName"
                    type="text"
                    value={emergencyName}
                    onChange={(e) => setEmergencyName(e.target.value)}
                    placeholder="e.g. Shahid Khan (Brother)"
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm text-[#071F25] placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#0D5A31]"
                  />
                </div>

                <div>
                  <label htmlFor="emergencyPhone" className="block text-xs font-bold text-[#071F25] mb-1">
                    Emergency Phone Number
                  </label>
                  <input
                    id="emergencyPhone"
                    type="tel"
                    value={emergencyPhone}
                    onChange={(e) => setEmergencyPhone(e.target.value)}
                    placeholder="e.g. +92 300 1234567 or +968..."
                    className="w-full px-3 py-2.5 rounded-xl border border-stone-300 text-sm text-[#071F25] placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#0D5A31]"
                  />
                </div>
              </div>
            </div>

            {/* Section 3: Security & Passwords */}
            <div className="space-y-4 pt-2">
              <h2 className="text-xs font-bold text-stone-500 uppercase tracking-wider pb-1 border-b border-stone-200">
                3. Security & Password
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label htmlFor="password" className="block text-xs font-bold text-[#071F25] mb-1">
                    Portal Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      id="password"
                      type="password"
                      required
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Minimum 8 characters"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm text-[#071F25] placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#0D5A31] transition-colors ${
                        fieldErrors.password ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                      }`}
                    />
                  </div>
                  {fieldErrors.password && (
                    <p className="text-xs text-rose-600 mt-1">{fieldErrors.password}</p>
                  )}
                </div>

                <div>
                  <label htmlFor="confirmPassword" className="block text-xs font-bold text-[#071F25] mb-1">
                    Confirm Password <span className="text-rose-500">*</span>
                  </label>
                  <div className="relative">
                    <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                    <input
                      id="confirmPassword"
                      type="password"
                      required
                      value={confirmPassword}
                      onChange={(e) => setConfirmPassword(e.target.value)}
                      placeholder="Repeat password"
                      className={`w-full pl-9 pr-3 py-2.5 rounded-xl border text-sm text-[#071F25] placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#0D5A31] transition-colors ${
                        fieldErrors.confirmPassword ? 'border-rose-400 bg-rose-50/20' : 'border-stone-300'
                      }`}
                    />
                  </div>
                  {fieldErrors.confirmPassword && (
                    <p className="text-xs text-rose-600 mt-1">{fieldErrors.confirmPassword}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Official Urdu Community Charter & Terms Box */}
            <div className="pt-2 space-y-3">
              <div className="p-4 rounded-2xl bg-amber-50/90 border border-amber-300 text-stone-800 space-y-3">
                <div className="flex items-start justify-between gap-2" dir="rtl">
                  <div>
                    <h3 className="text-xs sm:text-sm font-bold text-[#071F25] font-serif">
                      پاکستان کمیونٹی عمان — اہم وضاحت و ضوابط
                    </h3>
                    <p className="text-[11px] text-amber-800 font-semibold mt-0.5">
                      کمیونٹی کا اصل مقصد بڑے حادثات اور غیر معمولی مشکل حالات میں باہمی مالی تعاون ہے۔
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="shrink-0 px-3 py-1 bg-[#0D5A31] hover:bg-[#094224] text-white text-[11px] font-bold rounded-lg shadow-xs transition-colors"
                  >
                    مکمل ضوابط پڑھیں
                  </button>
                </div>

                {/* Quick Urdu Bullet Summary */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 text-xs" dir="rtl">
                  <div className="bg-white/80 p-2.5 rounded-xl border border-emerald-200 text-emerald-950 font-medium">
                    <span className="font-bold block text-emerald-900">وفات کی صورت میں:</span>
                    <span>میت کی پاکستان واپسی کا ہوائی ٹکٹ + 2,000 عمانی ریال (2,000 OMR)</span>
                  </div>
                  <div className="bg-white/80 p-2.5 rounded-xl border border-amber-200 text-amber-950 font-medium">
                    <span className="font-bold block text-amber-900">شدید حادثہ / بڑی بیماری:</span>
                    <span>کمر یا گردن ٹوٹنا، ہارٹ اٹیک: 1,000 عمانی ریال (1,000 OMR)</span>
                  </div>
                </div>

                {/* Registration Mandatory Requirement Banner */}
                <div className="p-2.5 rounded-xl bg-rose-100/80 border border-rose-300 text-rose-950 text-xs font-bold flex items-center gap-2" dir="rtl">
                  <span className="px-2 py-0.5 rounded-md bg-rose-800 text-white text-[10px] shrink-0">اہم شرط</span>
                  <span>یہ سب سہولیات صرف کمونٹی کے ساتھ داحلہ یا رجسٹریشن کیا ہو اس ممبر کو میسر ہوگی۔</span>
                </div>

                <div className="flex items-center justify-between text-[11px] text-stone-600 border-t border-amber-200/60 pt-2">
                  <div className="flex items-center gap-1.5 text-stone-700">
                    <span className="font-bold text-[#071F25]">تنظیم اکاؤنٹ نمبر:</span>
                    <span className="font-mono font-bold text-emerald-800 bg-white px-2 py-0.5 rounded-md border border-stone-200">96766876</span>
                  </div>
                  <button
                    type="button"
                    onClick={() => setShowTermsModal(true)}
                    className="text-[#0D5A31] hover:underline font-bold"
                  >
                    تفصیل دیکھیں (View Charter) &rarr;
                  </button>
                </div>
              </div>

              {/* Terms and Privacy Checkbox */}
              <label className="flex items-start gap-3 cursor-pointer select-none">
                <input
                  type="checkbox"
                  checked={acceptTerms}
                  onChange={(e) => setAcceptTerms(e.target.checked)}
                  className="mt-1 h-4 w-4 rounded-sm border-stone-300 text-[#0D5A31] focus:ring-[#0D5A31]"
                />
                <span className="text-xs text-stone-600 leading-normal">
                  میں حلفیہ اقرار کرتا ہوں کہ فراہم کردہ تمام معلومات درست ہیں۔ میں نے پاکستان کمیونٹی عمان کی تمام شرائط و ضوابط پڑھ لی ہیں اور تصدیق کرتا ہوں کہ <strong>یہ سب سہولیات صرف کمونٹی کے ساتھ داحلہ یا رجسٹریشن کیا ہو اس ممبر کو میسر ہوگی</strong> (وفات/شدید حادثہ پر طے شدہ امداد، ویزا یا ارباب کے ذاتی تنازعات میں عدم شمولیت، اور اکاؤنٹ نمبر 96766876 پر فنڈ میں تعاون)۔
                  <br />
                  <span className="text-[11px] text-stone-500">
                    (I acknowledge that all welfare benefits are strictly reserved for registered members of the community, and agree to the Charter and Omani laws.)
                  </span>
                </span>
              </label>
              {fieldErrors.acceptTerms && (
                <p className="text-xs text-rose-600 mt-1 pl-7">{fieldErrors.acceptTerms}</p>
              )}
            </div>

            {/* Submit Button */}
            <div className="pt-4">
              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full flex items-center justify-center gap-2 py-3.5 px-6 rounded-xl font-bold text-sm bg-[#0D5A31] hover:bg-[#094224] text-white shadow-md hover:shadow-lg transition-all disabled:opacity-60 disabled:cursor-not-allowed focus:outline-hidden focus:ring-2 focus:ring-offset-2 focus:ring-[#0D5A31]"
              >
                {isSubmitting ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Submitting Registration for Admin Review...</span>
                  </>
                ) : (
                  <>
                    <span>Submit Community Registration</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>
            </div>

          </form>

          {/* Already registered link */}
          <div className="mt-8 pt-6 border-t border-stone-200 text-center">
            <p className="text-xs sm:text-sm text-stone-600">
              Already registered?{' '}
              <Link 
                to="/login" 
                className="font-bold text-[#0D5A31] hover:text-[#071F25] underline focus:outline-hidden focus:ring-1 focus:ring-[#0D5A31] rounded-xs"
              >
                Sign in to your member portal
              </Link>
            </p>
          </div>

        </div>

      </div>

      {/* Community Charter Modal */}
      <TermsModal isOpen={showTermsModal} onClose={() => setShowTermsModal(false)} />
    </div>
  );
};
