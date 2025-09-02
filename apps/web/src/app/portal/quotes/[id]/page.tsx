import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import type { Quote } from '@cnc-quote/shared'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { CheckoutButton } from '@/components/checkout/CheckoutButton'

interface Props {
  params: {
    id: string
  }
}

export default async function QuoteDetailPage({ params }: Props) {
  const supabase = createClient(cookies())
  
  const { data: quote }: { data: Quote | null } = await supabase
    .from('quotes')
    .select(`
      *,
      items:quote_items (
        *,
        material:materials (name),
        file:files (name)
      )
    `)
    .eq('id', params.id)
    .single()

  if (!quote) {
    notFound()
  }

  return (
    <div className="container py-8">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold mb-2">
            Quote Q-{quote.id.slice(0, 8)}
          </h1>
          <Badge
            variant={
              quote.status === 'accepted'
                ? 'success'
                : quote.status === 'rejected'
                ? 'destructive'
                : 'default'
            }
          >
            {quote.status}
          </Badge>
        </div>

        <div className="flex items-center space-x-4">
          <a 
            href={`/api/quotes/${quote.id}/pdf`}
            className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 border border-input bg-background hover:bg-accent hover:text-accent-foreground h-10 px-4 py-2"
          >
            Download PDF
          </a>
          {quote.status === 'draft' && (
            <button
              className="inline-flex items-center justify-center rounded-md text-sm font-medium ring-offset-background transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 disabled:pointer-events-none disabled:opacity-50 bg-primary text-primary-foreground hover:bg-primary/90 h-10 px-4 py-2"
              onClick={() => {
                // TODO: Show email dialog
              }}
            >
              Send Quote
            </button>
          )}
          {quote.status === 'sent' && (
            <CheckoutButton
              quoteId={quote.id}
              amount={quote.total_amount}
              currency={quote.currency}
            />
          )}
        </div>
      </div>

      <div className="grid gap-6">
        {/* Quote Details */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Quote Details</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Total Amount</dt>
              <dd className="text-2xl font-bold">
                {quote.currency} {quote.total_amount.toFixed(2)}
              </dd>
            </div>
            <div>
              <dt className="text-sm text-gray-500">Expires</dt>
              <dd>
                {new Date(quote.expires_at).toLocaleDateString()}
              </dd>
            </div>
          </dl>
        </Card>

        {/* Quote Items */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Items</h2>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-2">File</th>
                  <th className="text-left py-2">Process</th>
                  <th className="text-left py-2">Material</th>
                  <th className="text-right py-2">Qty</th>
                  <th className="text-right py-2">Unit Price</th>
                  <th className="text-right py-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {quote.items.map((item) => (
                  <tr key={item.id} className="border-b">
                    <td className="py-2">{item.file.name}</td>
                    <td className="py-2">{item.process_type}</td>
                    <td className="py-2">{item.material.name}</td>
                    <td className="text-right py-2">{item.quantity}</td>
                    <td className="text-right py-2">
                      {quote.currency} {item.unit_price.toFixed(2)}
                    </td>
                    <td className="text-right py-2">
                      {quote.currency} {item.total_price.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        {/* Terms and Notes */}
        {(quote.terms || quote.notes) && (
          <Card className="p-6">
            {quote.terms && (
              <div className="mb-6">
                <h2 className="text-lg font-semibold mb-2">Terms</h2>
                <p className="whitespace-pre-wrap">{quote.terms}</p>
              </div>
            )}
            {quote.notes && (
              <div>
                <h2 className="text-lg font-semibold mb-2">Notes</h2>
                <p className="whitespace-pre-wrap">{quote.notes}</p>
              </div>
            )}
          </Card>
        )}
      </div>
    </div>
  )
}
