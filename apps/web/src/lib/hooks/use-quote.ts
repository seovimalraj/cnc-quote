import { create } from 'zustand';
import type { Quote } from '@/types/quotes';

interface QuoteStore {
  quote: Quote;
  updateQuote: (updates: Partial<Quote>) => void;
  calculatePrice: () => Promise<Quote['price']>;
}

export const useQuote = create<QuoteStore>((set, get) => ({
  quote: {
    files: [],
    isValid: false
  },

  updateQuote: (updates) => {
    set((state) => {
      const newQuote = {
        ...state.quote,
        ...updates
      }

      // Check if quote is valid
      newQuote.isValid = Boolean(
        newQuote.files?.length > 0 &&
        newQuote.material &&
        newQuote.quantity &&
        newQuote.quantity > 0
      )

      return { quote: newQuote }
    })
  },

  calculatePrice: async () => {
    const { quote } = get()

    // Call pricing API
    const response = await fetch('/api/pricing/calculate', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        files: quote.files.map(f => f.name),
        material_id: quote.material,
        quantity: quote.quantity,
        finish_ids: quote.finish ? [quote.finish] : undefined,
        tolerance: quote.tolerance
      })
    })

    if (!response.ok) {
      throw new Error('Failed to calculate price')
    }

    const price = await response.json()

    // Update quote with price
    set((state) => ({
      quote: {
        ...state.quote,
        price
      }
    }))

    return price
  }
}))
