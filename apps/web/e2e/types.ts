export type { Page } from '@playwright/test';
export type { SupabaseClient } from '@supabase/supabase-js';

export interface Quote {
  id: string;
  status: string;
  // Add other fields as needed
}
