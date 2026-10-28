import React, { useState, useEffect } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { 
  signInWithEmailAndPassword, 
  sendPasswordResetEmail,
  browserLocalPersistence,
  browserSessionPersistence,
  setPersistence,
} from 'firebase/auth';
import { doc, getDoc, setDoc } from 'firebase/firestore';
import { auth, db } from '../lib/firebase';
import { MASTER_ADMIN_PROFILE } from '../hooks/useAuth';
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
  User,
  Check
} from 'lucide-react';

export const LoginPage: React.FC = () => {
  const navigate = useNavigate();
  const location = useLocation();

  // Check URL params: if '?role=admin' or '?admin=true', start on Admin tab
  const params = new URLSearchParams(location.search);
  const initialIsAdminTab = params.get('role') === 'admin' || params.get('admin') === 'true';

  const [activeTab, setActiveTab] = useState<'admin' | 'member'>(initialIsAdminTab ? 'admin' : 'member');

  // Form inputs for Member
  const [memberEmail, setMemberEmail] = useState('');
  const [memberPassword, setMemberPassword] = useState('');
  const [rememberMemberOnDevice, setRememberMemberOnDevice] = useState(true);

  // Form inputs for Admin
  const [adminUsername, setAdminUsername] = useState('');
  const [adminPassword, setAdminPassword] = useState('');

  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  // Forgot Password modal state
  const [showForgotModal, setShowForgotModal] = useState(false);
  const [resetEmail, setResetEmail] = useState('');
  const [resetLoading, setResetLoading] = useState(false);
  const [resetSuccess, setResetSuccess] = useState(false);
  const [resetError, setResetError] = useState<string | null>(null);

  // Switch tab if URL parameter changes
  useEffect(() => {
    if (params.get('role') === 'admin' || params.get('admin') === 'true') {
      setActiveTab('admin');
    }
  }, [location.search]);

  /**
   * Helper to execute guaranteed Admin Login:
   * Authenticates or provisions the administrator in Firebase, then redirects.
   */
  const executeAdminLogin = async (emailInput: string, passInput: string) => {
    setIsLoading(true);
    setErrorMessage(null);

    const cleanEmail = emailInput.trim();

    try {
      // Authenticate with Firebase Auth before granting access to Firestore-backed tools.
      let authUser = null;
      try {
        await setPersistence(auth, browserSessionPersistence);
        const userCred = await signInWithEmailAndPassword(auth, cleanEmail, passInput);
        authUser = userCred.user;
      } catch (authErr: unknown) {
        const errCode = (typeof authErr === 'object' && authErr !== null && 'code' in authErr) 
          ? (authErr as { code: string }).code 
          : '';
        
        console.warn('Admin sign-in notice:', authErr);
      }

      if (!authUser) {
        throw new Error('Administrator authentication failed. Please check the email and password.');
      }

      // Upsert admin record in Firestore.
      try {
        await setDoc(doc(db, 'members', authUser.uid), {
            uid: authUser.uid,
            memberId: 'PLC-2026-ADMIN',
            fullName: 'Community Executive Administrator (PLC)',
            email: cleanEmail,
            mobile: '+968 96766876',
            country: 'Oman',
            currentLocation: 'Muscat, Sultanate of Oman',
            idNumber: 'ADMIN-PLC-001',
            photoURL: MASTER_ADMIN_PROFILE.photoURL,
            status: 'approved',
            role: 'admin',
            adminNote: 'Master Community Administrator Account',
            registeredAt: new Date().toISOString(),
            approvedAt: new Date().toISOString(),
            memberSince: 'January 2026',
          }, { merge: true });
      } catch (dbErr) {
        console.warn('Firestore admin upsert notice:', dbErr);
      }

      // Navigate directly to Admin Dashboard
      navigate('/admin/registrations', { replace: true });
    } catch (err: unknown) {
      console.error('Admin login error:', err);
      setErrorMessage(err instanceof Error ? err.message : 'Administrator authentication failed.');
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Handle Admin Form Submit
   */
  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adminUsername.trim() || !adminPassword) {
      setErrorMessage('Please enter admin username/email and password.');
      return;
    }
    await executeAdminLogin(adminUsername, adminPassword);
  };

  /**
   * Handle Member Form Submit
   */
  const handleMemberSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMessage(null);

    const cleanEmail = memberEmail.trim();
    if (!cleanEmail || !memberPassword) {
      setErrorMessage('Please enter both email and password.');
      return;
    }

    setIsLoading(true);

    try {
      await setPersistence(
        auth,
        rememberMemberOnDevice ? browserLocalPersistence : browserSessionPersistence
      );
      const userCredential = await signInWithEmailAndPassword(auth, cleanEmail, memberPassword);
      const user = userCredential.user;

      // Check member profile document
      const memberDocSnap = await getDoc(doc(db, 'members', user.uid));
      
      if (memberDocSnap.exists()) {
        const memberData = memberDocSnap.data();
        const role = memberData.role;
        const status = memberData.status;

        if (role === 'admin') {
          setErrorMessage('This account is configured for the administrator portal, not as a member profile. Use a member account to view a membership card, voting, emergency contacts, and reports.');
          return;
        }

        if (status === 'approved') {
          navigate('/member');
        } else {
          navigate('/pending-approval');
        }
      } else {
        // Older signups may have created an Auth account before a Firestore write failed.
        // Restore only a matching local draft, and force it to pending/member so cached
        // client data can never grant approval or administrator privileges.
        const cachedProfile = localStorage.getItem(`plc_member_doc_${user.uid}`);
        if (cachedProfile) {
          try {
            const cached = JSON.parse(cachedProfile) as Record<string, unknown>;
            if (cached.uid !== user.uid || typeof cached.fullName !== 'string' || typeof cached.mobile !== 'string' || typeof cached.currentLocation !== 'string' || typeof cached.idNumber !== 'string') {
              throw new Error('The saved profile is incomplete or does not match this account.');
            }
            const recoveredProfile = {
              uid: user.uid,
              fullName: cached.fullName,
              email: user.email || (typeof cached.email === 'string' ? cached.email : cleanEmail),
              mobile: cached.mobile,
              country: cached.country === 'Pakistan' ? 'Pakistan' : 'Oman',
              currentLocation: cached.currentLocation,
              idNumber: cached.idNumber,
              photoURL: typeof cached.photoURL === 'string' ? cached.photoURL : '',
              paymentReceiptURL: typeof cached.paymentReceiptURL === 'string' ? cached.paymentReceiptURL : '',
              receiptReference: typeof cached.receiptReference === 'string' ? cached.receiptReference : '',
              status: 'pending' as const,
              adminNote: '',
              registeredAt: typeof cached.registeredAt === 'string' ? cached.registeredAt : new Date().toISOString(),
              emergencyContact: cached.emergencyContact && typeof cached.emergencyContact === 'object'
                ? cached.emergencyContact
                : { name: 'Next of kin', phone: cached.mobile, relation: 'Family' },
              role: 'member' as const,
            };
            await setDoc(doc(db, 'members', user.uid), recoveredProfile);
            navigate('/pending-approval');
          } catch (recoveryError) {
            console.error('Could not restore missing member profile:', recoveryError);
            setErrorMessage('Your sign-in worked, but the member profile could not be restored from this device. Please contact the community administrator; your account has not been deleted.');
          }
        } else {
          setErrorMessage('Your sign-in worked, but no saved member profile was found in Firebase or on this device. Your account has not been deleted; please contact the community administrator to restore your registration.');
        }
      }

    } catch (err: unknown) {
      console.error('Member sign in failed:', err);
      let msg = 'Failed to sign in. Please verify your email and password.';
      const code = (typeof err === 'object' && err !== null && 'code' in err) ? (err as { code: string }).code : '';
      if (code === 'auth/operation-not-allowed') {
        msg = 'Email/Password sign-in is disabled. Please verify your settings.';
      } else if (code === 'auth/user-not-found' || code === 'auth/wrong-password' || code === 'auth/invalid-credential') {
        msg = 'Invalid email or password. Please verify your credentials and try again.';
      } else if (code === 'auth/too-many-requests') {
        msg = 'Access temporarily suspended due to multiple attempts. Please wait a moment.';
      } else if (typeof err === 'object' && err !== null && 'message' in err) {
        msg = (err as { message: string }).message;
      }
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  /**
   * Password Reset Flow
   */
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
    <div className="min-h-screen bg-[#F9F7F2] py-8 sm:py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center">
      <div className="max-w-md mx-auto w-full">
        
        {/* Header Logo & Title */}
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center mb-3">
            <PakistanLabourCommunityLogo size={68} />
          </div>
          <div className="flex items-center justify-center gap-2 mb-1.5">
            <FlagPair size="md" />
            <span className="text-xs font-semibold tracking-wider uppercase text-emerald-800">
              Oman & Pakistan • پورٹل لاگ ان
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-[#071F25] font-heading tracking-tight">
            Pakistan Labour Community
          </h1>
          <p className="mt-1 text-xs sm:text-sm text-stone-600">
            Sign in to access your digital membership card or community management desk.
          </p>
        </div>

        {/* Login Card */}
        <div className="bg-white rounded-3xl shadow-xl border border-stone-200/90 overflow-hidden">
          
          {/* Segmented Tab Switcher: Admin vs Member */}
          <div className="flex border-b border-stone-200 bg-stone-50/80 p-1.5 gap-1.5">
            <button
              type="button"
              onClick={() => {
                setActiveTab('admin');
                setErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'admin'
                  ? 'bg-[#071F25] text-white shadow-sm'
                  : 'text-stone-600 hover:text-[#071F25] hover:bg-white/60'
              }`}
            >
              <ShieldCheck className={`w-4 h-4 ${activeTab === 'admin' ? 'text-amber-400' : 'text-stone-400'}`} />
              <span>Admin Login</span>
              <span className="text-[10px] uppercase tracking-wider px-1.5 py-0.5 rounded-full bg-amber-400/20 text-amber-300 font-extrabold hidden sm:inline">
                PLC
              </span>
            </button>

            <button
              type="button"
              onClick={() => {
                setActiveTab('member');
                setErrorMessage(null);
              }}
              className={`flex-1 flex items-center justify-center gap-2 py-2.5 px-3 rounded-2xl text-xs sm:text-sm font-bold transition-all ${
                activeTab === 'member'
                  ? 'bg-[#0D5A31] text-white shadow-sm'
                  : 'text-stone-600 hover:text-[#071F25] hover:bg-white/60'
              }`}
            >
              <User className={`w-4 h-4 ${activeTab === 'member' ? 'text-emerald-200' : 'text-stone-400'}`} />
              <span>Member Sign In</span>
            </button>
          </div>

          <div className="p-6 sm:p-8">

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

            {/* TAB 1: ADMIN LOGIN (SUPER SIMPLE) */}
            {activeTab === 'admin' && (
              <div className="space-y-4">
                
                {/* Admin Header Notice */}
                <div className="p-3 bg-amber-50 rounded-2xl border border-amber-200 text-xs text-amber-950 flex items-start gap-2.5">
                  <ShieldCheck className="w-5 h-5 text-[#0D5A31] shrink-0 mt-0.5" />
                  <div>
                    <p className="font-bold">Community Administrator Desk</p>
                    <p className="text-[11px] text-stone-600 mt-0.5">
                      Review, verify, and approve pending member registrations.
                    </p>
                  </div>
                </div>

                <form onSubmit={handleAdminSubmit} className="space-y-3.5">
                  <div>
                    <label htmlFor="admin-username" className="block text-xs font-bold text-[#071F25] mb-1">
                      Admin Username / Email
                    </label>
                    <div className="relative">
                      <Mail className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        id="admin-username"
                        type="text"
                        required
                        value={adminUsername}
                        onChange={(e) => setAdminUsername(e.target.value)}
                        placeholder="Enter administrator email"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold text-[#071F25] focus:outline-hidden focus:ring-2 focus:ring-[#071F25]"
                      />
                    </div>
                  </div>

                  <div>
                    <label htmlFor="admin-password" className="block text-xs font-bold text-[#071F25] mb-1">
                      Admin Password
                    </label>
                    <div className="relative">
                      <Lock className="w-4 h-4 text-stone-400 absolute left-3 top-3 pointer-events-none" />
                      <input
                        id="admin-password"
                        type="password"
                        required
                        value={adminPassword}
                        onChange={(e) => setAdminPassword(e.target.value)}
                        placeholder="Enter administrator password"
                        className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-sm font-semibold text-[#071F25] focus:outline-hidden focus:ring-2 focus:ring-[#071F25]"
                      />
                    </div>
                  </div>

                  {/* Primary Admin Sign In Button */}
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-[#071F25] hover:bg-[#0c2f38] text-white shadow-md transition-all disabled:opacity-60"
                  >
                    {isLoading ? (
                      <>
                        <div className="w-4 h-4 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                        <span>Logging into Admin Dashboard...</span>
                      </>
                    ) : (
                      <>
                        <span>Sign In to Admin Dashboard</span>
                        <ArrowRight className="w-4 h-4 text-amber-400" />
                      </>
                    )}
                  </button>
                </form>

              </div>
            )}

            {/* TAB 2: MEMBER LOGIN */}
            {activeTab === 'member' && (
              <form onSubmit={handleMemberSubmit} className="space-y-4">
                
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
                      value={memberEmail}
                      onChange={(e) => setMemberEmail(e.target.value)}
                      placeholder="name@example.com"
                      autoComplete="username"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-sm text-[#071F25] placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#0D5A31]"
                    />
                  </div>
                </div>

                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label htmlFor="login-password" className="text-xs font-bold text-[#071F25]">
                      Password
                    </label>
                    <button
                      type="button"
                      onClick={() => {
                        setResetEmail(memberEmail);
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
                      value={memberPassword}
                      onChange={(e) => setMemberPassword(e.target.value)}
                      placeholder="••••••••"
                      autoComplete="current-password"
                      className="w-full pl-9 pr-3 py-2.5 rounded-xl border border-stone-300 text-sm text-[#071F25] placeholder:text-stone-400 focus:outline-hidden focus:ring-2 focus:ring-[#0D5A31]"
                    />
                  </div>
                </div>

                <label className="flex items-start gap-3 rounded-xl border border-emerald-200 bg-emerald-50/70 p-3 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={rememberMemberOnDevice}
                    onChange={(e) => setRememberMemberOnDevice(e.target.checked)}
                    className="mt-0.5 h-4 w-4 accent-[#0D5A31]"
                  />
                  <span className="text-xs text-stone-700">
                    <span className="block font-bold text-[#071F25]">Keep me signed in on this phone</span>
                    <span className="mt-0.5 block">Use this only on your personal device. Your browser may offer to securely save your login; PLC never stores your password.</span>
                  </span>
                </label>

                <div className="pt-2">
                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-full flex items-center justify-center gap-2 py-3 px-4 rounded-xl font-bold text-sm bg-[#0D5A31] hover:bg-[#0a4626] text-white shadow-md transition-all disabled:opacity-60 focus:outline-hidden focus:ring-2 focus:ring-[#0D5A31]"
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

                <p className="text-center text-[11px] leading-relaxed text-stone-500">
                  Use PLC like an app: on iPhone tap <strong>Share → Add to Home Screen</strong>; on Android open your browser menu and choose <strong>Install app</strong> or <strong>Add to Home screen</strong>.
                </p>

              </form>
            )}

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
