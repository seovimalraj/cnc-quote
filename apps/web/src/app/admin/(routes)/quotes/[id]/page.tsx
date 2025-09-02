import { notFound } from 'next/navigation'
import { createClient } from '@/lib/supabase/server'
import { cookies } from 'next/headers'
import type { Quote } from '@cnc-quote/shared'
import { Button } from '@/components/ui/button'
import { Card } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'

interface Props {
  params: {
    id: string
  }
}

export default async function AdminQuotePage({ params }: Props) {
  const supabase = createClient(cookies())
  
  const { data: quote }: { data: Quote | null } = await supabase
    .from('quotes')
    .select(`
      *,
      customer:customers (name, email, address),
      items:quote_items (
        *,
        material:materials (name),
        file:files (name)
      ),
      price_profile:pricing_profiles (
        name,
        machine:machines (name)
      ),
      dfm_ruleset:dfm_rules (name)
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
                ? 'default'
                : quote.status === 'rejected'
                ? 'destructive'
                : 'secondary'
            }
          >
            {quote.status}
          </Badge>
        </div>

        <div className="space-x-4">
          <Button
            variant="outline"
            onClick={() => window.location.href = `/api/quotes/${quote.id}/pdf`}
          >
            Download PDF
          </Button>
          <Button 
            variant="default"
            disabled={quote.status !== 'draft'}
            onClick={() => {
              // TODO: Show email dialog
            }}
          >
            Send Quote
          </Button>
        </div>
      </div>

      <div className="grid gap-6">
        {/* Quote Details */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Quote Details</h2>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm text-gray-500">Total Amount</dt>
                <dd className="text-2xl font-bold">
                  {quote.currency} {quote.total_amount.toFixed(2)}
                </dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Status</dt>
                <dd>{quote.status}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Created</dt>
                <dd>{new Date(quote.created_at).toLocaleString()}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Expires</dt>
                <dd>{quote.expires_at ? new Date(quote.expires_at).toLocaleString() : 'No expiration'}</dd>
              </div>
              {quote.email_sent_at && (
                <div>
                  <dt className="text-sm text-gray-500">Email Sent</dt>
                  <dd>{new Date(quote.email_sent_at).toLocaleString()}</dd>
                </div>
              )}
              {quote.accepted_at && (
                <div>
                  <dt className="text-sm text-gray-500">Accepted</dt>
                  <dd>{new Date(quote.accepted_at).toLocaleString()}</dd>
                </div>
              )}
              {quote.rejected_at && (
                <div>
                  <dt className="text-sm text-gray-500">Rejected</dt>
                  <dd>{new Date(quote.rejected_at).toLocaleString()}</dd>
                </div>
              )}
            </dl>
          </Card>

          <Card className="p-6">
            <h2 className="text-lg font-semibold mb-4">Customer Details</h2>
            <dl className="space-y-2">
              <div>
                <dt className="text-sm text-gray-500">Name</dt>
                <dd>{quote.customer?.name || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Email</dt>
                <dd>{quote.customer?.email || 'N/A'}</dd>
              </div>
              <div>
                <dt className="text-sm text-gray-500">Address</dt>
                <dd className="whitespace-pre-wrap">{quote.customer?.address || 'N/A'}</dd>
              </div>
            </dl>
          </Card>
        </div>

        {/* Configuration */}
        <Card className="p-6">
          <h2 className="text-lg font-semibold mb-4">Configuration</h2>
          <dl className="grid grid-cols-2 gap-4">
            <div>
              <dt className="text-sm text-gray-500">Price Profile</dt>
              <dd>
                {quote.price_profile?.name || 'N/A'}
                {quote.price_profile?.machine?.name && (
                  <>
                    {' '}
                    <span className="text-gray-500">
                      ({quote.price_profile.machine.name})
                    </span>
                  </>
                )}
              </dd>
            </div>
            {quote.dfm_ruleset && (
              <div>
                <dt className="text-sm text-gray-500">DFM Ruleset</dt>
                <dd>{quote.dfm_ruleset.name}</dd>
              </div>
            )}
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
                    <td className="py-2">{item.file?.name || 'Unknown file'}</td>
                    <td className="py-2">{item.process_type}</td>
                    <td className="py-2">{item.material?.name || 'Unknown material'}</td>
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
