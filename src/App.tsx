/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React from 'react';
import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './hooks/useAuth';
import { Navbar } from './components/Navbar';
import { Footer } from './components/Footer';
import { LoadingSkeleton } from './components/LoadingSkeleton';
import { 
  ProtectedMemberRoute, 
  ProtectedAdminRoute, 
  PendingApprovalRoute, 
  PublicOnlyRoute 
} from './components/RouteGuards';

import { RegisterPage } from './pages/RegisterPage';
import { LoginPage } from './pages/LoginPage';
import { PendingApprovalPage } from './pages/PendingApprovalPage';
import { MemberPage } from './pages/MemberPage';
import { AdminRegistrationsPage } from './pages/AdminRegistrationsPage';
import { VerifyPage } from './pages/VerifyPage';

const RootRedirector: React.FC = () => {
  const { user, member, loading } = useAuth();

  if (loading) {
    return <LoadingSkeleton message="Connecting to Pakistan Labour Community..." />;
  }

  if (!user) {
    // Default route redirects to /register for signed-out users
    return <Navigate to="/register" replace />;
  }

  if (member?.role === 'admin') {
    return <Navigate to="/admin/registrations" replace />;
  }

  if (member?.status === 'approved') {
    return <Navigate to="/member" replace />;
  }

  return <Navigate to="/pending-approval" replace />;
};

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <div className="min-h-screen flex flex-col bg-[#F9F7F2] text-[#071F25]">
          <Navbar />
          
          <div className="flex-1">
            <Routes>
              {/* Default route "/" redirects to /register for signed-out users */}
              <Route path="/" element={<RootRedirector />} />

              {/* Public authentication routes */}
              <Route
                path="/register"
                element={
                  <PublicOnlyRoute>
                    <RegisterPage />
                  </PublicOnlyRoute>
                }
              />
              <Route
                path="/login"
                element={
                  <PublicOnlyRoute>
                    <LoginPage />
                  </PublicOnlyRoute>
                }
              />

              {/* Application under review */}
              <Route
                path="/pending-approval"
                element={
                  <PendingApprovalRoute>
                    <PendingApprovalPage />
                  </PendingApprovalRoute>
                }
              />

              {/* Approved member dashboard */}
              <Route
                path="/member"
                element={
                  <ProtectedMemberRoute>
                    <MemberPage />
                  </ProtectedMemberRoute>
                }
              />

              {/* Administrator registry verification */}
              <Route
                path="/admin"
                element={<Navigate to="/admin/registrations" replace />}
              />
              <Route
                path="/admin/registrations"
                element={
                  <ProtectedAdminRoute>
                    <AdminRegistrationsPage />
                  </ProtectedAdminRoute>
                }
              />

              {/* Public verification of QR code */}
              <Route path="/verify" element={<VerifyPage />} />

              {/* Catch-all */}
              <Route path="*" element={<Navigate to="/" replace />} />
            </Routes>
          </div>

          <Footer />
        </div>
      </BrowserRouter>
    </AuthProvider>
  );
}
