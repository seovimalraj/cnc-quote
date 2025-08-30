import { test as base, expect } from '@playwright/test';
import { createClient } from '@supabase/supabase-js';

export interface TestUser {
  email: string;
  password: string;
  orgId: string;
  token: string;
}

// Extend base test with auth and helpers
export const test = base.extend<{
  adminUser: TestUser;
  portalUser: TestUser;
  supabase: ReturnType<typeof createClient>;
}>({
  // Provide admin user
  adminUser: async ({}, use) => {
    const user = {
      email: process.env.ADMIN_EMAIL || 'admin@example.com',
      password: process.env.ADMIN_PASSWORD || 'admin123',
      orgId: '',
      token: ''
    };

    // Get auth token
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const { data: { session }, error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });

    if (error) throw error;
    user.token = session!.access_token;
    user.orgId = session!.user.user_metadata.org_id;

    await use(user);
  },

  // Provide portal user
  portalUser: async ({}, use) => {
    const user = {
      email: process.env.PORTAL_EMAIL || 'user@example.com',
      password: process.env.PORTAL_PASSWORD || 'user123',
      orgId: '',
      token: ''
    };

    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );

    const { data: { session }, error } = await supabase.auth.signInWithPassword({
      email: user.email,
      password: user.password,
    });

    if (error) throw error;
    user.token = session!.access_token;
    user.orgId = session!.user.user_metadata.org_id;

    await use(user);
  },

  // Provide Supabase client
  supabase: async ({}, use) => {
    const supabase = createClient(
      process.env.SUPABASE_URL!,
      process.env.SUPABASE_ANON_KEY!
    );
    await use(supabase);
  },
});

// Helpers for file uploads
export const uploadFile = async (page: any, selector: string, filePath: string) => {
  const [fileChooser] = await Promise.all([
    page.waitForEvent('filechooser'),
    page.click(selector)
  ]);
  await fileChooser.setFiles(filePath);
};

// Helper to wait for quote status
export const waitForQuoteStatus = async (supabase: any, quoteId: string, status: string, timeoutMs = 30000) => {
  const startTime = Date.now();
  while (Date.now() - startTime < timeoutMs) {
    const { data: quote } = await supabase
      .from('quotes')
      .select('status')
      .eq('id', quoteId)
      .single();

    if (quote?.status === status) {
      return true;
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  return false;
};

export { expect } from '@playwright/test';
