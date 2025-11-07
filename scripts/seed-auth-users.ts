#!/usr/bin/env tsx

/**
 * Seed demo data for portals using Supabase Admin API
 * Creates auth users and database records
 */

import { createClient } from '@supabase/supabase-js';

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL || 'https://app.frigate.ai/db';
const SUPABASE_SERVICE_ROLE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || '';

if (!SUPABASE_SERVICE_ROLE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const users = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@cncquote.com',
    password: 'Demo123!',
    org_name: 'Admin Org',
    org_id: '00000000-0000-0000-0000-000000000001',
    full_name: 'Admin User',
    role: 'admin'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    email: 'customer@acme.com',
    password: 'Demo123!',
    org_name: 'Acme Manufacturing',
    org_id: '00000000-0000-0000-0000-000000000002',
    full_name: 'Jane Smith',
    role: 'admin'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    email: 'john@acme.com',
    password: 'Demo123!',
    org_name: 'Acme Manufacturing',
    org_id: '00000000-0000-0000-0000-000000000002',
    full_name: 'John Doe',
    role: 'member'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    email: 'supplier@precision.com',
    password: 'Demo123!',
    org_name: 'Precision Supplier Inc',
    org_id: '00000000-0000-0000-0000-000000000003',
    full_name: 'Mike Johnson',
    role: 'admin'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    email: 'sarah@precision.com',
    password: 'Demo123!',
    org_name: 'Precision Supplier Inc',
    org_id: '00000000-0000-0000-0000-000000000003',
    full_name: 'Sarah Williams',
    role: 'member'
  }
];

async function main() {
  console.log('🚀 Starting portal demo data seed...\n');

  // Create auth users
  console.log('📝 Creating Supabase Auth users...');
  for (const user of users) {
    try {
      const { data, error } = await supabase.auth.admin.createUser({
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name,
          org_id: user.org_id,
          role: user.role
        }
      });

      if (error) {
        if (error.message.includes('already registered')) {
          console.log(`  ⚠️  ${user.email} - already exists, skipping`);
        } else {
          console.error(`  ❌ ${user.email} - ${error.message}`);
        }
      } else {
        console.log(`  ✓ ${user.email} created (${user.role})`);
      }
    } catch (err: any) {
      console.error(`  ❌ ${user.email} - ${err.message}`);
    }
  }

  console.log('\n✅ Auth users creation completed!');
  console.log('\n📊 Login Credentials (all use password: Demo123!):');
  console.log('  - admin@cncquote.com (Admin Portal)');
  console.log('  - customer@acme.com (Customer Portal)');
  console.log('  - john@acme.com (Customer Portal)');
  console.log('  - supplier@precision.com (Supplier Portal)');
  console.log('  - sarah@precision.com (Supplier Portal)');
  console.log('\n✅ Demo seed completed! Now run the SQL seed script to create org/quote/order data.');
}

main().catch(console.error);
