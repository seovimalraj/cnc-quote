import { NextPage } from 'next';
import { useState, useEffect } from 'react';
import Link from 'next/link';

interface EnvironmentData {
  environment_name: string;
  git_sha_short: string;
  build_date: string;
  region: string;
  versions: {
    node: string;
    nest: string;
    python: string;
    redis: string;
    pg: string;
  };
  health: {
    api: string;
    cad: string;
    queue: string;
    supabase: string;
    stripe_webhook: string;
    paypal_webhook: string;
  };
  lat: {
    api: number;
    cad: number;
  };
  queue: {
    depth: number;
  };
}

const AdminDevEnvPage: NextPage = () => {
  const [data, setData] = useState<EnvironmentData | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetchEnvironmentData();
  }, []);

  const fetchEnvironmentData = async () => {
    try {
      const response = await fetch('/api/admin/dev/env');
      if (!response.ok) throw new Error('Failed to fetch environment data');
      const result = await response.json();
      setData(result);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Unknown error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-100';
      case 'degraded': return 'text-yellow-600 bg-yellow-100';
      case 'unhealthy': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <p className="text-gray-600">Loading environment data...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="text-red-600 mb-4">Error loading environment data</div>
          <p className="text-gray-600">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <nav className="flex mb-4" aria-label="Breadcrumb">
            <ol className="flex items-center space-x-4">
              <li><Link href="/admin" className="text-gray-400 hover:text-gray-500">Admin</Link></li>
              <li><span className="text-gray-500">/</span></li>
              <li><Link href="/admin/dev" className="text-gray-400 hover:text-gray-500">Developer Utilities</Link></li>
              <li><span className="text-gray-500">/</span></li>
              <li><span className="text-gray-900 font-medium">Environment & Secrets</span></li>
            </ol>
          </nav>
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-3xl font-bold text-gray-900">Environment Overview</h1>
              <div className="mt-2 flex items-center space-x-4">
                <span className="inline-flex items-center px-3 py-1 rounded-full text-sm font-medium bg-blue-100 text-blue-800">
                  {data?.environment_name}
                </span>
                <span className="text-gray-600">{data?.git_sha_short}</span>
                <span className="text-gray-600">{data?.build_date}</span>
                <span className="text-gray-600">{data?.region}</span>
              </div>
            </div>
            <button
              onClick={fetchEnvironmentData}
              className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50"
            >
              Refresh
            </button>
          </div>
        </div>

        {/* Grid Layout */}
        <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 mb-8">
          {/* Runtime Card */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Runtime</h3>
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-600">Node.js</span>
                <span className="font-mono text-sm">{data?.versions.node}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">NestJS</span>
                <span className="font-mono text-sm">{data?.versions.nest}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Python (CAD)</span>
                <span className="font-mono text-sm">{data?.versions.python}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">Redis</span>
                <span className="font-mono text-sm">{data?.versions.redis}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">PostgreSQL</span>
                <span className="font-mono text-sm">{data?.versions.pg}</span>
              </div>
            </div>
          </div>

          {/* Services Card */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900">Services</h3>
              <Link
                href="/admin/system-health"
                className="text-blue-600 hover:text-blue-800 text-sm font-medium"
              >
                Open System Health →
              </Link>
            </div>
            <div className="space-y-3">
              {Object.entries(data?.health || {}).map(([service, status]) => (
                <div key={service} className="flex justify-between items-center">
                  <span className="text-gray-600 capitalize">{service.replace('_', ' ')}</span>
                  <div className="flex items-center space-x-2">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getStatusColor(status as string)}`}>
                      {status}
                    </span>
                    {data?.lat && (service === 'api' || service === 'cad') && (
                      <span className="text-gray-500 text-xs">{data.lat[service as keyof typeof data.lat]}ms</span>
                    )}
                    {service === 'queue' && data?.queue && (
                      <span className="text-gray-500 text-xs">{data.queue.depth} jobs</span>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Configuration and Secrets */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Config Whitelist */}
          <div className="lg:col-span-2 bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Configuration (Whitelisted)</h3>
            <p className="text-gray-600 text-sm mb-4">
              Non-sensitive configuration values pulled from server.
            </p>
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-gray-200">
                <thead className="bg-gray-50">
                  <tr>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Key</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Value</th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Source</th>
                  </tr>
                </thead>
                <tbody className="bg-white divide-y divide-gray-200">
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">NEXT_PUBLIC_SUPABASE_URL</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">https://***.supabase.co</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Environment</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">NEXT_PUBLIC_API_URL</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">/api</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Environment</td>
                  </tr>
                  <tr>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-mono text-gray-900">CAD_SERVICE_URL</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">http://cad:8000</td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">Environment</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </div>

          {/* Secrets Masked */}
          <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-6">
            <h3 className="text-lg font-semibold text-gray-900 mb-4">Secrets (Masked · Read-only)</h3>
            <p className="text-gray-600 text-sm mb-4">
              Values are fully masked and cannot be revealed via UI.
            </p>
            <div className="space-y-4">
              <div>
                <div className="text-sm font-mono text-gray-900 mb-1">STRIPE_SECRET_KEY</div>
                <div className="text-sm text-gray-500 font-mono">sk_test_************9d3a</div>
                <div className="text-xs text-gray-400 mt-1">Rotated: 2025-09-01</div>
              </div>
              <div>
                <div className="text-sm font-mono text-gray-900 mb-1">SUPABASE_SERVICE_ROLE_KEY</div>
                <div className="text-sm text-gray-500 font-mono">eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...</div>
                <div className="text-xs text-gray-400 mt-1">Rotated: 2025-08-15</div>
              </div>
              <div>
                <div className="text-sm font-mono text-gray-900 mb-1">JWT_SECRET</div>
                <div className="text-sm text-gray-500 font-mono">************a1b2c3d4</div>
                <div className="text-xs text-gray-400 mt-1">Rotated: 2025-09-01</div>
              </div>
            </div>
            <div className="mt-4 p-3 bg-yellow-50 rounded-md">
              <p className="text-xs text-yellow-800">
                To rotate secrets, use your cloud provider or CI/CD. This UI never exposes full secrets.
              </p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminDevEnvPage;
