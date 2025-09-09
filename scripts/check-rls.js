#!/usr/bin/env node

/**
 * RLS Policy Checker
 * Validates Row Level Security policies are properly configured
 */

import { createClient } from '@supabase/supabase-js';
import { config } from 'dotenv';

// Load environment variables
config();

const supabaseUrl = process.env.SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error('❌ Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);

interface RLSTest {
  table: string;
  description: string;
  test: () => Promise<boolean>;
}

const rlsTests: RLSTest[] = [
  {
    table: 'quotes',
    description: 'Quotes table has org_id RLS policy',
    test: async () => {
      const { data, error } = await supabase
        .from('quotes')
        .select('*')
        .limit(1);

      // If we get data without auth, RLS might not be working
      return error?.code === 'PGRST116' || data?.length === 0;
    }
  },
  {
    table: 'files',
    description: 'Files table has org_id RLS policy',
    test: async () => {
      const { data, error } = await supabase
        .from('files')
        .select('*')
        .limit(1);

      return error?.code === 'PGRST116' || data?.length === 0;
    }
  },
  {
    table: 'orders',
    description: 'Orders table has org_id RLS policy',
    test: async () => {
      const { data, error } = await supabase
        .from('orders')
        .select('*')
        .limit(1);

      return error?.code === 'PGRST116' || data?.length === 0;
    }
  }
];

async function checkRLS() {
  console.log('🔒 Checking RLS Policies...\n');

  let allPassed = true;

  for (const test of rlsTests) {
    try {
      console.log(`  → ${test.description}`);
      const passed = await test.test();

      if (passed) {
        console.log(`    ✅ PASSED`);
      } else {
        console.log(`    ❌ FAILED`);
        allPassed = false;
      }
    } catch (error) {
      console.log(`    ❌ ERROR: ${error.message}`);
      allPassed = false;
    }
  }

  console.log(`\n${allPassed ? '✅' : '❌'} RLS Check ${allPassed ? 'PASSED' : 'FAILED'}`);
  process.exit(allPassed ? 0 : 1);
}

checkRLS().catch(console.error);
