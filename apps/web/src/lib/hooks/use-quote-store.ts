import { create } from 'zustand'
import { devtools } from 'zustand/middleware'

export interface Part {
  id: string
  name: string
  file: File
  thumbnail?: string
  status: 'uploading' | 'processing' | 'ready' | 'error'
  process?: 'cnc' | 'sheet_metal' | 'injection_molding'
  analysis?: {
    volume: number
    surfaceArea: number
    boundingBox: { x: number; y: number; z: number }
    features: any[]
  }
  error?: string
}

export interface QuoteConfig {
  process: 'cnc' | 'sheet_metal' | 'injection_molding'
  material: string
  finish: string
  tolerance: string
  quantity: number
  leadTime: 'economy' | 'standard' | 'expedite'
  qualityAddons: string[]
  compliance: string[]
  notes?: string
}

export interface DFMResult {
  id: string
  severity: 'info' | 'warning' | 'blocker'
  code: string
  message: string
  location?: { x: number; y: number; z: number }
  suggestion?: string
  autoFix?: any
}

export interface Quote {
  id?: string
  parts: Part[]
  config: QuoteConfig
  pricing: {
    subtotal: number
    tax: number
    shipping: number
    total: number
    breakdown: {
      material: number
      machine: number
      finish: number
      inspection: number
      logistics: number
      risk: number
    }
    leadTime: {
      economy: { days: number; price: number }
      standard: { days: number; price: number }
      expedite: { days: number; price: number }
    }
  }
  dfmResults: DFMResult[]
  status: 'draft' | 'calculating' | 'ready' | 'error'
  createdAt?: Date
  updatedAt?: Date
}

interface QuoteStore {
  quote: Quote
  parts: Part[]
  selectedPart: Part | null
  isLoading: boolean
  error: string | null

  // Actions
  addPart: (file: File) => Promise<string>
  updatePart: (partId: string, updates: Partial<Part>) => void
  removePart: (partId: string) => void
  selectPart: (part: Part | null) => void
  updateQuote: (config: Partial<QuoteConfig>) => Promise<void>
  calculatePrice: () => Promise<any>
  validateDFM: () => Promise<DFMResult[]>
  reset: () => void
}

const initialQuote: Quote = {
  parts: [],
  config: {
    process: 'cnc',
    material: '',
    finish: '',
    tolerance: 'standard',
    quantity: 1,
    leadTime: 'standard',
    qualityAddons: [],
    compliance: []
  },
  pricing: {
    subtotal: 0,
    tax: 0,
    shipping: 0,
    total: 0,
    breakdown: {
      material: 0,
      machine: 0,
      finish: 0,
      inspection: 0,
      logistics: 0,
      risk: 0
    },
    leadTime: {
      economy: { days: 14, price: 0 },
      standard: { days: 7, price: 0 },
      expedite: { days: 3, price: 0 }
    }
  },
  dfmResults: [],
  status: 'draft'
}

export const useQuoteStore = create<QuoteStore>()(
  devtools(
    (set, get) => ({
      quote: initialQuote,
      parts: [],
      selectedPart: null,
      isLoading: false,
      error: null,

      addPart: async (file: File) => {
        const partId = `part-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`

        const newPart: Part = {
          id: partId,
          name: file.name,
          file,
          status: 'uploading',
          process: 'cnc' // Default, will be detected by CAD analysis
        }

        set(state => ({
          parts: [...state.parts, newPart],
          quote: {
            ...state.quote,
            parts: [...state.quote.parts, newPart]
          }
        }))

        try {
          // Simulate file upload and CAD analysis
          set(state => ({
            parts: state.parts.map(p =>
              p.id === partId ? { ...p, status: 'processing' } : p
            )
          }))

          // TODO: Replace with actual API call
          await new Promise(resolve => setTimeout(resolve, 2000))

          // Mock CAD analysis result
          const analysis = {
            volume: Math.random() * 1000,
            surfaceArea: Math.random() * 500,
            boundingBox: {
              x: Math.random() * 100,
              y: Math.random() * 100,
              z: Math.random() * 100
            },
            features: []
          }

          set(state => ({
            parts: state.parts.map(p =>
              p.id === partId
                ? { ...p, status: 'ready', analysis, thumbnail: '/api/placeholder/100/100' }
                : p
            ),
            quote: {
              ...state.quote,
              parts: state.quote.parts.map(p =>
                p.id === partId
                  ? { ...p, status: 'ready', analysis, thumbnail: '/api/placeholder/100/100' }
                  : p
              )
            }
          }))

          return partId
        } catch (error) {
          set(state => ({
            parts: state.parts.map(p =>
              p.id === partId ? { ...p, status: 'error', error: 'Upload failed' } : p
            ),
            error: 'Failed to upload file'
          }))
          throw error
        }
      },

      updatePart: (partId: string, updates: Partial<Part>) => {
        set(state => ({
          parts: state.parts.map(p => p.id === partId ? { ...p, ...updates } : p),
          quote: {
            ...state.quote,
            parts: state.quote.parts.map(p => p.id === partId ? { ...p, ...updates } : p)
          }
        }))
      },

      removePart: (partId: string) => {
        set(state => ({
          parts: state.parts.filter(p => p.id !== partId),
          quote: {
            ...state.quote,
            parts: state.quote.parts.filter(p => p.id !== partId)
          },
          selectedPart: state.selectedPart?.id === partId ? null : state.selectedPart
        }))
      },

      selectPart: (part: Part | null) => {
        set({ selectedPart: part })
      },

      updateQuote: async (config: Partial<QuoteConfig>) => {
        set(state => ({
          quote: {
            ...state.quote,
            config: { ...state.quote.config, ...config },
            status: 'calculating'
          },
          isLoading: true
        }))

        // TODO: Replace with actual API call
        await new Promise(resolve => setTimeout(resolve, 500))

        set(state => ({
          quote: {
            ...state.quote,
            status: 'ready'
          },
          isLoading: false
        }))
      },

      calculatePrice: async () => {
        set({ isLoading: true, error: null })

        try {
          // TODO: Replace with actual pricing API call
          await new Promise(resolve => setTimeout(resolve, 1000))

          const mockPricing = {
            subtotal: 1250.00,
            tax: 125.00,
            shipping: 50.00,
            total: 1425.00,
            breakdown: {
              material: 300.00,
              machine: 600.00,
              finish: 150.00,
              inspection: 100.00,
              logistics: 75.00,
              risk: 25.00
            },
            leadTime: {
              economy: { days: 14, price: 1250.00 },
              standard: { days: 7, price: 1425.00 },
              expedite: { days: 3, price: 1650.00 }
            }
          }

          set(state => ({
            quote: {
              ...state.quote,
              pricing: mockPricing,
              status: 'ready'
            },
            isLoading: false
          }))

          return mockPricing
        } catch (error) {
          set({
            error: 'Failed to calculate price',
            isLoading: false,
            quote: { ...get().quote, status: 'error' }
          })
          throw error
        }
      },

      validateDFM: async () => {
        const { selectedPart } = get()
        if (!selectedPart) return []

        set({ isLoading: true })

        try {
          // TODO: Replace with actual DFM API call
          await new Promise(resolve => setTimeout(resolve, 1500))

          const mockDFMResults: DFMResult[] = [
            {
              id: 'dfm-1',
              severity: 'warning',
              code: 'MIN_WALL_THICKNESS',
              message: 'Wall thickness of 0.8mm may be too thin for reliable manufacturing',
              suggestion: 'Consider increasing wall thickness to 1.5mm minimum',
              autoFix: { action: 'increase_wall', value: 1.5 }
            },
            {
              id: 'dfm-2',
              severity: 'info',
              code: 'DRAFT_ANGLE',
              message: 'Consider adding draft angles for better mold release',
              suggestion: 'Add 1-2° draft on vertical surfaces'
            }
          ]

          set(state => ({
            quote: {
              ...state.quote,
              dfmResults: mockDFMResults
            },
            isLoading: false
          }))

          return mockDFMResults
        } catch (error) {
          set({
            error: 'Failed to validate DFM',
            isLoading: false
          })
          throw error
        }
      },

      reset: () => {
        set({
          quote: initialQuote,
          parts: [],
          selectedPart: null,
          isLoading: false,
          error: null
        })
      }
    }),
    {
      name: 'quote-store'
    }
  )
)
