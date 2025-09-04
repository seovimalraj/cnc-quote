'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import {
  CubeIcon,
  ArrowDownTrayIcon,
  ShareIcon,
  EyeIcon
} from '@heroicons/react/24/outline'
import { posthog } from 'posthog-js'

interface DashboardQuote {
  id: string
  thumbnail_url?: string
  price?: number
  lead_time_text?: string
  production_speed?: 'Economy' | 'Standard' | 'Expedite'
  updated_at: string
  status: 'Draft' | 'Priced' | 'Needs_Review' | 'Reviewed' | 'Sent' | 'Accepted' | 'Expired' | 'Abandoned'
}

interface ResumeQuotesProps {
  quotes: DashboardQuote[]
}

export function ResumeQuotes({ quotes }: ResumeQuotesProps) {
  const [downloadingId, setDownloadingId] = useState<string | null>(null)

  const getStatusBadge = (status: string) => {
    const variants = {
      Draft: 'bg-gray-100 text-gray-800',
      Priced: 'bg-green-100 text-green-800',
      Needs_Review: 'bg-yellow-100 text-yellow-800',
      Reviewed: 'bg-blue-100 text-blue-800',
      Sent: 'bg-purple-100 text-purple-800',
      Accepted: 'bg-green-100 text-green-800',
      Expired: 'bg-red-100 text-red-800',
      Abandoned: 'bg-gray-100 text-gray-800'
    }

    return (
      <Badge className={variants[status as keyof typeof variants] || variants.Draft}>
        {status}
      </Badge>
    )
  }

  const handleView = (quoteId: string) => {
    posthog.capture('resume_quote_open', { quote_id: quoteId })
    // Navigation will be handled by Link component
  }

  const handleDownload = async (quoteId: string) => {
    setDownloadingId(quoteId)
    posthog.capture('resume_quote_download', { quote_id: quoteId })

    try {
      // In a real implementation, this would trigger a PDF download
      // await fetch(`/api/quotes/${quoteId}/pdf`)
      // const blob = await response.blob()
      // const url = window.URL.createObjectURL(blob)
      // const a = document.createElement('a')
      // a.href = url
      // a.download = `quote-${quoteId}.pdf`
      // a.click()

      // Simulate download
      await new Promise(resolve => setTimeout(resolve, 1000))
      alert(`Downloading quote ${quoteId}...`)
    } catch (error) {
      console.error('Error downloading quote:', error)
    } finally {
      setDownloadingId(null)
    }
  }

  const handleShare = async (quoteId: string) => {
    posthog.capture('resume_quote_share', { quote_id: quoteId })

    try {
      // In a real implementation, this would create a shareable link
      // const response = await fetch(`/api/quotes/${quoteId}/share-link`, {
      //   method: 'POST'
      // })
      // const { share_url } = await response.json()

      // Simulate share link creation
      const shareUrl = `${window.location.origin}/portal/quotes/${quoteId}`
      await navigator.clipboard.writeText(shareUrl)
      alert('Share link copied to clipboard!')
    } catch (error) {
      console.error('Error sharing quote:', error)
    }
  }

  if (quotes.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Pick Up Where You Left Off</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <CubeIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No in-progress quotes</h3>
            <p className="text-gray-600 mb-4">Start a new quote to see it here</p>
            <Link href="/portal/quotes/new">
              <Button>Start a New Quote</Button>
            </Link>
          </div>
        </CardContent>
      </Card>
    )
  }

  return (
    <Card>
      <CardHeader>
        <div className="flex items-center justify-between">
          <CardTitle>Pick Up Where You Left Off</CardTitle>
          <Link href="/portal/quotes">
            <Button variant="outline" size="sm">View All Quotes</Button>
          </Link>
        </div>
      </CardHeader>
      <CardContent>
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {quotes.slice(0, 6).map((quote) => (
            <div key={quote.id} className="border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow">
              {/* Thumbnail */}
              <div className="aspect-square bg-gray-100 rounded-lg mb-3 flex items-center justify-center">
                {quote.thumbnail_url ? (
                  <img
                    src={quote.thumbnail_url}
                    alt={`Quote ${quote.id}`}
                    className="w-full h-full object-cover rounded-lg"
                  />
                ) : (
                  <CubeIcon className="w-8 h-8 text-gray-400" />
                )}
              </div>

              {/* Quote Info */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <h4 className="font-medium text-gray-900">{quote.id}</h4>
                  {getStatusBadge(quote.status)}
                </div>

                {quote.price && (
                  <p className="text-lg font-semibold text-gray-900">
                    ${quote.price.toLocaleString()}
                  </p>
                )}

                {quote.lead_time_text && (
                  <p className="text-sm text-gray-600">{quote.lead_time_text}</p>
                )}

                {quote.production_speed && (
                  <Badge variant="outline" className="text-xs">
                    {quote.production_speed}
                  </Badge>
                )}

                <p className="text-xs text-gray-500">
                  Updated {new Date(quote.updated_at).toLocaleDateString()}
                </p>
              </div>

              {/* Actions */}
              <div className="flex space-x-2 mt-3">
                <Link href={`/portal/quotes/${quote.id}`}>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => handleView(quote.id)}
                    className="flex-1"
                  >
                    <EyeIcon className="w-4 h-4 mr-1" />
                    View
                  </Button>
                </Link>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDownload(quote.id)}
                  disabled={downloadingId === quote.id}
                >
                  <ArrowDownTrayIcon className="w-4 h-4" />
                </Button>

                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleShare(quote.id)}
                >
                  <ShareIcon className="w-4 h-4" />
                </Button>
              </div>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  )
}
