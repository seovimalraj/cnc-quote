import { createClient } from '@/lib/supabase/server';
import { EnhancedInstantQuote } from '@/components/instant-quote/EnhancedInstantQuote';
import InstantQuoteLanding from '@/components/instant-quote/InstantQuoteLanding';

export default async function InstantQuotePage() {
  const supabase = await createClient();
  const { data } = await supabase.auth.getSession();
  const session = data.session;

  if (!session) {
    return <InstantQuoteLanding />;
  }

  const appMeta = (session.user.app_metadata || {}) as Record<string, unknown>;
  const userMeta = (session.user.user_metadata || {}) as Record<string, unknown>;
  const orgId = (appMeta.org_id as string | undefined) || (userMeta.org_id as string | undefined) || session.user.id;
  const accessToken = session.access_token || undefined;

  return (
    <EnhancedInstantQuote orgId={orgId} accessToken={accessToken} baseUrl="" />
  );
}
