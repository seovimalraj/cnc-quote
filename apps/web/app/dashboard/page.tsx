import { createClient } from '@/lib/supabase/server'
import { redirect } from 'next/navigation'
import Link from 'next/link'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import {
  CubeIcon,
  DocumentTextIcon,
  ClockIcon,
  CheckCircleIcon,
  XCircleIcon,
  ArrowPathIcon,
  MagnifyingGlassIcon,
  FunnelIcon,
  PlusIcon,
} from '@heroicons/react/24/outline'

// Mock data for demonstration
const mockRecentQuotes = [
  {
    id: 'Q-2024-001',
    partName: 'Aluminum Bracket',
    status: 'priced',
    price: 245.67,
    createdAt: '2024-01-15',
    material: '6061 Aluminum',
    quantity: 50,
  },
  {
    id: 'Q-2024-002',
    partName: 'Steel Shaft',
    status: 'review',
    price: null,
    createdAt: '2024-01-14',
    material: '4140 Steel',
    quantity: 25,
  },
  {
    id: 'Q-2024-003',
    partName: 'Plastic Housing',
    status: 'draft',
    price: null,
    createdAt: '2024-01-13',
    material: 'ABS Plastic',
    quantity: 100,
  },
]

const mockResumeData = [
  { id: 1, name: 'bracket.step', size: '2.3 MB', uploadedAt: '2024-01-10' },
  { id: 2, name: 'shaft.dxf', size: '1.8 MB', uploadedAt: '2024-01-08' },
  { id: 3, name: 'housing.stl', size: '3.1 MB', uploadedAt: '2024-01-05' },
]

function getStatusBadge(status: string) {
  switch (status) {
    case 'priced':
      return <Badge className="bg-green-100 text-green-800">Priced</Badge>
    case 'review':
      return <Badge className="bg-yellow-100 text-yellow-800">In Review</Badge>
    case 'draft':
      return <Badge className="bg-gray-100 text-gray-800">Draft</Badge>
    default:
      return <Badge className="bg-gray-100 text-gray-800">{status}</Badge>
  }
}

export default async function DashboardPage() {
  const supabase = await createClient()

  const { data: { user }, error } = await supabase.auth.getUser()

  if (error || !user) {
    redirect('/auth/sign-in')
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Promo Banner */}
      <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
          <div className="text-center">
            <h1 className="text-4xl font-bold mb-4">
              Welcome back, {user.email?.split('@')[0] || 'User'}!
            </h1>
            <p className="text-xl mb-6">
              Manage your orders, documents, and support tickets
            </p>
            <Link href="/orders">
              <Button size="lg" className="bg-white text-blue-600 hover:bg-gray-100">
                <PlusIcon className="w-5 h-5 mr-2" />
                View Orders
              </Button>
            </Link>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2">
            {/* Instant Quote Zone */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <CubeIcon className="w-6 h-6 mr-2" />
                  Instant Quote
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="border-2 border-dashed border-gray-300 rounded-lg p-8 text-center">
                  <CubeIcon className="w-12 h-12 mx-auto text-gray-400 mb-4" />
                  <h3 className="text-lg font-medium text-gray-900 mb-2">
                    Drag & drop your files here
                  </h3>
                  <p className="text-gray-600 mb-4">
                    Support for STEP, STL, IGES, DXF, and more
                  </p>
                  <Button variant="outline">
                    Browse Files
                  </Button>
                </div>
              </CardContent>
            </Card>

            {/* Recent Orders */}
            <Card>
              <CardHeader>
                <div className="flex items-center justify-between">
                  <CardTitle>Recent Orders</CardTitle>
                  <div className="flex items-center space-x-2">
                    <div className="relative">
                      <MagnifyingGlassIcon className="w-4 h-4 absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400" />
                      <Input
                        placeholder="Search orders..."
                        className="pl-10 w-64"
                      />
                    </div>
                    <Button variant="outline" size="sm">
                      <FunnelIcon className="w-4 h-4 mr-2" />
                      Filter
                    </Button>
                  </div>
                </div>
              </CardHeader>
              <CardContent>
                <Tabs defaultValue="recent">
                  <TabsList className="grid w-full grid-cols-3">
                    <TabsTrigger value="recent">Recent</TabsTrigger>
                    <TabsTrigger value="priced">Priced</TabsTrigger>
                    <TabsTrigger value="drafts">Drafts</TabsTrigger>
                  </TabsList>

                  <TabsContent value="recent" className="mt-6">
                    <div className="space-y-4">
                      {mockRecentQuotes.map((quote) => (
                        <div key={quote.id} className="border rounded-lg p-4 hover:bg-gray-50">
                          <div className="flex items-center justify-between">
                            <div className="flex items-center space-x-4">
                              <div className="w-10 h-10 bg-blue-100 rounded-lg flex items-center justify-center">
                                <CubeIcon className="w-5 h-5 text-blue-600" />
                              </div>
                              <div>
                                <h4 className="font-medium text-gray-900">{quote.partName}</h4>
                                <p className="text-sm text-gray-600">{quote.id}</p>
                              </div>
                            </div>
                            <div className="text-right">
                              {getStatusBadge(quote.status)}
                              {quote.price && (
                                <p className="text-lg font-semibold text-gray-900 mt-1">
                                  ${quote.price}
                                </p>
                              )}
                            </div>
                          </div>
                          <div className="mt-4 flex items-center justify-between text-sm text-gray-600">
                            <span>{quote.material} • Qty: {quote.quantity}</span>
                            <span>{quote.createdAt}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </TabsContent>
                </Tabs>
              </CardContent>
            </Card>
          </div>

          {/* Sidebar */}
          <div>
            {/* Resume Section */}
            <Card className="mb-8">
              <CardHeader>
                <CardTitle className="flex items-center">
                  <DocumentTextIcon className="w-6 h-6 mr-2" />
                  Recent Files
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-3">
                  {mockResumeData.map((file) => (
                    <div key={file.id} className="flex items-center justify-between p-3 border rounded-lg">
                      <div className="flex items-center space-x-3">
                        <div className="w-8 h-8 bg-gray-100 rounded flex items-center justify-center">
                          <DocumentTextIcon className="w-4 h-4 text-gray-600" />
                        </div>
                        <div>
                          <p className="text-sm font-medium text-gray-900 truncate max-w-32">
                            {file.name}
                          </p>
                          <p className="text-xs text-gray-600">{file.size}</p>
                        </div>
                      </div>
                      <Button variant="ghost" size="sm">
                        <ArrowPathIcon className="w-4 h-4" />
                      </Button>
                    </div>
                  ))}
                </div>
                <Button variant="outline" className="w-full mt-4">
                  View All Files
                </Button>
              </CardContent>
            </Card>

            {/* Quick Stats */}
            <Card>
              <CardHeader>
                <CardTitle>Quick Stats</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="space-y-4">
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <CheckCircleIcon className="w-5 h-5 text-green-600" />
                      <span className="text-sm">Completed Orders</span>
                    </div>
                    <span className="font-semibold">12</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <ClockIcon className="w-5 h-5 text-yellow-600" />
                      <span className="text-sm">In Progress</span>
                    </div>
                    <span className="font-semibold">3</span>
                  </div>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-2">
                      <XCircleIcon className="w-5 h-5 text-red-600" />
                      <span className="text-sm">Needs Review</span>
                    </div>
                    <span className="font-semibold">1</span>
                  </div>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  )
}