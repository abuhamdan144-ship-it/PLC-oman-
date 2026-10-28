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

import { isPlcAdminEmail } from '../hooks/useAuth';

/**
 * Screen shown when an authenticated non-admin user attempts to access /admin/*
 */
const AdminAccessGate: React.FC<{ user: { uid: string; email: string | null }; member: unknown }> = ({ user }) => {
  const { signOut } = useAuth();
  const [activating, setActivating] = React.useState(false);
  const isTargetAdmin = isPlcAdminEmail(user.email);

  const handleActivate = () => {
    setActivating(true);
    setTimeout(() => {
      window.location.href = '/admin/registrations';
    }, 150);
  };

  // If designated admin, auto-redirect immediately so user is never gated
  React.useEffect(() => {
    if (isTargetAdmin) {
      handleActivate();
    }
  }, [isTargetAdmin]);

  const handleSwitchToAdmin = async () => {
    await signOut();
    window.location.href = '/admin/login';
  };

  return (
    <div className="min-h-screen bg-[#F9F7F2] py-12 px-4 sm:px-6 lg:px-8 flex flex-col justify-center items-center">
      <div className="max-w-md w-full bg-white rounded-3xl shadow-xl border border-stone-200 p-6 sm:p-8 space-y-5 text-center">
        
        <div className="w-16 h-16 bg-amber-100 text-[#071F25] rounded-2xl flex items-center justify-center mx-auto border border-amber-300">
          <svg className="w-8 h-8 text-[#0D5A31]" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
            <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
            <path d="m9 12 2 2 4-4" />
          </svg>
        </div>

        <div>
          <span className="text-[11px] font-bold uppercase tracking-wider text-amber-700 bg-amber-100 px-3 py-1 rounded-full inline-block">
            Administrator Portal Access
          </span>
          <h2 className="text-xl font-bold font-heading text-[#071F25] mt-2">
            Admin Registry Dashboard
          </h2>
          <p className="text-xs text-stone-600 mt-1 leading-relaxed">
            {isTargetAdmin 
              ? 'Administrator account recognized! Click below to enter the dashboard immediately.'
              : 'This registry area is reserved for authorized community administrators.'}
          </p>
        </div>

        {/* Current User Info */}
        <div className="p-3.5 bg-stone-50 rounded-xl border border-stone-200 text-xs text-left space-y-1.5">
          <div className="flex justify-between items-center text-stone-500">
            <span>Signed In Account:</span>
            <span className="font-semibold text-stone-800 truncate max-w-[200px]">{user.email || 'No email'}</span>
          </div>
          <div className="flex justify-between items-center text-stone-500">
            <span>Administrator Login:</span>
            <span className="font-bold text-[#0D5A31]">PLC@community.com</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="space-y-2.5 pt-2">
          <button
            type="button"
            onClick={handleActivate}
            disabled={activating}
            className="w-full py-3 px-4 bg-[#0D5A31] hover:bg-[#094224] text-white rounded-xl text-sm font-bold shadow-md transition-all flex items-center justify-center gap-2"
          >
            <span>{activating ? 'Granting admin access...' : '⚡ Authorize This Account & Enter Admin Portal'}</span>
          </button>

          {!isTargetAdmin && (
            <button
              type="button"
              onClick={handleSwitchToAdmin}
              className="w-full py-2.5 px-4 bg-[#071F25] hover:bg-[#0d343e] text-white rounded-xl text-xs font-bold shadow-md transition-all flex items-center justify-center gap-2"
            >
              <span>🔑 Switch to PLC Admin Login (PLC@community.com)</span>
            </button>
          )}

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
  const { user, member, loading, isAdmin } = useAuth();
  const location = useLocation();

  const isConfiguredAdmin = 
    isAdmin || 
    member?.role === 'admin' ||
    isPlcAdminEmail(user?.email);

  if (loading) {
    return <LoadingSkeleton message="Verifying administrator credentials..." />;
  }

  // If user is configured admin or marked as admin, grant immediate access!
  if (isConfiguredAdmin) {
    return <>{children}</>;
  }

  if (!user) {
    return <Navigate to="/admin/login" state={{ from: location }} replace />;
  }

  return <AdminAccessGate user={user} member={member} />;
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
