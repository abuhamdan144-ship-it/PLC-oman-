import React, { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  createUserWithEmailAndPassword 
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { useAuth } from '../hooks/useAuth';
import { PakistanLabourCommunityLogo } from '../lib/logo';
import { FlagPair } from '../lib/flags';
import { 
  Mail, 
  Lock, 
  ArrowRight, 
  AlertCircle, 
  CheckCircle2, 
  KeyRound, 
  X,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const { loginAsMasterAdmin } = useAuth();

  const [email, setEmail] = useState('PLC@community.com');
  const [password, setPassword] = useState('11223344');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    if (!email.trim() || !password) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    const cleanEmail = email.trim().toLowerCase();
    const isMasterAdmin = cleanEmail === 'plc@community.com' && password === '11223344';

    // Instant seamless login for master admin credentials
    if (isMasterAdmin) {
      loginAsMasterAdmin();

      // Also ensure synchronized in Firebase if available
      try {
        const cred = await signInWithEmailAndPassword(auth, 'plc@community.com', '11223344');
        const ref = doc(db, 'members', cred.user.uid);
        await setDoc(ref, {
          fullName: 'Community Executive Administrator (PLC)',
          email: 'plc@community.com',
          mobile: '+968 2469 6991',
          country: 'Oman',
          currentLocation: 'Muscat, Sultanate of Oman',
          idNumber: 'ADMIN-PLC-001',
          status: 'approved',
          role: 'admin',
          memberId: 'PLC-2026-ADMIN',
          memberSince: 'January 2026',
          registeredAt: new Date().toISOString(),
          approvedAt: new Date().toISOString(),
          emergencyContact: {
            name: 'Embassy Welfare Wing',
            phone: '+968 2469 6991',
            relation: 'Official'
          }
        }, { merge: true });
      } catch (err: unknown) {
        const c = typeof err === 'object' && err !== null && 'code' in err ? (err as { code: string }).code : '';
        if (c === 'auth/user-not-found' || c === 'auth/invalid-credential') {
          try {
            const newCred = await createUserWithEmailAndPassword(auth, 'plc@community.com', '11223344');
            await setDoc(doc(db, 'members', newCred.user.uid), {
              fullName: 'Community Executive Administrator (PLC)',
              email: 'plc@community.com',
              mobile: '+968 2469 6991',
              country: 'Oman',
              currentLocation: 'Muscat, Sultanate of Oman',
              idNumber: 'ADMIN-PLC-001',
              status: 'approved',
              role: 'admin',
              memberId: 'PLC-2026-ADMIN',
              memberSince: 'January 2026',
              registeredAt: new Date().toISOString(),
              approvedAt: new Date().toISOString(),
              emergencyContact: {
                name: 'Embassy Welfare Wing',
                phone: '+968 2469 6991',
                relation: 'Official'
              }
            });
          } catch {
            // Background sync note
          }
        }
      }

      navigate('/admin/registrations');
      return;
    }

    try {
      const userCredential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const user = userCredential.user;

      // Check member profile document
      const memberDocSnap = await getDoc(doc(db, 'members', user.uid));
      
      if (memberDocSnap.exists()) {
        const memberData = memberDocSnap.data();
        const role = memberData.role;
        const status = memberData.status;

        // Admin direct routing
        if (role === 'admin') {
          navigate('/admin/registrations');
          return;
        }

        // Status routing:
        // pending → /pending-approval
        // approved → /member
        // rejected → /pending-approval (shows rejection notice & contact support)
        // info_requested → /pending-approval (shows admin note)
        if (status === 'approved') {
          navigate('/member');
        } else {
          navigate('/pending-approval');
        }
      } else {
        // Fallback to pending approval
        navigate('/pending-approval');
      }

    } catch (err: unknown) {
      console.error('Sign in failed:', err);
      let msg = 'Failed to sign in. Please verify your credentials.';
      const code = (typeof err === 'object' && err !== null && 'code' in err) ? (err as { code: string }).code : '';
      if (code === 'auth/operation-not-allowed') {
        msg = 'Email/Password sign-in is disabled in your Firebase project. Please enable Email/Password under Authentication > Sign-in method in Firebase Console.';
      } else if (code === 'auth/unauthorized-domain') {
        msg = `Domain not authorized. Add "${typeof window !== 'undefined' ? window.location.hostname : 'current domain'}" to Firebase Authentication > Settings > Authorized domains.`;
      } else if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        msg = 'Invalid email or password. Please verify your credentials and try again.';
      } else if (code === 'auth/too-many-requests') {
        msg = 'Access temporarily suspended due to multiple failed attempts. Please reset password or wait.';
      } else if (code === 'auth/network-request-failed') {
        msg = 'Network connection issue. Please check your internet connection.';
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        msg = (err as { message: string }).message;
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (e: React.FormEvent) => {
    e.preventDefault();
    setResetError(null);
    setResetSuccess(false);

    if (!resetEmail.trim()) {
      setResetError('Please enter your registered email address.');
      return;
    }

    setResetLoading(true);

    try {
      await sendPasswordResetEmail(auth, resetEmail.trim());
      setResetSuccess(true);
    } catch (err: unknown) {
      console.error('Password reset failed:', err);
      let msg = 'Could not send reset link. Ensure the email address is registered.';
      if (typeof err === 'object' && err !== null && 'code' in err) {
        const code = (err as { code: string }).code;
        if (code === 'auth/user-not-found') {
          msg = 'No registered member found with this email address.';
        }
      }
      setResetError(msg);
    } finally {
      setResetLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-md mx-auto w-full">
        
        {/* Header Logo & Title (Authorized Logo usage) */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center mb-4">
            <PakistanLabourCommunityLogo size={72} />
          </div>
          <div className="flex items-center justify-center gap-2 mb-2">
            <FlagPair size="md" />
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-800">
              Oman & Pakistan • لاگ ان
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#071F25] font-heading tracking-tight">
            Member Portal Sign In
          </h1>
          <p className="mt-2 text-sm text-stone-600">
            Sign in to access your digital membership card and community services.
          </p>
        </div>

        {/* Login Form Card */}
        <div className="bg-white rounded-2xl shadow-xl border border-stone-200/80 p-6 sm:p-8">
          
          {errorMessage && (
            <div 
              role="alert"
              className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5 animate-in fade-in"
            >
              <AlertCircle className="w-5 h-5 text-rose-600 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold">Sign In Failed</p>
                <p className="mt-0.5">{errorMessage}</p>
              </div>
            </div>
          )}

          {/* Quick Preset for Admin Credentials */}
          <div className="mb-5 p-3.5 rounded-xl bg-amber-50/90 border border-amber-300/90 flex flex-col sm:flex-row sm:items-center justify-between gap-2">
            <div className="text-xs">
              <span className="font-bold text-[#071F25] flex items-center gap-1.5">
                <ShieldCheck className="w-4 h-4 text-[#0D5A31]" />
                Official Administrator Preset:
              </span>
              <span className="font-mono text-emerald-900 text-[11px] font-bold">
                PLC@community.com • 11223344
              </span>
            </div>
            <button
              type="button"
              onClick={() => {
                setEmail('PLC@community.com');
                setPassword('11223344');
              }}
              className="px-3 py-1.5 text-xs font-bold bg-[#071F25] text-amber-300 hover:text-white rounded-lg hover:bg-[#0d343f] transition-colors shrink-0 shadow-xs"
            >
              Set Credentials
            </button>
          </div>

          <form onSubmit={handleLogin} className="space-y-4">
            
            {/* Email Field */}
            <div>
              <label htmlFor="login-email" className="block text-xs font-bold text-[#071F25] mb-1">
                Registered Email Address
              </label>
              <div className="relative">
                <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  id="login-email"
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@example.com"
                  autoComplete="email"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-sm text-[#071F25] placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#0D5A31]"
                />
              </div>
            </div>

            {/* Password Field */}
            <div>
              <div className="flex items-center justify-between mb-1">
                <label htmlFor="login-password" className="text-xs font-bold text-[#071F25]">
                  Password
                </label>
                <button
                  type="button"
                  onClick={() => {
                    setResetEmail(email);
                    setShowForgotModal(true);
                  }}
                  className="text-xs font-semibold text-[#0D5A31] hover:underline"
                >
                  Forgot password?
                </button>
              </div>
              <div className="relative">
                <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                <input
                  id="login-password"
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  autoComplete="current-password"
                  className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-sm text-[#071F25] placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#0D5A31]"
                />
              </div>
            </div>

            {/* Submit Button */}
            <div className="pt-2">
              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-[#071F25] hover:bg-[#0d343e] text-white shadow-md transition-all disabled:opacity-60 focus:outline-hidden focus:ring-2 focus:ring-[#071F25]"
              >
                {isLoading ? (
                  <>
                    <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                    <span>Signing in...</span>
                  </>
                ) : (
                  <>
                    <span>Sign In to Member Portal</span>
                    <ArrowRight className="w-4 h-4 text-amber-400" />
                  </>
                )}
              </button>
            </div>

          </form>

          {/* Quick Register Link */}
          <div className="mt-6 pt-5 border-t border-stone-200 text-center">
            <p className="text-xs text-stone-600">
              Not registered yet?{' '}
              <Link
                to="/register"
                className="font-bold text-[#0D5A31] hover:text-[#071F25] underline ml-1"
              >
                Join Pakistan Labour Community
              </Link>
            </p>
          </div>

        </div>

      </div>

      {/* Forgot Password Modal */}
      {showForgotModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-xs">
          <div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 relative animate-in zoom-in-95 duration-150">
            <button
              onClick={() => setShowForgotModal(false)}
              className="absolute top-4 right-4 text-stone-400 hover:text-stone-700"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <div className="flex items-center gap-2.5 text-[#071F25] mb-3">
              <div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center">
                <KeyRound className="w-5 h-5" />
              </div>
              <h3 className="font-bold text-base font-heading">Reset Password</h3>
            </div>

            <p className="text-xs text-stone-600 mb-4 leading-relaxed">
              Enter your registered email address to receive password reset instructions.
            </p>

            {resetSuccess ? (
              <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs space-y-2">
                <div className="flex items-center gap-2 font-bold">
                  <CheckCircle2 className="w-4 h-4" />
                  <span>Reset Link Dispatched</span>
                </div>
                <p>
                  Check your inbox for password recovery steps. If not seen, please check your spam folder.
                </p>
                <button
                  type="button"
                  onClick={() => setShowForgotModal(false)}
                  className="w-full mt-2 py-1.5 bg-emerald-700 text-white font-semibold rounded-lg text-xs"
                >
                  Return to Sign In
                </button>
              </div>
            ) : (
              <form onSubmit={handlePasswordReset} className="space-y-4">
                {resetError && (
                  <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">
                    {resetError}
                  </div>
                )}
                <div>
                  <label htmlFor="reset-email" className="block text-xs font-semibold text-stone-700 mb-1">
                    Registered Email
                  </label>
                  <input
                    id="reset-email"
                    type="email"
                    required
                    value={resetEmail}
                    onChange={(e) => setResetEmail(e.target.value)}
                    placeholder="name@example.com"
                    className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300 focus:ring-2 focus:ring-[#0D5A31]"
                  />
                </div>
                <div className="flex items-center gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowForgotModal(false)}
                    className="flex-1 py-2 text-xs font-semibold text-stone-600 hover:bg-stone-100 rounded-lg"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={resetLoading}
                    className="flex-1 py-2 text-xs font-bold bg-[#0D5A31] text-white hover:bg-[#0a4626] rounded-lg disabled:opacity-50"
                  >
                    {resetLoading ? 'Sending...' : 'Send Link'}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </div>
  );
};
