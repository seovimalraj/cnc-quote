import { NextRequest, NextResponse } from 'next/server'

export interface KanbanOrder {
  id: string
  quoteId: string
  customerId?: string
  customerName: string
  customerEmail: string
  status: 'quote' | 'ordered' | 'production' | 'shipping' | 'delivered'
  priority: 'low' | 'normal' | 'high' | 'urgent'
  totalValue: number
  currency: string
  orderDate: string
  estimatedDelivery?: string
  actualDelivery?: string
  items: Array<{
    id: string
    partName: string
    fileName: string
    quantity: number
    material: string
    process: string
    unitPrice: number
  }>
  timeline: Array<{
    status: string
    timestamp: string
    notes?: string
    userId?: string
  }>
  assignedTo?: string
  tags: string[]
  notes: string
  lastUpdated: string
}

// Mock data for Kanban board (in production, this would come from database)
const mockOrders: KanbanOrder[] = [
  {
    id: 'ORD-001',
    quoteId: 'Q354767',
    customerName: 'Acme Manufacturing',
    customerEmail: 'procurement@acme.com',
    status: 'quote',
    priority: 'normal',
    totalValue: 7479,
    currency: 'USD',
    orderDate: '2025-09-19T10:00:00Z',
    estimatedDelivery: '2025-09-26T00:00:00Z',
    items: [
      {
        id: 'line-1',
        partName: 'Bracket Assembly',
        fileName: 'bracket.step',
        quantity: 18,
        material: 'Aluminum 6061',
        process: 'CNC',
        unitPrice: 49
      },
      {
        id: 'line-2',
        partName: 'Housing Component',
        fileName: 'housing.iges',
        quantity: 18,
        material: 'Aluminum 6061',
        process: 'CNC',
        unitPrice: 49
      },
      {
        id: 'line-3',
        partName: 'Cover Plate',
        fileName: 'cover.stl',
        quantity: 15,
        material: 'Aluminum 6061',
        process: 'CNC',
        unitPrice: 381
      }
    ],
    timeline: [
      {
        status: 'quote',
        timestamp: '2025-09-19T10:00:00Z',
        notes: 'Quote generated'
      }
    ],
    assignedTo: 'john.doe@company.com',
    tags: ['aerospace', 'prototype'],
    notes: 'Rush order for prototype testing',
    lastUpdated: '2025-09-19T10:00:00Z'
  },
  {
    id: 'ORD-002',
    quoteId: 'Q354766',
    customerName: 'TechCorp Industries',
    customerEmail: 'orders@techcorp.com',
    status: 'ordered',
    priority: 'high',
    totalValue: 12450,
    currency: 'USD',
    orderDate: '2025-09-18T14:30:00Z',
    estimatedDelivery: '2025-09-25T00:00:00Z',
    items: [
      {
        id: 'line-1',
        partName: 'Motor Mount',
        fileName: 'motor-mount.step',
        quantity: 25,
        material: 'Steel 4140',
        process: 'CNC',
        unitPrice: 125
      },
      {
        id: 'line-2',
        partName: 'Gear Housing',
        fileName: 'gear-housing.iges',
        quantity: 25,
        material: 'Steel 4140',
        process: 'CNC',
        unitPrice: 373
      }
    ],
    timeline: [
      {
        status: 'quote',
        timestamp: '2025-09-18T14:30:00Z',
        notes: 'Quote generated'
      },
      {
        status: 'ordered',
        timestamp: '2025-09-18T16:45:00Z',
        notes: 'Order confirmed by customer'
      }
    ],
    assignedTo: 'jane.smith@company.com',
    tags: ['automotive', 'production'],
    notes: 'Standard production run',
    lastUpdated: '2025-09-18T16:45:00Z'
  },
  {
    id: 'ORD-003',
    quoteId: 'Q354765',
    customerName: 'Precision Parts Ltd',
    customerEmail: 'manufacturing@precisionparts.com',
    status: 'production',
    priority: 'normal',
    totalValue: 8920,
    currency: 'USD',
    orderDate: '2025-09-17T09:15:00Z',
    estimatedDelivery: '2025-09-23T00:00:00Z',
    items: [
      {
        id: 'line-1',
        partName: 'Valve Body',
        fileName: 'valve-body.step',
        quantity: 12,
        material: 'Stainless Steel 316',
        process: 'CNC',
        unitPrice: 743.33
      }
    ],
    timeline: [
      {
        status: 'quote',
        timestamp: '2025-09-17T09:15:00Z',
        notes: 'Quote generated'
      },
      {
        status: 'ordered',
        timestamp: '2025-09-17T11:30:00Z',
        notes: 'Order confirmed'
      },
      {
        status: 'production',
        timestamp: '2025-09-18T08:00:00Z',
        notes: 'Production started - Machine #3'
      }
    ],
    assignedTo: 'mike.johnson@company.com',
    tags: ['medical', 'high-precision'],
    notes: 'Medical grade parts - strict tolerances required',
    lastUpdated: '2025-09-18T08:00:00Z'
  },
  {
    id: 'ORD-004',
    quoteId: 'Q354764',
    customerName: 'Aerospace Dynamics',
    customerEmail: 'supply@aerodynamics.com',
    status: 'shipping',
    priority: 'urgent',
    totalValue: 15680,
    currency: 'USD',
    orderDate: '2025-09-16T13:20:00Z',
    estimatedDelivery: '2025-09-20T00:00:00Z',
    items: [
      {
        id: 'line-1',
        partName: 'Wing Bracket',
        fileName: 'wing-bracket.step',
        quantity: 8,
        material: 'Titanium Ti-6Al-4V',
        process: 'CNC',
        unitPrice: 1960
      }
    ],
    timeline: [
      {
        status: 'quote',
        timestamp: '2025-09-16T13:20:00Z',
        notes: 'Quote generated'
      },
      {
        status: 'ordered',
        timestamp: '2025-09-16T14:00:00Z',
        notes: 'Urgent order confirmed'
      },
      {
        status: 'production',
        timestamp: '2025-09-17T06:00:00Z',
        notes: 'Rush production started'
      },
      {
        status: 'shipping',
        timestamp: '2025-09-19T12:00:00Z',
        notes: 'Shipped via FedEx overnight - Tracking: 123456789'
      }
    ],
    assignedTo: 'sarah.wilson@company.com',
    tags: ['aerospace', 'titanium', 'rush'],
    notes: 'Critical delivery - expedited shipping',
    lastUpdated: '2025-09-19T12:00:00Z'
  },
  {
    id: 'ORD-005',
    quoteId: 'Q354763',
    customerName: 'Marine Solutions',
    customerEmail: 'orders@marinesolutions.com',
    status: 'delivered',
    priority: 'low',
    totalValue: 3420,
    currency: 'USD',
    orderDate: '2025-09-10T11:45:00Z',
    estimatedDelivery: '2025-09-17T00:00:00Z',
    actualDelivery: '2025-09-16T15:30:00Z',
    items: [
      {
        id: 'line-1',
        partName: 'Propeller Hub',
        fileName: 'propeller-hub.step',
        quantity: 6,
        material: 'Aluminum 5083',
        process: 'CNC',
        unitPrice: 570
      }
    ],
    timeline: [
      {
        status: 'quote',
        timestamp: '2025-09-10T11:45:00Z',
        notes: 'Quote generated'
      },
      {
        status: 'ordered',
        timestamp: '2025-09-10T16:20:00Z',
        notes: 'Order confirmed'
      },
      {
        status: 'production',
        timestamp: '2025-09-12T08:00:00Z',
        notes: 'Production completed'
      },
      {
        status: 'shipping',
        timestamp: '2025-09-14T10:00:00Z',
        notes: 'Shipped via UPS Ground'
      },
      {
        status: 'delivered',
        timestamp: '2025-09-16T15:30:00Z',
        notes: 'Delivered and signed by customer'
      }
    ],
    assignedTo: 'david.brown@company.com',
    tags: ['marine', 'aluminum'],
    notes: 'Standard delivery completed on time',
    lastUpdated: '2025-09-16T15:30:00Z'
  }
]

// GET: Retrieve all orders for Kanban board
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const status = searchParams.get('status')
    const priority = searchParams.get('priority')
    const assignedTo = searchParams.get('assignedTo')

    let filteredOrders = mockOrders

    // Apply filters
    if (status) {
      filteredOrders = filteredOrders.filter(order => order.status === status)
    }

    if (priority) {
      filteredOrders = filteredOrders.filter(order => order.priority === priority)
    }

    if (assignedTo) {
      filteredOrders = filteredOrders.filter(order => order.assignedTo === assignedTo)
    }

    // Group orders by status for Kanban columns
    const kanbanData = {
      quote: filteredOrders.filter(o => o.status === 'quote'),
      ordered: filteredOrders.filter(o => o.status === 'ordered'),
      production: filteredOrders.filter(o => o.status === 'production'),
      shipping: filteredOrders.filter(o => o.status === 'shipping'),
      delivered: filteredOrders.filter(o => o.status === 'delivered')
    }

    const stats = {
      totalOrders: filteredOrders.length,
      totalValue: filteredOrders.reduce((sum, order) => sum + order.totalValue, 0),
      byStatus: {
        quote: kanbanData.quote.length,
        ordered: kanbanData.ordered.length,
        production: kanbanData.production.length,
        shipping: kanbanData.shipping.length,
        delivered: kanbanData.delivered.length
      },
      byPriority: {
        urgent: filteredOrders.filter(o => o.priority === 'urgent').length,
        high: filteredOrders.filter(o => o.priority === 'high').length,
        normal: filteredOrders.filter(o => o.priority === 'normal').length,
        low: filteredOrders.filter(o => o.priority === 'low').length
      }
    }

    return NextResponse.json({
      success: true,
      data: kanbanData,
      stats,
      lastUpdated: new Date().toISOString()
    })

  } catch (error) {
    console.error('Failed to fetch Kanban data:', error)
    return NextResponse.json(
      { error: 'Failed to fetch orders' },
      { status: 500 }
    )
  }
}

// PUT: Update order status (for drag-and-drop)
export async function PUT(request: NextRequest) {
  try {
    const { orderId, newStatus, notes, userId } = await request.json()

    // Validate inputs
    if (!orderId || !newStatus) {
      return NextResponse.json(
        { error: 'Missing required fields: orderId, newStatus' },
        { status: 400 }
      )
    }

    const validStatuses = ['quote', 'ordered', 'production', 'shipping', 'delivered']
    if (!validStatuses.includes(newStatus)) {
      return NextResponse.json(
        { error: `Invalid status. Must be one of: ${validStatuses.join(', ')}` },
        { status: 400 }
      )
    }

    // Find and update the order (in production, this would update database)
    const orderIndex = mockOrders.findIndex(order => order.id === orderId)
    if (orderIndex === -1) {
      return NextResponse.json(
        { error: 'Order not found' },
        { status: 404 }
      )
    }

    const order = mockOrders[orderIndex]
    const oldStatus = order.status

    // Update order
    order.status = newStatus as any
    order.lastUpdated = new Date().toISOString()

    // Add timeline entry
    order.timeline.push({
      status: newStatus,
      timestamp: new Date().toISOString(),
      notes: notes || `Status changed from ${oldStatus} to ${newStatus}`,
      userId
    })

    // Set actual delivery date if delivered
    if (newStatus === 'delivered') {
      order.actualDelivery = new Date().toISOString()
    }

    return NextResponse.json({
      success: true,
      order,
      message: `Order ${orderId} status updated to ${newStatus}`
    })

  } catch (error) {
    console.error('Failed to update order status:', error)
    return NextResponse.json(
      { error: 'Failed to update order status' },
      { status: 500 }
    )
  }
}