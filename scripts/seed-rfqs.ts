import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.SUPABASE_URL || 'http://localhost/db';
const supabaseKey = process.env.SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZS1kZW1vIiwicm9sZSI6ImFub24iLCJleHAiOjE5ODM4MTI5OTZ9.ARCQ9fz5iWIEe7rtWe7LUFGk6KFiHHCiKmEczlr0jU0';

const supabase = createClient(supabaseUrl, supabaseKey);

async function seedRFQs() {
  console.log('🌱 Seeding RFQ and Bid demo data...\n');

  try {
    // Get existing orders
    const { data: orders, error: ordersError } = await supabase
      .from('orders')
      .select('*')
      .limit(3);

    if (ordersError) throw ordersError;

    if (!orders || orders.length === 0) {
      console.log('❌ No orders found. Please seed orders first.');
      return;
    }

    console.log(`✅ Found ${orders.length} orders\n`);

    // Create RFQs for each order
    const rfqsToCreate = orders.map((order, index) => {
      const closeDate = new Date();
      closeDate.setDate(closeDate.getDate() + (7 - index * 2)); // Stagger close dates

      return {
        order_id: order.id,
        display_value: Math.round(order.total_price / 2), // Show partial value for privacy
        materials: Array.from(new Set(order.parts.map((p: any) => p.material))),
        lead_time: 7 + index * 3,
        parts: order.parts,
        status: index === 0 ? 'open' : index === 1 ? 'open' : 'closed',
        closes_at: closeDate.toISOString()
      };
    });

    // Insert RFQs
    const { data: rfqs, error: rfqError } = await supabase
      .from('rfqs')
      .upsert(rfqsToCreate, { onConflict: 'order_id' })
      .select();

    if (rfqError) throw rfqError;

    console.log(`✅ Created/Updated ${rfqs.length} RFQs\n`);

    // Create demo bids for each RFQ
    const suppliers = [
      {
        id: 'SUPP-001',
        name: 'Precision Parts Inc.',
        quality_score: 4.8,
        on_time_rate: 0.95
      },
      {
        id: 'SUPP-002',
        name: 'Acme Manufacturing',
        quality_score: 4.5,
        on_time_rate: 0.88
      },
      {
        id: 'SUPP-003',
        name: 'Titan CNC Solutions',
        quality_score: 4.9,
        on_time_rate: 0.97
      },
      {
        id: 'SUPP-004',
        name: 'ProMach Industries',
        quality_score: 4.3,
        on_time_rate: 0.85
      }
    ];

    const bidsToCreate: any[] = [];

    rfqs.forEach((rfq, rfqIndex) => {
      // Create 2-4 bids per RFQ
      const numBids = 2 + (rfqIndex % 3);
      const basePrice = rfq.display_value * 2;

      for (let i = 0; i < numBids; i++) {
        const supplier = suppliers[i % suppliers.length];
        const priceVariation = 1 + (Math.random() * 0.3 - 0.15); // ±15% variation
        const leadTimeVariation = Math.floor(Math.random() * 3 - 1); // ±1 day

        bidsToCreate.push({
          rfq_id: rfq.id,
          supplier_id: supplier.id,
          supplier_name: supplier.name,
          price: Math.round(basePrice * priceVariation * 100) / 100,
          lead_time: Math.max(rfq.lead_time + leadTimeVariation, 3),
          notes: [
            'ISO 9001 certified facility',
            'AS9100D certified',
            'Can expedite if needed',
            'Volume discounts available',
            'Free shipping included'
          ][i],
          quality_score: supplier.quality_score,
          on_time_rate: supplier.on_time_rate,
          status: rfqIndex === 0 && i === 0 ? 'accepted' : 
                  rfqIndex === 2 ? 'rejected' : 'pending'
        });
      }
    });

    // Insert bids
    const { data: bids, error: bidsError } = await supabase
      .from('bids')
      .upsert(bidsToCreate, { onConflict: 'rfq_id,supplier_id' })
      .select();

    if (bidsError) throw bidsError;

    console.log(`✅ Created/Updated ${bids.length} bids\n`);

    // Print summary
    console.log('📊 Summary:');
    console.log('─────────────────────────────────────');
    
    for (const rfq of rfqs) {
      const rfqBids = bids.filter(b => b.rfq_id === rfq.id);
      console.log(`\n🎯 RFQ: ${rfq.id}`);
      console.log(`   Status: ${rfq.status}`);
      console.log(`   Order: ${rfq.order_id}`);
      console.log(`   Bids: ${rfqBids.length}`);
      
      rfqBids.forEach(bid => {
        console.log(`   - ${bid.supplier_name}: $${bid.price.toLocaleString()} (${bid.lead_time}d) [${bid.status}]`);
      });
    }

    console.log('\n✅ RFQ seed data complete!\n');

  } catch (error) {
    console.error('❌ Error seeding RFQs:', error);
    process.exit(1);
  }
}

seedRFQs();
