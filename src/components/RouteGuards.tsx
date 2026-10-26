import React from 'react';
import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { LoadingSkeleton } from './LoadingSkeleton';

export const ProtectedMemberRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, member, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSkeleton message="Authenticating member credentials..." />;
  if (!user) return <Navigate to="/login" state={{ from: location }} replace />;
  if (member?.role === 'admin') return <Navigate to="/admin/registrations" replace />;
  if (!member || member.role !== 'member' || member.status !== 'approved') {
    return <Navigate to="/pending-approval" replace />;
  }
  return <>{children}</>;
};

export const ProtectedAdminRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, member, loading } = useAuth();
  const location = useLocation();

  if (loading) return <LoadingSkeleton message="Verifying administrator credentials..." />;
  if (!user) return <Navigate to="/admin/login" state={{ from: location }} replace />;
  if (member?.role !== 'admin') {
    return <Navigate to="/admin/login?error=unauthorized" state={{ from: location }} replace />;
  }
  return <>{children}</>;
};

export const PendingApprovalRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, member, loading } = useAuth();
  if (loading) return <LoadingSkeleton message="Checking review status..." />;
  if (!user) return <Navigate to="/login" replace />;
  if (member?.role === 'admin' || member?.status === 'approved') return <Navigate to={member.role === 'admin' ? '/admin/registrations' : '/member'} replace />;
  return <>{children}</>;
};

export const PublicOnlyRoute: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const { user, member, loading } = useAuth();
  if (loading) return <LoadingSkeleton message="Initializing..." />;
  if (!user) return <>{children}</>;
  if (member?.role === 'admin') return <Navigate to="/admin/registrations" replace />;
  if (member?.status === 'approved') return <Navigate to="/member" replace />;
  return <Navigate to="/pending-approval" replace />;
};
