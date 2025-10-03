/**
 * Step 20: API Reference Component
 * Embedded Redoc or Swagger UI for interactive docs
 */

'use client';

import React, { useState } from 'react';

export default function ApiReference() {
  const [activeTab, setActiveTab] = useState<'redoc' | 'swagger'>('redoc');
  const apiBaseUrl = process.env.NEXT_PUBLIC_API_URL || 'https://api.frigate.ai';

  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">API Reference</h2>
      <p className="text-gray-600 mb-6">
        Interactive API documentation with request/response examples. Try out endpoints directly from your browser.
      </p>

      {/* Tab Navigation */}
      <div className="flex space-x-4 mb-6 border-b border-gray-200">
        <button
          onClick={() => setActiveTab('redoc')}
          className={`pb-2 px-4 font-semibold transition ${
            activeTab === 'redoc'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          Redoc (Reference)
        </button>
        <button
          onClick={() => setActiveTab('swagger')}
          className={`pb-2 px-4 font-semibold transition ${
            activeTab === 'swagger'
              ? 'text-blue-600 border-b-2 border-blue-600'
              : 'text-gray-600 hover:text-blue-600'
          }`}
        >
          Swagger UI (Interactive)
        </button>
      </div>

      {/* Content */}
      <div className="relative" style={{ minHeight: '800px' }}>
        {activeTab === 'redoc' && (
          <div className="w-full h-full">
            <iframe
              src={`https://redocly.github.io/redoc/?url=${apiBaseUrl}/openapi.json`}
              className="w-full border-0 rounded-lg"
              style={{ height: '800px' }}
              title="API Reference (Redoc)"
            />
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Direct link:</strong>{' '}
                <a
                  href={`https://redocly.github.io/redoc/?url=${apiBaseUrl}/openapi.json`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Open in new window
                </a>
              </p>
            </div>
          </div>
        )}

        {activeTab === 'swagger' && (
          <div className="w-full h-full">
            <iframe
              src={`${apiBaseUrl}/docs`}
              className="w-full border-0 rounded-lg"
              style={{ height: '800px' }}
              title="API Reference (Swagger UI)"
            />
            <div className="mt-4 p-4 bg-gray-50 rounded-lg">
              <p className="text-sm text-gray-600">
                <strong>Direct link:</strong>{' '}
                <a
                  href={`${apiBaseUrl}/docs`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:underline"
                >
                  Open in new window
                </a>
              </p>
            </div>
          </div>
        )}
      </div>

      {/* Download OpenAPI Spec */}
      <div className="mt-8 p-6 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-lg border border-blue-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-3">OpenAPI Specification</h3>
        <p className="text-gray-600 mb-4">
          Download the OpenAPI 3.0 specification to generate client SDKs or import into API tools like Postman.
        </p>
        <div className="flex flex-wrap gap-4">
          <a
            href={`${apiBaseUrl}/openapi.json`}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path
                fillRule="evenodd"
                d="M3 17a1 1 0 011-1h12a1 1 0 110 2H4a1 1 0 01-1-1zm3.293-7.707a1 1 0 011.414 0L9 10.586V3a1 1 0 112 0v7.586l1.293-1.293a1 1 0 111.414 1.414l-3 3a1 1 0 01-1.414 0l-3-3a1 1 0 010-1.414z"
                clipRule="evenodd"
              />
            </svg>
            Download openapi.json
          </a>
          <a
            href="https://editor.swagger.io/"
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center px-4 py-2 bg-white border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 transition"
          >
            <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
              <path d="M13.586 3.586a2 2 0 112.828 2.828l-.793.793-2.828-2.828.793-.793zM11.379 5.793L3 14.172V17h2.828l8.38-8.379-2.83-2.828z" />
            </svg>
            Open in Swagger Editor
          </a>
        </div>
      </div>

      {/* Key Endpoints */}
      <div className="mt-8">
        <h3 className="text-2xl font-semibold text-gray-900 mb-4">Key Endpoints</h3>
        <div className="space-y-4">
          <EndpointCard
            method="POST"
            path="/api/price/v2/calculate"
            description="Calculate pricing with tax support for multiple quantities"
          />
          <EndpointCard
            method="GET"
            path="/api/v1/materials"
            description="List all available materials with properties and pricing"
          />
          <EndpointCard
            method="POST"
            path="/api/v1/geometry/analyze"
            description="Upload and analyze CAD geometry for DFM insights"
          />
          <EndpointCard
            method="GET"
            path="/api/v1/processes"
            description="Get available manufacturing processes (CNC, sheet metal, injection molding)"
          />
        </div>
      </div>
    </div>
  );
}

function EndpointCard({ method, path, description }: { method: string; path: string; description: string }) {
  const methodColors: Record<string, string> = {
    GET: 'bg-green-100 text-green-800',
    POST: 'bg-blue-100 text-blue-800',
    PUT: 'bg-yellow-100 text-yellow-800',
    DELETE: 'bg-red-100 text-red-800',
  };

  return (
    <div className="p-4 bg-gray-50 rounded-lg border border-gray-200 hover:border-blue-300 transition">
      <div className="flex items-center space-x-3 mb-2">
        <span className={`px-3 py-1 rounded font-mono text-xs font-bold ${methodColors[method]}`}>{method}</span>
        <code className="text-sm font-mono text-gray-800">{path}</code>
      </div>
      <p className="text-gray-600 text-sm">{description}</p>
    </div>
  );
}
