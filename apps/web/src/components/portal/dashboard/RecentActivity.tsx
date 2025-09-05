'use client'

import { useState } from 'react'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { EyeIcon } from '@heroicons/react/24/outline'
import { posthog } from 'posthog-js'
import { formatDate } from '@/lib/utils'

interface DashboardQuote {
  id: string
  updated_at: string
  status: string
  price?: number
  lead_time_text?: string
}

interface Order {
  id: string
  created_at: string
  status: string
  total?: number
}

interface RecentActivityProps {
  quotes: DashboardQuote[]
  orders: Order[]
}

export function RecentActivity({ quotes, orders }: RecentActivityProps) {
  const [activeTab, setActiveTab] = useState('quotes')

  const handleItemOpen = (type: 'quote' | 'order', id: string) => {
    posthog.capture('recent_item_opened', {
      type,
      id,
      tab: activeTab
    })
    // Navigation will be handled by Link component
  }

  const getStatusBadge = (status: string, type: 'quote' | 'order') => {
    const variants = {
      quote: {
        Draft: 'bg-gray-100 text-gray-800',
        Priced: 'bg-green-100 text-green-800',
        Needs_Review: 'bg-yellow-100 text-yellow-800',
        Reviewed: 'bg-blue-100 text-blue-800',
        Sent: 'bg-purple-100 text-purple-800',
        Accepted: 'bg-green-100 text-green-800',
        Expired: 'bg-red-100 text-red-800',
        Abandoned: 'bg-gray-100 text-gray-800'
      },
      order: {
        Pending: 'bg-yellow-100 text-yellow-800',
        Processing: 'bg-blue-100 text-blue-800',
        Shipped: 'bg-purple-100 text-purple-800',
        Delivered: 'bg-green-100 text-green-800',
        Cancelled: 'bg-red-100 text-red-800'
      }
    }

    const statusVariants = variants[type]
    return (
      <Badge className={statusVariants[status as keyof typeof statusVariants] || 'bg-gray-100 text-gray-800'}>
        {status}
      </Badge>
    )
  }

  return (
    <Card>
      <CardHeader>
        <CardTitle>Recent Activity</CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="quotes">Quotes</TabsTrigger>
            <TabsTrigger value="orders">Orders</TabsTrigger>
          </TabsList>

          <TabsContent value="quotes" className="mt-6">
            <div className="space-y-4">
              {quotes.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No recent quotes</p>
                </div>
              ) : (
                quotes.slice(0, 10).map((quote) => (
                  <div key={quote.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-medium text-blue-600">Q</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{quote.id}</h4>
                        <p className="text-sm text-gray-600">
                          Updated {formatDate(quote.updated_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        {getStatusBadge(quote.status, 'quote')}
                        {quote.price && (
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            ${quote.price.toLocaleString()}
                          </p>
                        )}
                      </div>

                      <Link href={`/portal/quotes/${quote.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleItemOpen('quote', quote.id)}
                        >
                          <EyeIcon className="w-4 h-4 mr-1" />
                          Open
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>

          <TabsContent value="orders" className="mt-6">
            <div className="space-y-4">
              {orders.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-600">No recent orders</p>
                </div>
              ) : (
                orders.slice(0, 10).map((order) => (
                  <div key={order.id} className="flex items-center justify-between p-4 border border-gray-200 rounded-lg hover:bg-gray-50">
                    <div className="flex items-center space-x-4">
                      <div className="w-10 h-10 bg-green-100 rounded-lg flex items-center justify-center">
                        <span className="text-sm font-medium text-green-600">O</span>
                      </div>
                      <div>
                        <h4 className="font-medium text-gray-900">{order.id}</h4>
                        <p className="text-sm text-gray-600">
                          Placed {formatDate(order.created_at)}
                        </p>
                      </div>
                    </div>

                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        {getStatusBadge(order.status, 'order')}
                        {order.total && (
                          <p className="text-sm font-medium text-gray-900 mt-1">
                            ${order.total.toLocaleString()}
                          </p>
                        )}
                      </div>

                      <Link href={`/portal/orders/${order.id}`}>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleItemOpen('order', order.id)}
                        >
                          <EyeIcon className="w-4 h-4 mr-1" />
                          Open
                        </Button>
                      </Link>
                    </div>
                  </div>
                ))
              )}
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  )
}
