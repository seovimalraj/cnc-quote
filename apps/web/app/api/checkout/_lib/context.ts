import { createClient } from '@/lib/supabase/server';

export interface OrgAuthContext {
  supabase: Awaited<ReturnType<typeof createClient>>;
  user: Awaited<ReturnType<typeof getAuthUser>>['user'];
  orgId: string | null;
}

export interface OrgAuthContextStrict extends OrgAuthContext {
  user: NonNullable<OrgAuthContext['user']>;
  orgId: string;
}

interface SupabaseAuthUser {
  app_metadata?: Record<string, unknown>;
  user_metadata?: Record<string, unknown>;
}

const getAuthUser = async () => {
  const supabase = await createClient();
  const { data } = await supabase.auth.getUser();
  return { supabase, user: data.user ?? null };
};

export const extractOrgId = (user: SupabaseAuthUser | null): string | null => {
  if (!user) {
    return null;
  }

  const appMetadata = (user.app_metadata ?? {}) as Record<string, unknown>;
  const userMetadata = (user.user_metadata ?? {}) as Record<string, unknown>;

  return (
    (userMetadata.org_id as string | undefined) ??
    (appMetadata.org_id as string | undefined) ??
    null
  );
};

export async function getOrgAuthContext(): Promise<OrgAuthContext> {
  const { supabase, user } = await getAuthUser();
  const orgId = extractOrgId(user);
  return { supabase, user, orgId };
}

export class MissingOrgContextError extends Error {
  constructor(message = 'Organization context not available') {
    super(message);
    this.name = 'MissingOrgContextError';
  }
}

export async function requireOrgAuthContext(): Promise<OrgAuthContextStrict> {
  const context = await getOrgAuthContext();
  if (!context.user) {
    throw new MissingOrgContextError('Authentication required');
  }
  if (!context.orgId) {
    throw new MissingOrgContextError('Organization context required');
  }
  return context as OrgAuthContextStrict;
}
