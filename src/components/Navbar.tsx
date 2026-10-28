import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { PakistanLabourCommunityLogo } from '../lib/logo';
import { FlagPair } from '../lib/flags';
import { NotificationModal } from './NotificationModal';
import { 
  Bell, 
  LogOut, 
  User as UserIcon, 
  ShieldCheck, 
  Clock, 
  Menu, 
  X,
  CreditCard,
  Vote,
  FileText
} from 'lucide-react';

export const Navbar: React.FC = () => {
  const { 
    user, 
    member, 
    signOut, 
    unreadNotificationsCount, 
    notifications, 
    markNotificationAsRead,
    isAdmin,
    isApproved 
  } = useAuth();
  
  const navigate = useNavigate();
  const location = useLocation();
  const [showNotifications, setShowNotifications] = useState(false);
  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showMobileMenu, setShowMobileMenu] = useState(false);

  const handleLogout = async () => {
    setShowUserMenu(false);
    setShowMobileMenu(false);
    await signOut();
    navigate('/login');
  };

  const getStatusBadge = () => {
    if (!member) return null;
    switch (member.status) {
      case 'approved':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-emerald-100 text-emerald-800 border border-emerald-300">
            <ShieldCheck className="w-3.5 h-3.5 text-emerald-700" />
            Active Member
          </span>
        );
      case 'pending':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-amber-100 text-amber-800 border border-amber-300">
            <Clock className="w-3.5 h-3.5 text-amber-700" />
            Under Review
          </span>
        );
      case 'info_requested':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 border border-blue-300">
            <Clock className="w-3.5 h-3.5 text-blue-700" />
            Info Requested
          </span>
        );
      case 'rejected':
        return (
          <span className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-semibold bg-rose-100 text-rose-800 border border-rose-300">
            Registration Declined
          </span>
        );
    }
  };

  return (
    <>
      <header className="sticky top-0 z-40 bg-[#071F25] text-white border-b border-amber-500/30 shadow-md">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center justify-between h-18">
            
            {/* Left: Official Logo + Title + Flag Pair */}
            <Link 
              to={user ? (isApproved ? '/member' : '/pending-approval') : '/login'}
              className="flex items-center gap-3 group focus:outline-hidden focus:ring-2 focus:ring-amber-400 rounded-lg p-1 transition-transform"
              aria-label="Pakistan Labour Community Home"
            >
              <PakistanLabourCommunityLogo size={42} showText={false} />
              
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="text-base sm:text-lg font-bold tracking-tight text-white group-hover:text-amber-300 transition-colors">
                    Pakistan Labour Community
                  </span>
                  <FlagPair size="sm" className="hidden xs:inline-flex" />
                </div>
                <div className="flex items-center gap-1.5 text-[11px] text-amber-400 font-medium tracking-wide">
                  <span>سلطنة عُمان & پاکستان</span>
                  <span className="text-white/40">•</span>
                  <span className="text-emerald-300">Member Portal</span>
                </div>
              </div>
            </Link>

            {/* Desktop Center / Right Actions */}
            <div className="hidden md:flex items-center gap-4">
              {user ? (
                <>
                  {/* Status Badge */}
                  {getStatusBadge()}

                  {/* Approved member direct links */}
                  {isApproved && (
                    <nav className="flex items-center gap-2">
                      <Link
                        to="/member"
                        className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                          location.pathname === '/member'
                            ? 'bg-white/15 text-white font-semibold'
                            : 'text-stone-300 hover:text-white hover:bg-white/10'
                        }`}
                      >
                        Dashboard & Card
                      </Link>
                    </nav>
                  )}

                  {/* Notifications Bell */}
                  <button
                    onClick={() => setShowNotifications(true)}
                    className="relative p-2 text-stone-300 hover:text-white rounded-lg hover:bg-white/10 transition-colors focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                    aria-label={`View notifications, ${unreadNotificationsCount} unread`}
                  >
                    <Bell className="w-5 h-5" />
                    {unreadNotificationsCount > 0 && (
                      <span className="absolute top-1 right-1 flex h-4 w-4 items-center justify-center rounded-full bg-amber-400 text-[10px] font-extrabold text-[#071F25]">
                        {unreadNotificationsCount > 9 ? '9+' : unreadNotificationsCount}
                      </span>
                    )}
                  </button>

                  {/* User Profile Dropdown Menu */}
                  <div className="relative">
                    <button
                      onClick={() => setShowUserMenu(!showUserMenu)}
                      className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white/10 transition-colors focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                      aria-expanded={showUserMenu}
                      aria-haspopup="true"
                    >
                      {member?.photoURL ? (
                        <img
                          src={member.photoURL}
                          alt={member.fullName || 'Member'}
                          className="w-8 h-8 rounded-full object-cover border border-amber-400/40"
                        />
                      ) : (
                        <div className="w-8 h-8 rounded-full bg-emerald-900 border border-emerald-500/40 text-amber-300 flex items-center justify-center font-bold text-xs">
                          {member?.fullName ? member.fullName.charAt(0).toUpperCase() : <UserIcon className="w-4 h-4" />}
                        </div>
                      )}
                      <div className="text-left hidden lg:block">
                        <p className="text-xs font-semibold text-white leading-tight truncate max-w-[120px]">
                          {member?.fullName || user.email?.split('@')[0]}
                        </p>
                        <p className="text-[10px] text-amber-300/90 leading-tight">
                          {member?.memberId || (isAdmin ? 'Admin' : 'Member')}
                        </p>
                      </div>
                    </button>

                    {showUserMenu && (
                      <div className="absolute right-0 mt-2 w-56 rounded-xl bg-white text-[#071F25] shadow-xl border border-stone-200 py-2 z-50 animate-in fade-in slide-in-from-top-2 duration-150">
                        <div className="px-4 py-2 border-b border-stone-100">
                          <p className="text-xs font-semibold text-stone-900 truncate">
                            {member?.fullName || 'Community Member'}
                          </p>
                          <p className="text-[11px] text-stone-500 truncate">
                            {user.email}
                          </p>
                          {member?.memberId && (
                            <p className="text-[11px] font-mono text-emerald-800 font-bold mt-1">
                              ID: {member.memberId}
                            </p>
                          )}
                        </div>

                        {isApproved && (
                          <>
                            <Link
                              to="/member"
                              onClick={() => setShowUserMenu(false)}
                              className="flex items-center gap-2.5 px-4 py-2 text-xs text-stone-700 hover:bg-stone-50 hover:text-[#071F25]"
                            >
                              <CreditCard className="w-4 h-4 text-emerald-700" />
                              Digital Membership Card
                            </Link>
                          </>
                        )}

                        <Link
                          to={isAdmin ? '/admin/registrations' : '/admin/login'}
                          onClick={() => setShowUserMenu(false)}
                          className="flex items-center gap-2.5 px-4 py-2 text-xs text-amber-800 hover:bg-amber-50 font-semibold"
                        >
                          <ShieldCheck className="w-4 h-4 text-amber-600" />
                          {isAdmin ? 'Member Applications' : 'Admin Portal'}
                        </Link>
                        {isAdmin && (
                          <>
                            <Link to="/admin/portal?section=ballot" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2 text-xs text-stone-700 hover:bg-stone-50">
                              <Vote className="h-4 w-4 text-emerald-700" /> Voting &amp; Requirements
                            </Link>
                            <Link to="/admin/portal?section=reports" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2 text-xs text-stone-700 hover:bg-stone-50">
                              <FileText className="h-4 w-4 text-amber-700" /> Incident Reports
                            </Link>
                            <Link to="/admin/portal?section=verification" onClick={() => setShowUserMenu(false)} className="flex items-center gap-2.5 px-4 py-2 text-xs text-stone-700 hover:bg-stone-50">
                              <ShieldCheck className="h-4 w-4 text-emerald-700" /> QR Verification
                            </Link>
                          </>
                        )}

                        <button
                          onClick={handleLogout}
                          className="w-full flex items-center gap-2.5 px-4 py-2 text-xs text-rose-700 hover:bg-rose-50 border-t border-stone-100 mt-1"
                        >
                          <LogOut className="w-4 h-4" />
                          Sign Out
                        </button>
                      </div>
                    )}
                  </div>
                </>
              ) : (
                <div className="flex items-center gap-2.5">
                  <Link
                    to="/login"
                    className="text-xs font-semibold text-stone-200 hover:text-white px-3 py-2 rounded-lg transition-colors"
                  >
                    Sign In
                  </Link>
                  <Link
                    to="/register"
                    className="text-xs font-bold bg-[#E4AE2F] hover:bg-amber-400 text-[#071F25] px-4 py-2 rounded-lg shadow-sm transition-all transform hover:-translate-y-0.5"
                  >
                    Join Community
                  </Link>
                </div>
              )}
            </div>

            {/* Mobile Hamburger / Notification Button */}
            <div className="flex items-center gap-2 md:hidden">
              {user && (
                <button
                  onClick={() => setShowNotifications(true)}
                  className="relative p-2 text-stone-300 hover:text-white"
                  aria-label="View notifications"
                >
                  <Bell className="w-5 h-5" />
                  {unreadNotificationsCount > 0 && (
                    <span className="absolute top-1 right-1 w-2.5 h-2.5 rounded-full bg-amber-400" />
                  )}
                </button>
              )}
              <button
                onClick={() => setShowMobileMenu(!showMobileMenu)}
                className="p-2 text-stone-300 hover:text-white rounded-lg focus:outline-hidden focus:ring-2 focus:ring-amber-400"
                aria-label={showMobileMenu ? "Close menu" : "Open menu"}
              >
                {showMobileMenu ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
              </button>
            </div>

          </div>
        </div>

        {/* Mobile Dropdown Menu */}
        {showMobileMenu && (
          <div className="md:hidden bg-[#05181D] border-t border-white/10 px-4 pt-3 pb-5 space-y-3">
            <div className="flex items-center justify-between pb-2 border-b border-white/10">
              <div className="flex items-center gap-2">
                <FlagPair size="sm" />
                <span className="text-xs text-stone-300">Pakistan & Oman Community</span>
              </div>
              {getStatusBadge()}
            </div>

            {user ? (
              <div className="space-y-1">
                <div className="py-2 text-xs text-stone-300">
                  Signed in as <span className="font-semibold text-white">{member?.fullName || user.email}</span>
                  {member?.memberId && <div className="text-amber-400 font-mono text-[11px]">{member.memberId}</div>}
                </div>

                {isApproved && (
                  <Link
                    to="/member"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-stone-200 hover:bg-white/10"
                  >
                    <CreditCard className="w-4 h-4 text-emerald-400" />
                    Member Area & Card
                  </Link>
                )}

                {!isApproved && (
                  <Link
                    to="/pending-approval"
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-amber-300 hover:bg-white/10"
                  >
                    <Clock className="w-4 h-4" />
                    Application Status
                  </Link>
                )}

                  <Link
                    to={isAdmin ? '/admin/registrations' : '/admin/login'}
                    onClick={() => setShowMobileMenu(false)}
                    className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-amber-300 hover:bg-white/10 font-bold"
                  >
                    <ShieldCheck className="w-4 h-4 text-amber-400" />
                    {isAdmin ? 'Member Applications' : 'Admin Login'}
                  </Link>

                  {isAdmin && (
                    <>
                      <Link to="/admin/portal?section=ballot" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-stone-200 hover:bg-white/10">
                        <Vote className="h-4 w-4 text-emerald-400" /> Voting &amp; Requirements
                      </Link>
                      <Link to="/admin/portal?section=reports" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-stone-200 hover:bg-white/10">
                        <FileText className="h-4 w-4 text-amber-300" /> Incident Reports
                      </Link>
                      <Link to="/admin/portal?section=verification" onClick={() => setShowMobileMenu(false)} className="flex items-center gap-2.5 px-3 py-2 rounded-lg text-sm text-stone-200 hover:bg-white/10">
                        <ShieldCheck className="h-4 w-4 text-emerald-400" /> QR Verification
                      </Link>
                    </>
                  )}

                <button
                  onClick={handleLogout}
                  className="w-full flex items-center gap-2.5 px-3 py-2 text-left rounded-lg text-sm text-rose-300 hover:bg-rose-900/30"
                >
                  <LogOut className="w-4 h-4" />
                  Sign Out
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-2 pt-2">
                <Link
                  to="/admin/login"
                  onClick={() => setShowMobileMenu(false)}
                  className="text-center py-2.5 px-4 rounded-lg text-sm font-bold border border-amber-400/40 text-amber-300 hover:bg-white/5"
                >
                  Admin Login
                </Link>
                <Link
                  to="/login"
                  onClick={() => setShowMobileMenu(false)}
                  className="text-center py-2.5 px-4 rounded-lg text-sm font-semibold border border-stone-600 text-stone-200 hover:bg-white/5"
                >
                  Sign In
                </Link>
                <Link
                  to="/register"
                  onClick={() => setShowMobileMenu(false)}
                  className="text-center py-2.5 px-4 rounded-lg text-sm font-bold bg-[#E4AE2F] text-[#071F25] hover:bg-amber-400"
                >
                  Join Pakistan Labour Community
                </Link>
              </div>
            )}
          </div>
        )}
      </header>

      {/* Notification Modal */}
      <NotificationModal
        isOpen={showNotifications}
        onClose={() => setShowNotifications(false)}
        notifications={notifications}
        onMarkAsRead={markNotificationAsRead}
      />

    </>
  );
};
