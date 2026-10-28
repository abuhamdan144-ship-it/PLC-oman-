/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate, useLocation } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import {
  ProtectedMemberRoute,
  ProtectedAdminRoute,
  PendingApprovalRoute,
  PublicOnlyRoute,
} from './components/RouteGuards';

import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { PendingApprovalPage } from './pages/PendingApprovalPage';
import { MemberPage } from './pages/MemberPage';
import { AdminRegistrationsPage } from './pages/AdminRegistrationsPage';
import { AdminPortalPage } from './pages/AdminPortalPage';
import { VerifyPage } from './pages/VerifyPage';

const RootRedirector: React.FC = () => {
  const { user, member, loading } = useAuth();

  if (loading) return <LoadingSkeleton message="Connecting to Pakistan Labour Community..." />;
  if (!user) return <Navigate to="/register" replace />;
  if (member?.role === 'admin') return <Navigate to="/admin/registrations" replace />;
  if (member?.status === 'approved') return <Navigate to="/member" replace />;
  return <Navigate to="/pending-approval" replace />;
};

const AppContent: React.FC = () => {
  const location = useLocation();
  const isMemberPortal = location.pathname === '/member';

  return (
    <div className="min-h-screen flex flex-col bg-[#F9F7F2] text-[#071F25]">
      <Navbar />
      <div className="flex-1">
        <Routes>
          <Route path="/" element={<RootRedirector />} />

          <Route path="/register" element={<PublicOnlyRoute><RegisterPage /></PublicOnlyRoute>} />
          <Route path="/login" element={<LoginPage />} />
          <Route path="/admin/login" element={<LoginPage />} />

          <Route path="/pending-approval" element={<PendingApprovalRoute><PendingApprovalPage /></PendingApprovalRoute>} />
          <Route path="/member" element={<ProtectedMemberRoute><MemberPage /></ProtectedMemberRoute>} />

          <Route path="/admin" element={<Navigate to="/admin/login" replace />} />
          <Route path="/admin/registrations" element={<ProtectedAdminRoute><AdminRegistrationsPage /></ProtectedAdminRoute>} />
          <Route path="/admin/portal" element={<ProtectedAdminRoute><AdminPortalPage /></ProtectedAdminRoute>} />

          <Route path="/verify" element={<VerifyPage />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </div>
      {!isMemberPortal && <Footer />}
    </div>
  );
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppContent />
      </BrowserRouter>
    </AuthProvider>
  );
}
