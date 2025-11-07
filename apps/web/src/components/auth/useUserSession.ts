"use client";
import { useEffect, useState } from 'react';

interface SessionUser {
  id: string;
  email: string;
  role: string;
  org_id?: string;
}

interface UseUserSessionResult {
  loading: boolean;
  user: SessionUser | null;
  refresh: () => Promise<void>;
  signOut: () => Promise<void>;
}

export function useUserSession(): UseUserSessionResult {
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState<SessionUser | null>(null);

  async function load() {
    setLoading(true);
    try {
      // Call our custom session endpoint instead of Supabase
      const response = await fetch('/api/auth/session', {
        credentials: 'include', // Include cookies
      });
      
      if (response.ok) {
        const data = await response.json();
        if (data.user) {
          setUser({
            id: data.user.id || data.user.sub,
            email: data.user.email,
            role: data.user.role || 'user',
            org_id: data.user.organization_id || data.user.org_id,
          });
        } else {
          setUser(null);
        }
      } else {
        setUser(null);
      }
    } catch (error) {
      console.error('Session load error:', error);
      setUser(null);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => { load(); }, []);

  return {
    loading,
    user,
    refresh: load,
    signOut: async () => {
      // Call logout endpoint to clear cookies
      await fetch('/api/auth/logout', {
        method: 'POST',
        credentials: 'include',
      });
      setUser(null);
      // Redirect to signin
      window.location.href = '/signin';
    }
  };
}
