"use client";
import React from 'react';
import { useUserSession } from './useUserSession';

interface RequireRoleProps {
  role: string;
  children: React.ReactNode;
  fallback?: React.ReactNode;
}

export const RequireRole: React.FC<RequireRoleProps> = ({ role, children, fallback = null }) => {
  const { loading, user } = useUserSession();
  if (loading) return <div className="text-xs text-gray-500 animate-pulse">Checking access…</div>;
  if (!user || user.role !== role) return <>{fallback}</>;
  return <>{children}</>;
};
