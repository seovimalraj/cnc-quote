"use client";
import React from 'react';
import { useUserSession } from './useUserSession';

export function withPortalAuth<P extends object>(Component: React.ComponentType<P>) {
  const Wrapped: React.FC<P> = (props) => {
    const { user, loading } = useUserSession();
    if (loading) return <div className="p-6 text-sm text-gray-500 animate-pulse">Loading portal…</div>;
    if (!user) return <div className="p-6 text-sm text-red-600">You must sign in to view this portal section.</div>;
    return <Component {...props} />;
  };
  Wrapped.displayName = `WithPortalAuth(${Component.displayName || Component.name || 'Component'})`;
  return Wrapped;
}

export default withPortalAuth;
