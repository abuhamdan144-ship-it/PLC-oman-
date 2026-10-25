import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingSkeleton } from './LoadingSkeleton';

/**
 * Route guard for approved members only (/member and child tabs)
 */
export const ProtectedMemberRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, member, loading } = useAuth();
  const location = useLocation();

  if (loading) {
    return <LoadingSkeleton message="Authenticating member credentials..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (member?.role === 'admin') {
    return <Navigate to="/admin/registrations" replace />;
  }

  // The mobile portal is reserved for approved member accounts.
  if (!member || member.role !== 'member' || member.status !== 'approved') {
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
};

/**
 * Screen shown when an authenticated user attempts to access /admin/*
 * without having role: "admin" set in Firestore.
 */
const AdminAccessGate: React.FC<{ user: { uid: string; email: string | null }; member: unknown }> = ({ user }) => {
  const [copied, setCopied] = React.useState(false);
  const [checking, setChecking] = React.useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(user.uid);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const handleRecheck = () => {
    setChecking(true);
    // Reload window to trigger snapshot and auth reload
    setTimeout(() => {
      window.location.reload();
    }, 600);
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-stone-200 p-6 sm:p-8 space-y-5">
        
        <div className="text-center space-y-2">
          <div className="w-14 h-14 bg-amber-100 text-[#071F25] rounded-2xl flex items-center justify-center mx-auto border border-amber-300">
            <svg className="w-7 h-7 text-[#0D5A31]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
              <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
              <path d="m9 12 2 2 4-4" />
            </svg>
          </div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-2.5 py-0.5 rounded-full inline-block">
            Administrator Access Required
          </span>
          <h2 className="text-xl font-bold font-heading text-[#071F25]">
            Admin Registry Dashboard
          </h2>
          <p className="text-xs text-stone-600 leading-relaxed">
            This area is restricted to authorized community administrators.
          </p>
        </div>

        {/* Current User Info */}
        <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 space-y-2 text-xs">
          <div className="flex justify-between items-center text-stone-500">
            <span>Signed In Account:</span>
            <span className="font-semibold text-stone-800 truncate max-w-[190px]">{user.email}</span>
          </div>

          <div className="space-y-1 pt-1 border-t border-stone-200">
            <span className="text-[10px] text-stone-400 uppercase font-bold block">Your Account User UID:</span>
            <div className="flex items-center gap-2">
              <code className="flex-1 bg-white px-2 py-1.5 rounded-lg border border-stone-300 font-mono text-[11px] text-[#071F25] truncate select-all">
                {user.uid}
              </code>
              <button
                type="button"
                onClick={handleCopy}
                className="shrink-0 px-2.5 py-1.5 bg-[#071F25] text-white hover:bg-[#0c2f38] text-[11px] font-semibold rounded-lg transition-colors"
                title="Copy UID to clipboard"
              >
                {copied ? '✓ Copied' : 'Copy UID'}
              </button>
            </div>
          </div>
        </div>

        {/* How to promote via Firebase Console */}
        <div className="p-4 bg-amber-50/80 rounded-2xl border border-amber-300 text-xs text-stone-700 space-y-2.5">
          <p className="font-bold text-amber-950 flex items-center justify-between">
            <span>To grant admin privileges (1 minute):</span>
          </p>
          <ol className="list-decimal pl-4 space-y-1.5 text-[11px] text-stone-700 leading-relaxed">
            <li>
              Open{' '}
              <a 
                href="https://console.firebase.google.com/project/pakistan-labour-community/firestore/databases/-default-/data/~2Fmembers" 
                target="_blank" 
                rel="noopener noreferrer" 
                className="font-bold text-[#0D5A31] underline"
              >
                Firebase Console Firestore
              </a>.
            </li>
            <li>In the <code>members</code> collection, open document: <code className="bg-white px-1 rounded font-mono font-bold">{user.uid.slice(0, 8)}...</code></li>
            <li>Change field <code>role</code> from <code>"member"</code> to <code>"admin"</code>.</li>
            <li>Click <strong>Save</strong>.</li>
          </ol>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2 pt-1">
          <button
            type="button"
            onClick={handleRecheck}
            disabled={checking}
            className="w-full py-2.5 px-4 bg-[#0D5A31] hover:bg-[#094224] text-white rounded-xl text-xs font-bold shadow-sm transition-colors flex items-center justify-center gap-2"
          >
            <span>{checking ? 'Checking credentials...' : 'Check Status & Enter Dashboard'}</span>
          </button>

          <a
            href="/member"
            className="w-full py-2 text-center text-xs font-semibold text-stone-600 hover:text-[#071F25] block"
          >
            Return to Member Area →
          </a>
        </div>

      </div>
    </div>
  );
};

/**
 * Route guard for administrators only (/admin/*)
 */
export const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, member, loading } = useAuth();
  const location = useLocation();
  const isConfiguredAdmin = user?.email?.toLowerCase() === 'plc@community.com';

  if (loading) {
    return <LoadingSkeleton message="Verifying administrator credentials..." />;
  }

  if (!user) {
    return <Navigate to="/login" state={{ from: location }} replace />;
  }

  if (!member || (member.role !== 'admin' && !isConfiguredAdmin)) {
    return <AdminAccessGate user={user} member={member} />;
  }

  return <>{children}</>;
};

/**
 * Guard for /pending-approval:
 * If approved, automatically routes to /member!
 */
export const PendingApprovalRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, member, loading } = useAuth();

  if (loading) {
    return <LoadingSkeleton message="Checking review status..." />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // If user is already approved, instantly unlock /member
  if (member?.status === 'approved') {
    return <Navigate to="/member" replace />;
  }

  return <>{children}</>;
};

/**
 * Guard for public routes (/login, /register)
 * If already signed in, redirects based on their status
 */
export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, member, loading } = useAuth();

  if (loading) {
    return <LoadingSkeleton message="Initializing..." />;
  }

  if (user) {
    if (member?.role === 'admin') {
      return <Navigate to="/admin/registrations" replace />;
    }
    if (member?.status === 'approved') {
      return <Navigate to="/member" replace />;
    }
    return <Navigate to="/pending-approval" replace />;
  }

  return <>{children}</>;
};
