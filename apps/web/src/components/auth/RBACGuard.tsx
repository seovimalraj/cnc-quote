import React from 'react';
import { useAuth } from '../contexts/AuthContext';

interface RBACGuardProps {
  children: React.ReactNode;
  allowedRoles: ('admin' | 'engineer' | 'buyer' | 'security_analyst')[];
  fallback?: React.ReactNode;
}

export function RBACGuard({ children, allowedRoles, fallback = null }: RBACGuardProps) {
  const { user } = useAuth();

  if (!user || !allowedRoles.includes(user.role)) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
