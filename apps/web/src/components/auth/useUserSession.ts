"use client";
import { useEffect, useState } from 'react';
import { createClient } from '@/lib/supabase/client';

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
      const supabase = createClient();
      const { data: { session } } = await supabase.auth.getSession();
      if (session?.user) {
        // Custom claims may carry role/org; fallback fetch from /api/me if needed
        const role = (session.user.app_metadata as any)?.role || (session.user.user_metadata as any)?.role || 'user';
        const org_id = (session.user.app_metadata as any)?.org_id || (session.user.user_metadata as any)?.org_id;
        setUser({ id: session.user.id, email: session.user.email!, role, org_id });
      } else {
        setUser(null);
      }
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
      const supabase = createClient();
      await supabase.auth.signOut();
      setUser(null);
    }
  };
}
