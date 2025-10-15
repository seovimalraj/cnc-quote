import type { Session } from '@supabase/supabase-js';

import { createClient } from '@/lib/supabase/server';

export type AuthContext = {
  session: Session | null;
  orgId: string | null;
};

export async function getAuthContext(): Promise<AuthContext> {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const session = data.session ?? null;

  const userMetadata = (session?.user?.app_metadata as Record<string, unknown> | undefined) ?? {};
  const profileMetadata = (session?.user?.user_metadata as Record<string, unknown> | undefined) ?? {};

  const orgId =
    (userMetadata.org_id as string | undefined) ??
    (profileMetadata.org_id as string | undefined) ??
    null;

  return { session, orgId };
}
