#!/usr/bin/env ts-node

/**
 * Database Seeding Script
 * Seeds realistic test data for all tables to demonstrate working functionality
 */

import { createClient } from '@supabase/supabase-js';
import * as dotenv from 'dotenv';
import * as path from 'path';

// Load environment variables from apps/web/.env
dotenv.config({ path: path.join(__dirname, '../apps/web/.env') });

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const SUPABASE_KEY = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_KEY) {
  console.error('❌ Missing Supabase configuration!');
  console.error('SUPABASE_URL:', SUPABASE_URL);
  console.error('Please check apps/web/.env file');
  process.exit(1);
}

console.log('🔗 Connecting to Supabase at:', SUPABASE_URL);
const supabase = createClient(SUPABASE_URL, SUPABASE_KEY);

// Helper to generate random dates
function randomDate(start: Date, end: Date): string {
  return new Date(start.getTime() + Math.random() * (end.getTime() - start.getTime())).toISOString();
}

function addDays(date: Date, days: number): Date {
  const result = new Date(date);
  result.setDate(result.getDate() + days);
  return result;
}

// Seed data generators
const materials = ['Aluminum 6061', 'Aluminum 7075', 'Stainless Steel 304', 'Stainless Steel 316', 'Carbon Steel', 'Brass', 'Copper', 'Titanium'];
const finishes = ['As Machined', 'Bead Blast', 'Anodized Clear', 'Anodized Black', 'Powder Coat', 'Chrome Plating', 'Zinc Plating'];
const customers = [
  { name: 'Acme Manufacturing', email: 'john@acme.com', contact: 'John Smith' },
  { name: 'TechParts Inc', email: 'sarah@techparts.com', contact: 'Sarah Johnson' },
  { name: 'Precision Components', email: 'mike@precision.com', contact: 'Mike Chen' },
  { name: 'Advanced Systems LLC', email: 'lisa@advanced.com', contact: 'Lisa Williams' },
  { name: 'Industrial Solutions', email: 'david@industrial.com', contact: 'David Brown' },
];
const suppliers = [
  { name: 'Premium CNC Works', id: 'SUP-001', email: 'contact@premiumcnc.com' },
  { name: 'Rapid Machining Co', id: 'SUP-002', email: 'sales@rapidmachining.com' },
  { name: 'Precision Manufacturing', id: 'SUP-003', email: 'info@precisionmfg.com' },
];

async function clearDatabase() {
  console.log('🧹 Clearing existing data...');
  
  // Delete in reverse order of dependencies
  await supabase.from('shipments').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('order_timeline').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('kanban_state').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('bids').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('rfqs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('orders').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('quote_configs').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  await supabase.from('quotes').delete().neq('id', '00000000-0000-0000-0000-000000000000');
  
  console.log('✅ Database cleared');
}

async function seedQuotes() {
  console.log('📝 Seeding quotes...');
  
  const quotes = [];
  const now = new Date();
  
  for (let i = 0; i < 10; i++) {
    const customer = customers[i % customers.length];
    const quoteId = `Q-2024-${String(i + 1).padStart(3, '0')}`;
    const createdAt = randomDate(addDays(now, -60), addDays(now, -1));
    
    const parts = Array.from({ length: Math.floor(Math.random() * 3) + 1 }, (_, j) => ({
      id: `part-${quoteId}-${j + 1}`,
      file_name: `part-${j + 1}.step`,
      quantity: [5, 10, 25, 50, 100][Math.floor(Math.random() * 5)],
      material: materials[Math.floor(Math.random() * materials.length)],
      finish: finishes[Math.floor(Math.random() * finishes.length)],
    }));
    
    const totalPrice = parts.reduce((sum, part) => {
      const basePrice = Math.random() * 200 + 50;
      return sum + (basePrice * part.quantity);
    }, 0);
    
    quotes.push({
      id: quoteId,
      customer_email: customer.email,
      customer_name: customer.contact,
      company_name: customer.name,
      parts: parts,
      total_price: Math.round(totalPrice * 100) / 100,
      lead_time_days: Math.floor(Math.random() * 10) + 5,
      status: ['pending', 'approved', 'expired'][Math.floor(Math.random() * 3)],
      created_at: createdAt,
      updated_at: createdAt,
    });
  }
  
  const { error } = await supabase.from('quotes').insert(quotes);
  if (error) {
    console.error('❌ Error seeding quotes:', error);
  } else {
    console.log(`✅ Seeded ${quotes.length} quotes`);
  }
  
  return quotes;
}

async function seedQuoteConfigs(quotes: any[]) {
  console.log('⚙️  Seeding quote configs...');
  
  const configs = quotes.slice(0, 5).map((quote, i) => ({
    quote_id: quote.id,
    material: quote.parts[0].material,
    finish: quote.parts[0].finish,
    tolerance: ['Standard', 'Precision', 'High Precision'][i % 3],
    thread_specification: i % 2 === 0 ? 'M6 x 1.0' : null,
    additional_notes: i % 3 === 0 ? 'Please deburr all edges' : null,
    created_at: quote.created_at,
    updated_at: quote.updated_at,
  }));
  
  const { error } = await supabase.from('quote_configs').insert(configs);
  if (error) {
    console.error('❌ Error seeding quote configs:', error);
  } else {
    console.log(`✅ Seeded ${configs.length} quote configs`);
  }
}

async function seedOrders(quotes: any[]) {
  console.log('📦 Seeding orders...');
  
  const orders = [];
  const approvedQuotes = quotes.filter(q => q.status === 'approved').slice(0, 8);
  
  for (let i = 0; i < approvedQuotes.length; i++) {
    const quote = approvedQuotes[i];
    const orderId = `ORD-2024-${String(i + 1).padStart(3, '0')}`;
    const statuses = ['pending', 'in_production', 'in_production', 'qa_final', 'ready_to_ship', 'shipped', 'completed', 'completed'];
    const status = statuses[i];
    
    orders.push({
      id: orderId,
      quote_id: quote.id,
      customer_email: quote.customer_email,
      customer_name: quote.customer_name,
      company_name: quote.company_name,
      parts: quote.parts,
      total_price: quote.total_price,
      lead_time_days: quote.lead_time_days,
      status: status,
      payment_status: ['completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed', 'completed'][i],
      created_at: quote.created_at,
      updated_at: randomDate(new Date(quote.created_at), new Date()),
    });
  }
  
  const { error } = await supabase.from('orders').insert(orders);
  if (error) {
    console.error('❌ Error seeding orders:', error);
  } else {
    console.log(`✅ Seeded ${orders.length} orders`);
  }
  
  return orders;
}

async function seedRFQs(orders: any[]) {
  console.log('📋 Seeding RFQs...');
  
  const rfqs = [];
  
  for (let i = 0; i < orders.length; i++) {
    const order = orders[i];
    const rfqId = `RFQ-2024-${String(i + 1).padStart(3, '0')}`;
    const statuses = ['open', 'open', 'bidding', 'awarded', 'awarded', 'awarded', 'completed', 'completed'];
    
    rfqs.push({
      id: rfqId,
      order_id: order.id,
      quote_id: order.quote_id,
      parts: order.parts,
      target_price: order.total_price,
      deadline: addDays(new Date(order.created_at), 3).toISOString(),
      status: statuses[i],
      created_at: order.created_at,
      updated_at: order.updated_at,
    });
  }
  
  const { error } = await supabase.from('rfqs').insert(rfqs);
  if (error) {
    console.error('❌ Error seeding RFQs:', error);
  } else {
    console.log(`✅ Seeded ${rfqs.length} RFQs`);
  }
  
  return rfqs;
}

async function seedBids(rfqs: any[]) {
  console.log('💰 Seeding bids...');
  
  const bids = [];
  
  for (let i = 0; i < rfqs.length; i++) {
    const rfq = rfqs[i];
    const numBids = i < 2 ? 0 : Math.floor(Math.random() * 3) + 1; // First 2 RFQs have no bids yet
    
    for (let j = 0; j < numBids; j++) {
      const supplier = suppliers[j % suppliers.length];
      const bidAmount = rfq.target_price * (0.85 + Math.random() * 0.25); // 85-110% of target
      const leadTime = rfq.parts[0]?.quantity > 50 ? Math.floor(Math.random() * 5) + 10 : Math.floor(Math.random() * 5) + 5;
      const statuses = ['pending', 'approved', 'rejected'];
      const status = i < 3 ? 'pending' : statuses[j % 3];
      
      bids.push({
        rfq_id: rfq.id,
        supplier_id: supplier.id,
        supplier_name: supplier.name,
        supplier_email: supplier.email,
        bid_amount: Math.round(bidAmount * 100) / 100,
        lead_time_days: leadTime,
        notes: j === 0 ? 'We have immediate capacity available' : j === 1 ? 'Bulk discount applied' : 'Standard lead time',
        status: status,
        created_at: randomDate(new Date(rfq.created_at), addDays(new Date(rfq.created_at), 2)),
        updated_at: randomDate(addDays(new Date(rfq.created_at), 2), new Date()),
      });
    }
  }
  
  const { error } = await supabase.from('bids').insert(bids);
  if (error) {
    console.error('❌ Error seeding bids:', error);
  } else {
    console.log(`✅ Seeded ${bids.length} bids`);
  }
  
  return bids;
}

async function seedKanbanState(orders: any[]) {
  console.log('📊 Seeding kanban state...');
  
  const kanbanCards = [];
  const productionOrders = orders.filter(o => ['in_production', 'qa_final', 'ready_to_ship', 'completed'].includes(o.status));
  
  for (const order of productionOrders) {
    for (let i = 0; i < order.parts.length; i++) {
      const part = order.parts[i];
      let status = 'setup';
      
      // Distribute parts across workflow stages based on order status
      if (order.status === 'in_production') {
        status = ['setup', 'cutting', 'finishing'][i % 3];
      } else if (order.status === 'qa_final') {
        status = 'inspection';
      } else if (['ready_to_ship', 'completed'].includes(order.status)) {
        status = 'done';
      }
      
      const createdAt = order.created_at;
      const startedAt = status !== 'setup' ? randomDate(new Date(createdAt), addDays(new Date(createdAt), 2)) : null;
      const completedAt = status === 'done' ? randomDate(addDays(new Date(createdAt), 5), addDays(new Date(createdAt), order.lead_time_days)) : null;
      
      kanbanCards.push({
        order_id: order.id,
        part_id: part.id,
        part_name: part.file_name,
        status: status,
        notes: status === 'done' ? 'Completed - QA passed' : status === 'inspection' ? 'Final inspection in progress' : '',
        started_at: startedAt,
        completed_at: completedAt,
        created_at: createdAt,
        updated_at: completedAt || startedAt || createdAt,
      });
    }
  }
  
  const { error } = await supabase.from('kanban_state').insert(kanbanCards);
  if (error) {
    console.error('❌ Error seeding kanban state:', error);
  } else {
    console.log(`✅ Seeded ${kanbanCards.length} kanban cards`);
  }
}

async function seedOrderTimeline(orders: any[]) {
  console.log('⏱️  Seeding order timeline...');
  
  const timelineEvents = [];
  
  for (const order of orders) {
    const events = [
      {
        order_id: order.id,
        event_type: 'order_placed',
        title: 'Order Placed',
        description: `Order ${order.id} has been received and confirmed`,
        created_at: order.created_at,
      }
    ];
    
    if (['in_production', 'qa_final', 'ready_to_ship', 'shipped', 'completed'].includes(order.status)) {
      events.push({
        order_id: order.id,
        event_type: 'production_started',
        title: 'Production Started',
        description: 'Manufacturing has begun on your parts',
        created_at: randomDate(new Date(order.created_at), addDays(new Date(order.created_at), 2)),
      });
    }
    
    if (['qa_final', 'ready_to_ship', 'shipped', 'completed'].includes(order.status)) {
      events.push({
        order_id: order.id,
        event_type: 'quality_check',
        title: 'Quality Inspection',
        description: 'Parts passed quality control inspection',
        created_at: randomDate(addDays(new Date(order.created_at), 4), addDays(new Date(order.created_at), 6)),
      });
    }
    
    if (['shipped', 'completed'].includes(order.status)) {
      events.push({
        order_id: order.id,
        event_type: 'shipped',
        title: 'Order Shipped',
        description: 'Your order has been shipped via FedEx - Tracking: FDX123456789',
        created_at: randomDate(addDays(new Date(order.created_at), 7), addDays(new Date(order.created_at), 9)),
      });
    }
    
    if (order.status === 'completed') {
      events.push({
        order_id: order.id,
        event_type: 'delivered',
        title: 'Delivered',
        description: 'Order has been delivered successfully',
        created_at: randomDate(addDays(new Date(order.created_at), order.lead_time_days), addDays(new Date(order.created_at), order.lead_time_days + 2)),
      });
    }
    
    timelineEvents.push(...events);
  }
  
  const { error } = await supabase.from('order_timeline').insert(timelineEvents);
  if (error) {
    console.error('❌ Error seeding order timeline:', error);
  } else {
    console.log(`✅ Seeded ${timelineEvents.length} timeline events`);
  }
}

async function seedShipments(orders: any[]) {
  console.log('🚚 Seeding shipments...');
  
  const shipments = [];
  const shippedOrders = orders.filter(o => ['shipped', 'completed'].includes(o.status));
  
  for (let i = 0; i < shippedOrders.length; i++) {
    const order = shippedOrders[i];
    const carriers = ['FedEx', 'UPS', 'DHL'];
    const carrier = carriers[i % carriers.length];
    const trackingNumber = `${carrier.substring(0, 3).toUpperCase()}${Math.floor(Math.random() * 1000000000)}`;
    
    const shippedAt = randomDate(addDays(new Date(order.created_at), 7), addDays(new Date(order.created_at), 9));
    const deliveredAt = order.status === 'completed' 
      ? randomDate(new Date(shippedAt), addDays(new Date(shippedAt), 3))
      : null;
    
    shipments.push({
      order_id: order.id,
      tracking_number: trackingNumber,
      carrier: carrier,
      status: order.status === 'completed' ? 'delivered' : 'in_transit',
      shipped_at: shippedAt,
      delivered_at: deliveredAt,
      estimated_delivery: deliveredAt || addDays(new Date(shippedAt), 2).toISOString(),
      created_at: shippedAt,
      updated_at: deliveredAt || shippedAt,
    });
  }
  
  const { error } = await supabase.from('shipments').insert(shipments);
  if (error) {
    console.error('❌ Error seeding shipments:', error);
  } else {
    console.log(`✅ Seeded ${shipments.length} shipments`);
  }
}

async function main() {
  console.log('🌱 Starting database seeding...\n');
  
  try {
    // Clear existing data
    await clearDatabase();
    console.log('');
    
    // Seed in dependency order
    const quotes = await seedQuotes();
    await seedQuoteConfigs(quotes);
    const orders = await seedOrders(quotes);
    const rfqs = await seedRFQs(orders);
    await seedBids(rfqs);
    await seedKanbanState(orders);
    await seedOrderTimeline(orders);
    await seedShipments(orders);
    
    console.log('\n✅ Database seeding completed successfully!');
    console.log('\n📊 Summary:');
    console.log('  - 10 quotes with parts and pricing');
    console.log('  - 5 quote configurations');
    console.log('  - 8 orders in various stages');
    console.log('  - 8 RFQs (some open, some awarded)');
    console.log('  - Multiple bids from different suppliers');
    console.log('  - Kanban cards tracking production');
    console.log('  - Order timeline events');
    console.log('  - Shipment tracking data');
    console.log('\n🚀 You can now test all pages with real data!');
    
  } catch (error) {
    console.error('❌ Seeding failed:', error);
    process.exit(1);
  }
}

main();
