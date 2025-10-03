"use client";
import React from 'react';
import { useUserSession } from './useUserSession';

interface RequireAnyRoleProps {
  roles: string[];
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RequireAnyRole: React.FC<RequireAnyRoleProps> = ({ roles, children, fallback = null }) => {
  const { loading, user } = useUserSession();
  if (loading) return <div className="text-xs text-gray-500 animate-pulse">Checking access…</div>;
  if (!user || !roles.includes(user.role)) return <>{fallback}</>;
  return <>{children}</>;
};
