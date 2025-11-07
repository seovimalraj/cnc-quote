/**
 * Seed Script for CNC Quote Portals Demo Data
 * Creates users, organizations, quotes, orders for Admin, Customer, and Supplier portals
 */

import { createClient } from '@supabase/supabase-js';
import { readFileSync } from 'fs';
import { join } from 'path';

const SUPABASE_URL = process.env.SUPABASE_URL || 'http://localhost:54321';
const SUPABASE_SERVICE_KEY = process.env.SUPABASE_SERVICE_ROLE_KEY || process.env.SUPABASE_SERVICE_KEY || '';

if (!SUPABASE_SERVICE_KEY) {
  console.error('❌ SUPABASE_SERVICE_ROLE_KEY environment variable is required');
  process.exit(1);
}

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_KEY, {
  auth: {
    autoRefreshToken: false,
    persistSession: false
  }
});

const DEMO_USERS = [
  {
    id: 'a0000000-0000-0000-0000-000000000001',
    email: 'admin@cncquote.com',
    password: 'Demo123!',
    full_name: 'Admin User',
    role: 'admin',
    org_id: '00000000-0000-0000-0000-000000000001',
    org_name: 'Admin Org'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000002',
    email: 'customer@acme.com',
    password: 'Demo123!',
    full_name: 'Jane Smith',
    role: 'admin',
    org_id: '00000000-0000-0000-0000-000000000002',
    org_name: 'Acme Manufacturing'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000004',
    email: 'john@acme.com',
    password: 'Demo123!',
    full_name: 'John Doe',
    role: 'member',
    org_id: '00000000-0000-0000-0000-000000000002',
    org_name: 'Acme Manufacturing'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000003',
    email: 'supplier@precision.com',
    password: 'Demo123!',
    full_name: 'Mike Johnson',
    role: 'admin',
    org_id: '00000000-0000-0000-0000-000000000003',
    org_name: 'Precision Supplier Inc'
  },
  {
    id: 'a0000000-0000-0000-0000-000000000005',
    email: 'sarah@precision.com',
    password: 'Demo123!',
    full_name: 'Sarah Williams',
    role: 'member',
    org_id: '00000000-0000-0000-0000-000000000003',
    org_name: 'Precision Supplier Inc'
  }
];

async function createAuthUsers() {
  console.log('\n📝 Creating auth users...');
  
  for (const user of DEMO_USERS) {
    try {
      // Check if user exists
      const { data: existingUser } = await supabase.auth.admin.getUserById(user.id);
      
      if (existingUser) {
        console.log(`  ✓ User already exists: ${user.email}`);
        continue;
      }

      // Create user
      const { data, error } = await supabase.auth.admin.createUser({
        id: user.id,
        email: user.email,
        password: user.password,
        email_confirm: true,
        user_metadata: {
          full_name: user.full_name,
          organization_id: user.org_id,
          role: user.role
        }
      });

      if (error) {
        console.error(`  ✗ Error creating ${user.email}:`, error.message);
      } else {
        console.log(`  ✓ Created: ${user.email}`);
      }
    } catch (err) {
      console.error(`  ✗ Exception creating ${user.email}:`, err);
    }
  }
}

async function runSQLSeed() {
  console.log('\n📊 Running SQL seed script...');
  
  try {
    const sqlPath = join(__dirname, 'seed-portals-demo.sql');
    const sql = readFileSync(sqlPath, 'utf-8');
    
    // Execute SQL (split by statement and run individually)
    const statements = sql
      .split(';')
      .map(s => s.trim())
      .filter(s => s && !s.startsWith('--') && s !== '');
    
    for (const statement of statements) {
      try {
        const { error } = await supabase.rpc('exec_sql', { sql_query: statement });
        if (error && !error.message.includes('already exists')) {
          console.log(`  ⚠️  ${error.message.substring(0, 100)}`);
        }
      } catch (err: any) {
        // Ignore certain errors
        if (!err.message?.includes('already exists') && !err.message?.includes('does not exist')) {
          console.log(`  ⚠️  ${err.message?.substring(0, 100)}`);
        }
      }
    }
    
    console.log('  ✓ SQL seed completed');
  } catch (err) {
    console.error('  ✗ Error running SQL seed:', err);
  }
}

async function manualDataInsert() {
  console.log('\n🔧 Inserting data via Supabase client...');
  
  // Insert organizations
  const orgs = [
    { id: '00000000-0000-0000-0000-000000000001', name: 'Admin Org', slug: 'admin-org' },
    { id: '00000000-0000-0000-0000-000000000002', name: 'Acme Manufacturing', slug: 'acme-manufacturing' },
    { id: '00000000-0000-0000-0000-000000000003', name: 'Precision Supplier Inc', slug: 'precision-supplier' }
  ];
  
  for (const org of orgs) {
    const { error } = await supabase
      .from('organizations')
      .upsert(org, { onConflict: 'id' });
    
    if (error && !error.message.includes('already exists')) {
      console.log(`  ⚠️  Org error: ${error.message}`);
    } else {
      console.log(`  ✓ Organization: ${org.name}`);
    }
  }
  
  // Insert users table data
  for (const user of DEMO_USERS) {
    const { error } = await supabase
      .from('users')
      .upsert({
        id: user.id,
        email: user.email,
        organization_id: user.org_id,
        role: user.role,
        status: 'active'
      }, { onConflict: 'id' });
    
    if (error && !error.message.includes('already exists')) {
      console.log(`  ⚠️  User error: ${error.message}`);
    } else {
      console.log(`  ✓ User: ${user.email}`);
    }
  }
  
  console.log('  ✓ Data insert completed');
}

async function main() {
  console.log('🚀 CNC Quote Portal Seeding Started');
  console.log('==================================');
  
  await createAuthUsers();
  await manualDataInsert();
  
  console.log('\n✅ Seeding completed!');
  console.log('\n📋 Login Credentials:');
  console.log('==================================');
  console.log('ADMIN PORTAL:');
  console.log('  Email: admin@cncquote.com');
  console.log('  Password: Demo123!');
  console.log('');
  console.log('CUSTOMER PORTAL:');
  console.log('  Email: customer@acme.com');
  console.log('  Password: Demo123!');
  console.log('  (or) john@acme.com / Demo123!');
  console.log('');
  console.log('SUPPLIER PORTAL:');
  console.log('  Email: supplier@precision.com');
  console.log('  Password: Demo123!');
  console.log('  (or) sarah@precision.com / Demo123!');
  console.log('==================================\n');
}

main().catch(console.error);
