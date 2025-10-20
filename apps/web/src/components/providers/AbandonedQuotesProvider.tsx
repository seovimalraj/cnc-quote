'use client'

import { createContext, useContext, useEffect, useState, ReactNode } from 'react'
import { ContractsVNext } from '@cnc-quote/shared'

import {
  assignAbandonedQuote,
  fetchAbandonedQuotes,
  fetchAbandonedTimeline,
  sendAbandonedQuoteReminder,
  updateQuoteLifecycleStatus,
  type AbandonedQuoteFilters,
} from '@/lib/admin/api'

type AbandonedQuote = ContractsVNext.AbandonedQuoteVNext
type ActivityEvent = ContractsVNext.QuoteTimelineEventVNext

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

      const requestFilters: AbandonedQuoteFilters = {
        age: filters.age,
        value_band: filters.value_band,
        stage: filters.dropoff_stage,
        search: filters.search,
      }

      const payload = await fetchAbandonedQuotes(requestFilters)
      setQuotes(payload.quotes ?? [])
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred')
    } finally {
      setIsLoading(false)
    }
  }

  const fetchTimeline = async (quoteId: string) => {
    try {
      const payload = await fetchAbandonedTimeline(quoteId)
      setTimeline(payload.events ?? [])
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
    await sendAbandonedQuoteReminder(quoteId)
    await fetchQuotes()
  }

  const assignQuote = async (quoteId: string, userId: string) => {
    await assignAbandonedQuote(quoteId, userId)
    await fetchQuotes()
  }

  const convertToManualReview = async (quoteId: string) => {
    await updateQuoteLifecycleStatus(quoteId, 'Needs_Review')
    await fetchQuotes()
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
