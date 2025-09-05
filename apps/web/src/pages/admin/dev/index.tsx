import { NextPage } from 'next';
import { useState } from 'react';
import Link from 'next/link';

const AdminDevPage: NextPage = () => {
  const [isLoading, setIsLoading] = useState(false);

  const cards = [
    {
      title: 'Swagger / API Docs',
      desc: 'Explore API schemas and download OpenAPI specs.',
      href: '/admin/dev/swagger',
      icon: '📚',
    },
    {
      title: 'Environment & Secrets (Read-only)',
      desc: 'Deployment metadata and masked secrets.',
      href: '/admin/dev/env',
      icon: '🔒',
    },
    {
      title: 'Test Tools',
      desc: 'Send test webhooks, seed sample data (non-production only).',
      href: '/admin/dev/tools',
      icon: '🧪',
    },
  ];

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li>
                <Link href="/admin" className="text-gray-400 hover:text-gray-500">
                  Admin
                </Link>
              </li>
              <li>
                <span className="text-gray-500">/</span>
              </li>
              <li>
                <span className="text-gray-900 font-medium">Developer Utilities</span>
              </li>
            </ol>
          </nav>
          <h1 className="text-3xl font-bold text-gray-900">Developer Utilities</h1>
          <p className="mt-2 text-gray-600">
            Tools and documentation for developers and system administrators.
          </p>
        </div>

        {/* Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {cards.map((card) => (
            <Link
              key={card.href}
              href={card.href}
              className="block bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow"
            >
              <div className="flex items-center mb-4">
                <span className="text-2xl mr-3">{card.icon}</span>
                <h3 className="text-lg font-semibold text-gray-900">{card.title}</h3>
              </div>
              <p className="text-gray-600 text-sm">{card.desc}</p>
              <div className="mt-4 text-blue-600 text-sm font-medium">
                Open →
              </div>
            </Link>
          ))}
        </div>

        {/* Help Section */}
        <div className="mt-12 bg-blue-50 rounded-lg p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-2">Need Help?</h3>
          <p className="text-blue-700 mb-4">
            These tools are for development and testing purposes only.
            All actions are logged for security and compliance.
          </p>
          <Link
            href="/docs/admin/dev-utilities"
            className="text-blue-600 hover:text-blue-800 font-medium"
          >
            View Documentation →
          </Link>
        </div>
      </div>
    </div>
  );
};

export default AdminDevPage;
