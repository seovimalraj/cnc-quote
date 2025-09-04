'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'

interface AbandonedQuote {
  id: string
  organization_id: string
  buyer_name: string
  buyer_email: string
  last_activity: string
  stage: 'Before Upload' | 'After Upload' | 'After CAD' | 'After First Price' | 'After Lead Select' | 'Checkout Abandon'
  subtotal: number
  files_count: number
  dfm_blockers_count: number
  promo_tried: boolean
  assignee_id: string | null
  created_at: string
}

interface ActivityEvent {
  id: string
  quote_id: string
  user_id: string
  actor_role: 'buyer' | 'org_admin' | 'guest'
  name: string
  ts: string
  props: Record<string, any>
}

interface AbandonedQuotesContextType {
  quotes: AbandonedQuote[]
  isLoading: boolean
  error: string | null
  filters: {
    age?: string
    value_band?: string
    dropoff_stage?: string
    search?: string
  }
  selectedQuoteId: string | null
  timeline: ActivityEvent[]
  setFilters: (filters: Partial<AbandonedQuotesContextType['filters']>) => void
  selectQuote: (quoteId: string | null) => void
  refreshQuotes: () => Promise<void>
  sendReminder: (quoteId: string) => Promise<void>
  assignQuote: (quoteId: string, userId: string) => Promise<void>
  convertToManualReview: (quoteId: string) => Promise<void>
}

const AbandonedQuotesContext = createContext<AbandonedQuotesContextType | undefined>(undefined)

interface AbandonedQuotesProviderProps {
  children: ReactNode
}

export function AbandonedQuotesProvider({ children }: AbandonedQuotesProviderProps) {
  const [quotes, setQuotes] = useState<AbandonedQuote[]>([])
  const [isLoading, setIsLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)
  const [filters, setFiltersState] = useState<AbandonedQuotesContextType['filters']>({})
  const [selectedQuoteId, setSelectedQuoteId] = useState<string | null>(null)
  const [timeline, setTimeline] = useState<ActivityEvent[]>([])

  const fetchQuotes = async () => {
    try {
      setIsLoading(true)
      setError(null)

      const queryParams = new URLSearchParams()
      if (filters.age) queryParams.set('age', filters.age)
      if (filters.value_band) queryParams.set('value_band', filters.value_band)
      if (filters.dropoff_stage) queryParams.set('stage', filters.dropoff_stage)
      if (filters.search) queryParams.set('search', filters.search)

      const response = await fetch(`/api/admin/abandoned?${queryParams}`)
      if (!response.ok) {
        throw new Error('Failed to fetch abandoned quotes')
      }

      const data = await response.json()
      setQuotes(data.quotes || [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTimeline = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/admin/abandoned/${quoteId}/timeline`)
      if (!response.ok) {
        throw new Error('Failed to fetch timeline')
      }

      const data = await response.json()
      setTimeline(data.events || [])
    } catch (err) {
      console.error('Error fetching timeline:', err)
    }
  }

  const setFilters = (newFilters: Partial<AbandonedQuotesContextType['filters']>) => {
    setFiltersState(prev => ({ ...prev, ...newFilters }))
  }

  const selectQuote = async (quoteId: string | null) => {
    setSelectedQuoteId(quoteId)
    if (quoteId) {
      await fetchTimeline(quoteId)
    } else {
      setTimeline([])
    }
  }

  const sendReminder = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/admin/abandoned/${quoteId}/remind`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          template: 'resume_quote',
          channel: 'email'
        }),
      })

      if (!response.ok) {
        throw new Error('Failed to send reminder')
      }

      // Refresh quotes to update the list
      await fetchQuotes()
    } catch (err) {
      throw err
    }
  }

  const assignQuote = async (quoteId: string, userId: string) => {
    try {
      const response = await fetch(`/api/admin/abandoned/${quoteId}/assign`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ user_id: userId }),
      })

      if (!response.ok) {
        throw new Error('Failed to assign quote')
      }

      // Refresh quotes to update the list
      await fetchQuotes()
    } catch (err) {
      throw err
    }
  }

  const convertToManualReview = async (quoteId: string) => {
    try {
      const response = await fetch(`/api/quotes/${quoteId}`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ status: 'Needs_Review' }),
      })

      if (!response.ok) {
        throw new Error('Failed to convert to manual review')
      }

      // Refresh quotes to update the list
      await fetchQuotes()
    } catch (err) {
      throw err
    }
  }

  const refreshQuotes = async () => {
    await fetchQuotes()
  }

  useEffect(() => {
    fetchQuotes()
  }, [filters])

  const value: AbandonedQuotesContextType = {
    quotes,
    isLoading,
    error,
    filters,
    selectedQuoteId,
    timeline,
    setFilters,
    selectQuote,
    refreshQuotes,
    sendReminder,
    assignQuote,
    convertToManualReview,
  }

  return (
    <AbandonedQuotesContext.Provider value={value}>
      {children}
    </AbandonedQuotesContext.Provider>
  )
}

export function useAbandonedQuotes() {
  const context = useContext(AbandonedQuotesContext)
  if (context === undefined) {
    throw new Error('useAbandonedQuotes must be used within an AbandonedQuotesProvider')
  }
  return context
}
