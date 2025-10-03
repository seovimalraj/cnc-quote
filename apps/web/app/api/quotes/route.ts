import { NextRequest, NextResponse } from 'next/server'
import { v4 as uuidv4 } from 'uuid'

interface CreateQuoteRequest {
  source?: 'web' | 'widget' | 'large_order'
  guestEmail?: string
  files?: Array<{
    fileId: string
    fileName: string
    fileSize?: number
    contentType?: string
  }>
}

interface LeadOption {
  id: string
  region: 'USA' | 'International'
  speed: 'Economy' | 'Standard' | 'Expedite'
  business_days: number
  unit_price: number
  msrp: number
  savings_text: string
}

interface PricingBreakdown {
  setup_time_min: number
  cycle_time_min: number
  machine_rate_per_hr: number
  material_buy_cost: number
  material_waste_factor: number
  tooling_wear_cost: number
  finish_cost: number
  inspection_cost: number
  risk_adder: number
  overhead: number
  margin: number
  unit_price: number
}

// Function to generate realistic pricing based on file characteristics
function generatePricingForFile(fileName: string, fileId: string): {
  quantity: number
  unitPrice: number
  baseLeadTime: number
  pricingBreakdown: PricingBreakdown
  leadTimeOptions: LeadOption[]
} {
  // Generate deterministic "randomness" based on file name and ID
  const seed = fileName.length + fileId.length
  const complexity = Math.sin(seed) * 0.5 + 0.5 // 0 to 1
  
  // Base pricing calculation
  const baseCost = 50 + (complexity * 400) // $50-$450 base
  const quantity = 1 // DEFAULT TO 1 PART - FIXED
  
  // Bulk discount - more parts = lower unit price
  const bulkDiscount = quantity > 10 ? 0.15 : quantity > 5 ? 0.1 : 0
  const unitPrice = Math.round(baseCost * (1 - bulkDiscount))
  
  // Lead time calculation
  const baseLeadTime = Math.max(7, Math.floor(14 - (quantity * 0.2))) // 7-14 days base
  
  // Pricing breakdown
  const pricingBreakdown: PricingBreakdown = {
    setup_time_min: 30,
    cycle_time_min: 15,
    machine_rate_per_hr: 75,
    material_buy_cost: unitPrice * 0.4,
    material_waste_factor: 1.1,
    tooling_wear_cost: unitPrice * 0.05,
    finish_cost: unitPrice * 0.1,
    inspection_cost: unitPrice * 0.1,
    risk_adder: unitPrice * 0.05,
    overhead: unitPrice * 0.2,
    margin: unitPrice * 0.15,
    unit_price: unitPrice
  }
  
  // Lead time options
  const leadTimeOptions: LeadOption[] = [
    {
      id: 'usa-expedite',
      region: 'USA',
      speed: 'Expedite',
      business_days: Math.max(3, Math.floor(baseLeadTime * 0.3)),
      unit_price: unitPrice * 2.0,
      msrp: unitPrice * 2.3,
      savings_text: `Save $${(unitPrice * 0.3).toFixed(2)}`
    },
    {
      id: 'usa-standard',
      region: 'USA', 
      speed: 'Standard',
      business_days: Math.max(7, Math.floor(baseLeadTime * 0.6)),
      unit_price: unitPrice * 1.3,
      msrp: unitPrice * 1.6,
      savings_text: `Save $${(unitPrice * 0.3).toFixed(2)}`
    },
    {
      id: 'usa-economy',
      region: 'USA',
      speed: 'Economy',
      business_days: Math.max(7, baseLeadTime),
      unit_price: unitPrice,
      msrp: unitPrice * 1.2,
      savings_text: `Save $${(unitPrice * 0.2).toFixed(2)}`
    }
  ]
  
  return {
    quantity,
    unitPrice,
    baseLeadTime,
    pricingBreakdown,
    leadTimeOptions
  }
}

export async function POST(request: NextRequest) {
  try {
    const body: CreateQuoteRequest = await request.json()
    const { source = 'web', guestEmail, files } = body

    console.log('Quote creation request:', { 
      source, 
      guestEmail, 
      files, 
      filesLength: files?.length,
      bodyKeys: Object.keys(body),
      fullBody: JSON.stringify(body)
    })

    const quoteId = `Q${Date.now().toString().slice(-6)}`
    
    // Handle multi-file quotes
    if (files && files.length > 0) {
      console.log('Creating multi-file quote with', files.length, 'files')
      // Generate quote lines for each file
      const lines = files.map((file, index) => {
        const pricing = generatePricingForFile(file.fileName, file.fileId)
        
        return {
          id: `line-${index + 1}`,
          fileId: file.fileId,
          fileName: file.fileName,
          process: 'CNC' as const,
          material: 'Aluminum 6061',
          finish: 'Anodized',
          qty: pricing.quantity,
          status: 'Priced' as const,
          pricingBreakdown: pricing.pricingBreakdown,
          leadTimeOptions: pricing.leadTimeOptions
        }
      })
      
      // Calculate subtotal
      const subtotal = lines.reduce((sum, line) => {
        return sum + (line.pricingBreakdown.unit_price * line.qty)
      }, 0)

      const quote = {
        id: quoteId,
        status: 'Priced',
        subtotal: subtotal,
        currency: 'USD',
        lines: lines,
        selectedLeadOptionId: null,
        createdAt: new Date().toISOString(),
        updatedAt: new Date().toISOString()
      }

      console.log(`Created multi-file quote ${quoteId} with ${files.length} files, subtotal: $${subtotal}`)
      return NextResponse.json(quote)
    } else {
      // Legacy single file quote creation (fallback) - THIS CODE IS RUNNING
      console.log('FALLBACK CODE IS RUNNING - FILES NOT DETECTED PROPERLY')
      return NextResponse.json({
        error: 'THIS IS THE FALLBACK RESPONSE - FILES ARRAY NOT DETECTED',
        receivedData: { source, guestEmail, files, filesLength: files?.length }
      })
    }

  } catch (error) {
    console.error('Quote creation error:', error)
    return NextResponse.json(
      { error: 'Failed to create quote' },
      { status: 500 }
    )
  }
}
