// Seed script for marketplace demo data
// Run with: pnpm tsx scripts/seed-marketplace-demo.ts

import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'https://app.frigate.ai/db';
const supabaseKey = process.env.SUPABASE_SERVICE_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6InNlcnZpY2Vfcm9sZSIsImV4cCI6MTk4MzgxMjk5Nn0.EGIM96RAZx35lJzdJsyH-qQwv8Hdp7fsn3W0YpN81IU';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedMarketplaceData() {
  console.log('🌱 Seeding marketplace demo data...\n');

  try {
    // 1. Create sample quotes
    console.log('Creating quotes...');
    const quotes = await supabase
      .from('quotes')
      .insert([
        {
          email: 'customer@example.com',
          files: [
            { name: 'bracket.step', path: 'uploads/1234-bracket.step', size: 45600, mimeType: 'model/step' },
            { name: 'housing.stl', path: 'uploads/1234-housing.stl', size: 128400, mimeType: 'model/stl' },
            { name: 'cover.step', path: 'uploads/1234-cover.step', size: 89200, mimeType: 'model/step' }
          ],
          status: 'configured'
        }
      ])
      .select();

    console.log(`✅ Created ${quotes.data?.length} quotes`);

    // 2. Create quote configurations
    if (quotes.data && quotes.data.length > 0) {
      console.log('Creating quote configurations...');
      const quoteConfigs = await supabase
        .from('quote_configs')
        .insert([
          {
            quote_id: quotes.data[0].id,
            parts: [
              {
                id: 'part-1',
                fileName: 'bracket.step',
                material: 'Aluminum 6061',
                quantity: 50,
                tolerance: 'standard',
                finish: 'as-machined',
                leadTimeType: 'premium',
                complexity: 'easy',
                basePrice: 125
              },
              {
                id: 'part-2',
                fileName: 'housing.stl',
                material: 'Aluminum 6061',
                quantity: 50,
                tolerance: 'standard',
                finish: 'anodized-clear',
                leadTimeType: 'premium',
                complexity: 'medium',
                basePrice: 180
              },
              {
                id: 'part-3',
                fileName: 'cover.step',
                material: 'Stainless Steel 304',
                quantity: 50,
                tolerance: 'precision',
                finish: 'bead-blasted',
                leadTimeType: 'premium',
                complexity: 'complex',
                basePrice: 250
              }
            ],
            total_price: 12450.00,
            max_lead_time: 10
          }
        ])
        .select();

      console.log(`✅ Created ${quoteConfigs.data?.length} quote configurations`);

      // 3. Create orders
      console.log('Creating orders...');
      const orders = await supabase
        .from('orders')
        .insert([
          {
            id: 'ORD-2024-001',
            quote_id: quotes.data[0].id,
            customer_email: 'customer@example.com',
            customer_name: 'Acme Manufacturing',
            customer_phone: '+1 (555) 123-4567',
            customer_company: 'Acme Corp',
            shipping_address: {
              line1: '123 Industrial Blvd',
              city: 'San Francisco',
              state: 'CA',
              zip: '94105',
              country: 'USA'
            },
            parts: quoteConfigs.data![0].parts,
            total_price: 12450.00,
            status: 'rfq',
            payment_status: 'unpaid'
          },
          {
            id: 'ORD-2024-002',
            customer_email: 'tech@startup.com',
            customer_name: 'TechStartup Inc',
            customer_phone: '+1 (555) 987-6543',
            customer_company: 'TechStartup',
            shipping_address: {
              line1: '456 Innovation Way',
              city: 'Austin',
              state: 'TX',
              zip: '78701',
              country: 'USA'
            },
            parts: [
              {
                id: 'part-1',
                fileName: 'component-a.step',
                material: 'Titanium Ti-6Al-4V',
                quantity: 25,
                tolerance: 'tight',
                finish: 'polished',
                leadTimeType: 'standard',
                complexity: 'complex',
                basePrice: 450
              }
            ],
            total_price: 18750.00,
            status: 'production',
            payment_status: 'paid',
            payment_method: 'credit_card'
          },
          {
            id: 'ORD-2024-003',
            customer_email: 'eng@aerospace.com',
            customer_name: 'Aerospace Dynamics',
            customer_phone: '+1 (555) 246-8135',
            customer_company: 'Aerospace Dynamics',
            shipping_address: {
              line1: '789 Aviation Dr',
              city: 'Seattle',
              state: 'WA',
              zip: '98101',
              country: 'USA'
            },
            parts: [
              {
                id: 'part-1',
                fileName: 'turbine-blade.step',
                material: 'Stainless Steel 316',
                quantity: 100,
                tolerance: 'precision',
                finish: 'chrome-plated',
                leadTimeType: 'economy',
                complexity: 'medium',
                basePrice: 280
              }
            ],
            total_price: 35600.00,
            status: 'shipped',
            payment_status: 'paid',
            payment_method: 'purchase_order'
          }
        ])
        .select();

      console.log(`✅ Created ${orders.data?.length} orders`);

      // 4. Create RFQs
      console.log('Creating RFQs...');
      const rfqs = await supabase
        .from('rfqs')
        .insert([
          {
            id: 'RFQ-2024-001',
            order_id: 'ORD-2024-001',
            display_value: 12000.00, // Slightly masked
            materials: ['Aluminum 6061', 'Stainless Steel 304'],
            lead_time: 10,
            parts: quoteConfigs.data![0].parts.map((p: any) => ({
              ...p,
              // Remove customer-specific data
              quantity: p.quantity,
              material: p.material,
              tolerance: p.tolerance,
              finish: p.finish,
              complexity: p.complexity
            })),
            status: 'open',
            min_bid_count: 3,
            closes_at: new Date(Date.now() + 3 * 24 * 60 * 60 * 1000).toISOString() // 3 days from now
          }
        ])
        .select();

      console.log(`✅ Created ${rfqs.data?.length} RFQs`);

      // 5. Create bids
      console.log('Creating bids...');
      const bids = await supabase
        .from('bids')
        .insert([
          {
            id: 'BID-2024-001',
            rfq_id: 'RFQ-2024-001',
            supplier_name: 'Supplier A',
            price: 11800.00,
            lead_time: 8,
            notes: 'We can expedite this order. Our facility specializes in aluminum machining.',
            quality_score: 95,
            on_time_rate: 98,
            status: 'pending',
            certifications: ['ISO 9001', 'AS9100']
          },
          {
            id: 'BID-2024-002',
            rfq_id: 'RFQ-2024-001',
            supplier_name: 'Supplier B',
            price: 12200.00,
            lead_time: 7,
            notes: 'Premium quality with certified finishing processes.',
            quality_score: 92,
            on_time_rate: 94,
            status: 'pending',
            certifications: ['ISO 9001', 'ITAR']
          },
          {
            id: 'BID-2024-003',
            rfq_id: 'RFQ-2024-001',
            supplier_name: 'Supplier C',
            price: 11500.00,
            lead_time: 10,
            notes: 'Competitive pricing with standard lead time.',
            quality_score: 88,
            on_time_rate: 91,
            status: 'pending',
            certifications: ['ISO 9001']
          },
          {
            id: 'BID-2024-004',
            rfq_id: 'RFQ-2024-001',
            supplier_name: 'Supplier D',
            price: 13000.00,
            lead_time: 6,
            notes: 'Fastest turnaround with premium service.',
            quality_score: 90,
            on_time_rate: 96,
            status: 'pending',
            certifications: ['ISO 9001', 'AS9100', 'NADCAP']
          },
          {
            id: 'BID-2024-005',
            rfq_id: 'RFQ-2024-001',
            supplier_name: 'Supplier E',
            price: 12800.00,
            lead_time: 9,
            notes: 'High precision capabilities for tight tolerances.',
            quality_score: 93,
            on_time_rate: 95,
            status: 'pending',
            certifications: ['ISO 9001', 'ISO 13485']
          }
        ])
        .select();

      console.log(`✅ Created ${bids.data?.length} bids`);

      // 6. Create kanban states for production order
      console.log('Creating kanban states...');
      const kanbanStates = await supabase
        .from('kanban_state')
        .insert([
          {
            order_id: 'ORD-2024-002',
            part_id: 'part-1',
            part_name: 'component-a.step',
            status: 'cutting',
            notes: 'Material prepared, cutting in progress',
            started_at: new Date(Date.now() - 2 * 24 * 60 * 60 * 1000).toISOString()
          }
        ])
        .select();

      console.log(`✅ Created ${kanbanStates.data?.length} kanban states`);

      // 7. Create order timeline events
      console.log('Creating order timeline events...');
      const timelineEvents = await supabase
        .from('order_timeline')
        .insert([
          {
            order_id: 'ORD-2024-001',
            event_type: 'order_placed',
            title: 'Order Placed',
            description: 'Your order has been received and is being processed.'
          },
          {
            order_id: 'ORD-2024-001',
            event_type: 'rfq_created',
            title: 'RFQ Sent to Suppliers',
            description: 'Request for quotes has been distributed to verified suppliers.'
          },
          {
            order_id: 'ORD-2024-002',
            event_type: 'order_placed',
            title: 'Order Placed',
            description: 'Your order has been received.'
          },
          {
            order_id: 'ORD-2024-002',
            event_type: 'production_started',
            title: 'Production Started',
            description: 'Manufacturing has begun on your parts.'
          },
          {
            order_id: 'ORD-2024-003',
            event_type: 'order_placed',
            title: 'Order Placed',
            description: 'Your order has been received.'
          },
          {
            order_id: 'ORD-2024-003',
            event_type: 'shipped',
            title: 'Order Shipped',
            description: 'Your order has been shipped via FedEx.'
          }
        ])
        .select();

      console.log(`✅ Created ${timelineEvents.data?.length} timeline events`);

      // 8. Create shipment
      console.log('Creating shipments...');
      const shipments = await supabase
        .from('shipments')
        .insert([
          {
            order_id: 'ORD-2024-003',
            carrier: 'FedEx',
            tracking_number: '1234567890',
            shipped_at: new Date(Date.now() - 1 * 24 * 60 * 60 * 1000).toISOString(),
            estimated_delivery: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString(),
            tracking_url: 'https://www.fedex.com/fedextrack/?trknbr=1234567890',
            status: 'in_transit'
          }
        ])
        .select();

      console.log(`✅ Created ${shipments.data?.length} shipments`);
    }

    console.log('\n✅ Marketplace demo data seeded successfully!');
    console.log('\nYou can now test:');
    console.log('- Customer portal: View orders ORD-2024-001, ORD-2024-002, ORD-2024-003');
    console.log('- Supplier portal: View RFQ-2024-001 with 5 pending bids');
    console.log('- Admin portal: Review and approve bids for RFQ-2024-001');
    console.log('- Kanban board: Track production for ORD-2024-002');
    console.log('- Timeline tracking: View progress for all orders');

  } catch (error: any) {
    console.error('❌ Error seeding data:', error.message);
    if (error.details) console.error('Details:', error.details);
    if (error.hint) console.error('Hint:', error.hint);
    process.exit(1);
  }
}

seedMarketplaceData();
