'use client';

import Link from 'next/link';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  CubeIcon,
  ClockIcon,
  CurrencyDollarIcon,
  ArrowRightIcon,
  CheckCircleIcon,
  UserGroupIcon,
  CogIcon,
  ShieldCheckIcon
} from '@heroicons/react/24/outline';

export default function LandingPage() {
  const { user } = useAuth();

  const features = [
    {
      icon: CubeIcon,
      title: 'Customer Portal',
      description: 'Secure portal for managing orders, documents, and support tickets with full order history.'
    },
    {
      icon: ClockIcon,
      title: 'Order Tracking',
      description: 'Real-time order status updates and comprehensive order management dashboard.'
    },
    {
      icon: CurrencyDollarIcon,
      title: 'Document Management',
      description: 'Secure access to all order documents, invoices, and manufacturing specifications.'
    },
    {
      icon: ShieldCheckIcon,
      title: 'Admin Oversight',
      description: 'Comprehensive admin panel for operational monitoring, customer management, and analytics.'
    }
  ];

  const processSteps = [
    { step: 1, title: 'Sign Up', description: 'Create your account securely' },
    { step: 2, title: 'Access Portal', description: 'Login to your customer dashboard' },
    { step: 3, title: 'Manage Orders', description: 'Track orders and download documents' },
    { step: 4, title: 'Get Support', description: 'Access help and contact support' }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100">
      {/* Header */}
      <header className="bg-white shadow-sm">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex justify-between items-center py-4">
            <div className="flex items-center">
              <CubeIcon className="h-8 w-8 text-blue-600" />
              <span className="ml-2 text-xl font-bold text-gray-900">CNC Quote</span>
            </div>
            <div className="flex items-center space-x-4">
              {user ? (
                <Link href="/dashboard">
                  <Button>Go to Dashboard</Button>
                </Link>
              ) : (
                <>
                  <Link href="/login">
                    <Button variant="ghost">Sign In</Button>
                  </Link>
                  <Link href="/login">
                    <Button>Access Portal</Button>
                  </Link>
                </>
              )}
            </div>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="py-20 px-4 sm:px-6 lg:px-8">
        <div className="max-w-7xl mx-auto">
          <div className="text-center">
            <h1 className="text-4xl md:text-6xl font-bold text-gray-900 mb-6">
              Customer Portal
              <span className="block text-blue-600">& Admin Panel</span>
            </h1>
            <p className="text-xl text-gray-600 mb-8 max-w-3xl mx-auto">
              Secure customer portal for managing orders, documents, and support.
              Comprehensive admin panel for operational oversight and customer management.
            </p>
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link href="/login">
                <Button size="lg" className="text-lg px-8 py-3">
                  Access Portal
                  <ArrowRightIcon className="ml-2 h-5 w-5" />
                </Button>
              </Link>
              {!user && (
                <Link href="/login">
                  <Button variant="outline" size="lg" className="text-lg px-8 py-3">
                    Sign In
                  </Button>
                </Link>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Process Steps */}
      <section className="py-16 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">How It Works</h2>
            <p className="text-lg text-gray-600">Access your portal in 4 simple steps</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            {processSteps.map((step, index) => (
              <div key={index} className="text-center">
                <div className="w-16 h-16 bg-blue-600 text-white rounded-full flex items-center justify-center text-xl font-bold mx-auto mb-4">
                  {step.step}
                </div>
                <h3 className="text-lg font-semibold text-gray-900 mb-2">{step.title}</h3>
                <p className="text-gray-600">{step.description}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Features */}
      <section className="py-16 bg-gray-50">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-12">
            <h2 className="text-3xl font-bold text-gray-900 mb-4">Why Choose CNC Quote?</h2>
            <p className="text-lg text-gray-600">Advanced technology for modern manufacturing</p>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8">
            {features.map((feature, index) => (
              <Card key={index} className="text-center">
                <CardHeader>
                  <feature.icon className="h-12 w-12 text-blue-600 mx-auto mb-4" />
                  <CardTitle className="text-lg">{feature.title}</CardTitle>
                </CardHeader>
                <CardContent>
                  <CardDescription>{feature.description}</CardDescription>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-16 bg-blue-600">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h2 className="text-3xl font-bold text-white mb-4">Ready to Get Started?</h2>
          <p className="text-xl text-blue-100 mb-8">
            Join thousands of manufacturers who trust CNC Quote for their quoting needs.
          </p>
          <Link href="/dashboard">
            <Button size="lg" variant="secondary" className="text-lg px-8 py-3">
              Start Your Quote Now
              <ArrowRightIcon className="ml-2 h-5 w-5" />
            </Button>
          </Link>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-gray-900 text-white py-12">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div>
              <div className="flex items-center mb-4">
                <CubeIcon className="h-6 w-6 text-blue-400" />
                <span className="ml-2 text-lg font-bold">CNC Quote</span>
              </div>
              <p className="text-gray-400">
                Instant CNC quotes with automated DFM analysis for modern manufacturing.
              </p>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Product</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/features" className="hover:text-white">Features</Link></li>
                <li><Link href="/pricing" className="hover:text-white">Pricing</Link></li>
                <li><Link href="/integrations" className="hover:text-white">Integrations</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Support</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/docs" className="hover:text-white">Documentation</Link></li>
                <li><Link href="/help" className="hover:text-white">Help Center</Link></li>
                <li><Link href="/contact" className="hover:text-white">Contact Us</Link></li>
              </ul>
            </div>
            <div>
              <h3 className="text-lg font-semibold mb-4">Company</h3>
              <ul className="space-y-2 text-gray-400">
                <li><Link href="/about" className="hover:text-white">About</Link></li>
                <li><Link href="/blog" className="hover:text-white">Blog</Link></li>
                <li><Link href="/careers" className="hover:text-white">Careers</Link></li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-800 mt-8 pt-8 text-center text-gray-400">
            <p>&copy; 2024 CNC Quote. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
