import React, { useEffect, useState } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { GoogleAuthProvider, getRedirectResult, sendPasswordResetEmail, signInWithEmailAndPassword, signInWithRedirect } from 'firebase/auth';
import { doc, getDoc } from 'firebase/firestore';
import { AlertCircle, ArrowRight, CheckCircle2, Chrome, KeyRound, Lock, Mail, ShieldCheck, User, X } from 'lucide-react';
import { auth, db } from '../lib/firebase';
import { PakistanLabourCommunityLogo } from '../lib/logo';
import { FlagPair } from '../lib/flags';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const isAdminLogin = location.pathname.startsWith('/admin/login');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(
    new URLSearchParams(location.search).get('error') === 'unauthorized'
      ? 'This account is not authorized for the administrator portal.'
      : null,
  );
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  useEffect(() => {
    const error = new URLSearchParams(location.search).get('error');
    setErrorMessage(error === 'unauthorized' ? 'This account is not authorized for the administrator portal.' : null);
  }, [location.search]);

  useEffect(() => {
    if (!isAdminLogin) return;
    let active = true;
    setIsLoading(true);
    getRedirectResult(auth)
      .then(async (result) => {
        if (!active || !result) return;
        const profile = await getDoc(doc(db, 'members', result.user.uid));
        const role = profile.exists() ? profile.data().role : undefined;
        if (role !== 'admin') {
          await auth.signOut();
          setErrorMessage('Access denied. This Google account is not assigned the administrator role.');
          return;
        }
        navigate('/admin/registrations', { replace: true });
      })
      .catch((error: unknown) => {
        if (!active) return;
        const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code: string }).code : '';
        if (code === 'auth/unauthorized-domain') setErrorMessage('This website domain is not authorized in Firebase Authentication settings.');
        else if (code === 'auth/operation-not-allowed') setErrorMessage('Google sign-in is not enabled in Firebase Authentication. Enable the Google provider in Firebase Console.');
        else if (code === 'auth/account-exists-with-different-credential') setErrorMessage('This email already uses another sign-in method. Contact the administrator.');
        else setErrorMessage(`Google sign-in failed (${code || 'unknown error'}). Check Firebase Google provider and Authorized Domains settings.`);
      })
      .finally(() => { if (active) setIsLoading(false); });
    return () => { active = false; };
  }, [isAdminLogin, navigate]);

  const handleSubmit = async (event: React.FormEvent) => {
    event.preventDefault();
    setErrorMessage(null);
    if (!email.trim() || !password) {
      setErrorMessage(`Please enter your ${isAdminLogin ? 'administrator username/email' : 'registered email'} and password.`);
      return;
    }

    setIsLoading(true);
    try {
      const credential = await signInWithEmailAndPassword(auth, email.trim(), password);
      const profile = await getDoc(doc(db, 'members', credential.user.uid));
      const role = profile.exists() ? profile.data().role : undefined;
      const status = profile.exists() ? profile.data().status : undefined;

      if (isAdminLogin) {
        if (role !== 'admin') {
          await auth.signOut();
          setErrorMessage('Access denied. This Firebase account is not assigned the administrator role.');
          return;
        }
        navigate('/admin/registrations', { replace: true });
      } else if (role === 'admin') {
        await auth.signOut();
        setErrorMessage('This is an administrator account. Please use the separate Admin Portal login.');
      } else if (status === 'approved') {
        navigate('/member', { replace: true });
      } else {
        navigate('/pending-approval', { replace: true });
      }
    } catch (error: unknown) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code: string }).code : '';
      if (code === 'auth/too-many-requests') {
        setErrorMessage('Access temporarily suspended after multiple attempts. Please try again later.');
      } else if (code === 'auth/invalid-credential' || code === 'auth/user-not-found' || code === 'auth/wrong-password') {
        setErrorMessage('Invalid email or password. Please verify your credentials and try again.');
      } else {
        setErrorMessage('Unable to sign in right now. Please try again.');
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleGoogleAdminLogin = async () => {
    setErrorMessage(null);
    setIsLoading(true);
    try {
      const provider = new GoogleAuthProvider();
      provider.setCustomParameters({ prompt: 'select_account' });
      await signInWithRedirect(auth, provider);
    } catch (error: unknown) {
      const code = typeof error === 'object' && error !== null && 'code' in error ? (error as { code: string }).code : '';
      if (code === 'auth/unauthorized-domain') setErrorMessage('This website domain is not authorized in Firebase Authentication settings.');
      else if (code === 'auth/operation-not-allowed') setErrorMessage('Google sign-in is not enabled in Firebase Authentication. Enable the Google provider in the Firebase Console.');
      else setErrorMessage(`Google sign-in failed (${code || 'unknown error'}). Check Firebase Google provider and Authorized Domains settings.`);
    } finally {
      setIsLoading(false);
    }
  };

  const handlePasswordReset = async (event: React.FormEvent) => {
    event.preventDefault();
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
    } catch {
      setResetError('Could not send the reset link. Ensure the email address is registered.');
    } finally {
      setResetLoading(false);
    }
  };

  const accent = isAdminLogin ? '#071F25' : '#0D5A31';

  return (
    <div className="min-h-screen bg-[#F9F7F2] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-md mx-auto w-full">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3"><PakistanLabourCommunityLogo size={68} /></div>
          <div className="flex items-center justify-center gap-2 mb-1.5"><FlagPair size="md" /><span className="text-xs font-semibold tracking-wider uppercase text-emerald-800">Oman & Pakistan • پورٹل لاگ ان</span></div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#071F25] font-heading tracking-tight">Pakistan Labour Community</h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-600">{isAdminLogin ? 'Authorized administrators only.' : 'Sign in to access your digital membership card.'}</p>
        </div>

        <div className="bg-white rounded-3xl shadow-xl border border-stone-200/90 overflow-hidden">
          <div className={`px-6 py-4 border-b ${isAdminLogin ? 'bg-[#071F25] text-white border-[#071F25]' : 'bg-[#0D5A31] text-white border-[#0D5A31]'}`}>
            <div className="flex items-center gap-2 font-bold text-sm">{isAdminLogin ? <ShieldCheck className="w-5 h-5 text-amber-400" /> : <User className="w-5 h-5 text-emerald-200" />}<span>{isAdminLogin ? 'Administrator Login' : 'Member Sign In'}</span></div>
            <p className="text-[11px] mt-1 opacity-80">{isAdminLogin ? 'Separate secure access for community administrators.' : 'Use your registered member account only.'}</p>
          </div>

          <div className="p-6 sm:p-8">
            {errorMessage && <div role="alert" className="mb-5 p-3.5 rounded-xl bg-rose-50 border border-rose-200 text-rose-800 text-xs sm:text-sm flex items-start gap-2.5"><AlertCircle className="w-5 h-5 text-rose-600 shrink-0" /><div><p className="font-semibold">Sign In Failed</p><p className="mt-0.5">{errorMessage}</p></div></div>}

            {isAdminLogin ? (
              <div className="space-y-4">
                <div className="rounded-2xl border border-amber-200 bg-amber-50 p-4 text-xs leading-relaxed text-amber-950">
                  <div className="flex items-center gap-2 font-bold"><ShieldCheck className="h-4 w-4 text-amber-700" /> Administrator Google access only</div>
                  <p className="mt-1.5">Use the authorized Google account assigned the <code className="font-mono font-semibold">role: admin</code> permission. Email/password admin login is disabled.</p>
                </div>
                <button type="button" onClick={handleGoogleAdminLogin} disabled={isLoading} className="flex w-full items-center justify-center gap-3 rounded-xl bg-[#071F25] px-4 py-3.5 text-sm font-bold text-white shadow-md transition-all hover:bg-[#0e3742] disabled:cursor-not-allowed disabled:opacity-60">
                  {isLoading ? <><div className="h-4 w-4 animate-spin rounded-full border-2 border-white/30 border-t-white" /><span>Verifying Google access...</span></> : <><Chrome className="h-5 w-5 text-amber-300" /><span>Continue with Google</span><ArrowRight className="h-4 w-4 text-amber-400" /></>}
                </button>
              </div>
            ) : (
            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label htmlFor="login-email" className="block text-xs font-bold text-[#071F25] mb-1">{isAdminLogin ? 'Admin Email' : 'Registered Email Address'}</label>
                <div className="relative"><Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" /><input id="login-email" type="email" required value={email} onChange={(event) => setEmail(event.target.value)} placeholder={isAdminLogin ? 'admin@example.com' : 'name@example.com'} autoComplete="email" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-sm text-[#071F25] focus:outline-hidden focus:ring-2 focus:ring-[#0D5A31]" /></div>
              </div>
              <div>
                <div className="flex items-center justify-between mb-1"><label htmlFor="login-password" className="text-xs font-bold text-[#071F25]">Password</label><button type="button" onClick={() => { setResetEmail(email); setShowForgotModal(true); }} className="text-xs font-semibold text-[#0D5A31] hover:underline">Forgot password?</button></div>
                <div className="relative"><Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" /><input id="login-password" type="password" required value={password} onChange={(event) => setPassword(event.target.value)} placeholder="••••••••" autoComplete="current-password" className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-sm text-[#071F25] focus:outline-hidden focus:ring-2 focus:ring-[#0D5A31]" /></div>
              </div>
              <button type="submit" disabled={isLoading} style={{ backgroundColor: accent }} className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm text-white shadow-md transition-all disabled:opacity-60">{isLoading ? <><div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" /><span>Verifying access...</span></> : <><span>{isAdminLogin ? 'Sign In to Admin Dashboard' : 'Sign In to Member Portal'}</span><ArrowRight className="w-4 h-4 text-amber-400" /></>}</button>
            </form>
            )}

            <div className="mt-6 pt-5 border-t border-stone-200 text-center text-xs text-stone-600">
              {isAdminLogin ? <><p>Admin access is granted only to accounts with <code className="font-mono font-semibold">role: admin</code>.</p><Link to="/login" className="inline-block mt-3 font-bold text-[#0D5A31] underline">Go to Member Sign In</Link></> : <p>Not registered yet? <Link to="/register" className="font-bold text-[#0D5A31] underline ml-1">Join Pakistan Labour Community</Link></p>}
            </div>
          </div>
        </div>
      </div>

      {showForgotModal && <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50"><div className="bg-white rounded-2xl max-w-sm w-full p-6 shadow-2xl border border-stone-200 relative"><button onClick={() => setShowForgotModal(false)} className="absolute top-4 right-4 text-stone-400 hover:text-stone-700" aria-label="Close"><X className="w-5 h-5" /></button><div className="flex items-center gap-2.5 text-[#071F25] mb-3"><div className="w-9 h-9 rounded-lg bg-amber-100 text-amber-800 flex items-center justify-center"><KeyRound className="w-5 h-5" /></div><h3 className="font-bold text-base font-heading">Reset Password</h3></div><p className="text-xs text-stone-600 mb-4">Enter your registered email address to receive password reset instructions.</p>{resetSuccess ? <div className="p-3.5 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-800 text-xs space-y-2"><div className="flex items-center gap-2 font-bold"><CheckCircle2 className="w-4 h-4" /><span>Reset Link Dispatched</span></div><p>Check your inbox for password recovery steps.</p></div> : <form onSubmit={handlePasswordReset} className="space-y-4">{resetError && <div className="p-2.5 bg-rose-50 border border-rose-200 text-rose-800 text-xs rounded-lg">{resetError}</div>}<input id="reset-email" type="email" required value={resetEmail} onChange={(event) => setResetEmail(event.target.value)} placeholder="name@example.com" className="w-full px-3 py-2 text-xs rounded-lg border border-stone-300" /><div className="flex items-center gap-2"><button type="button" onClick={() => setShowForgotModal(false)} className="flex-1 py-2 text-xs font-semibold text-stone-600 rounded-lg">Cancel</button><button type="submit" disabled={resetLoading} className="flex-1 py-2 text-xs font-bold bg-[#0D5A31] text-white rounded-lg disabled:opacity-50">{resetLoading ? 'Sending...' : 'Send Link'}</button></div></form>}</div></div>}
    </div>
  );
};
