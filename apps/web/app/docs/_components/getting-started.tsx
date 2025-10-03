/**
 * Step 20: Getting Started Component
 * Authentication and initial setup guide
 */

import React from 'react';

export default function GettingStarted() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Getting Started</h2>

      {/* Authentication */}
      <div className="mb-8">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Authentication</h3>
        <p className="text-gray-600 mb-4">
          The Frigate API uses Bearer token authentication. Include your API key in the Authorization header:
        </p>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
          <code>{`Authorization: Bearer YOUR_API_KEY`}</code>
        </pre>
        <div className="mt-4 p-4 bg-blue-50 border-l-4 border-blue-500 rounded">
          <p className="text-sm text-blue-800">
            <strong>Getting an API Key:</strong> Contact your account manager or email{' '}
            <a href="mailto:api@frigate.ai" className="underline">
              api@frigate.ai
            </a>{' '}
            to request API access.
          </p>
        </div>
      </div>

      {/* Base URL */}
      <div className="mb-8">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Base URL</h3>
        <p className="text-gray-600 mb-4">All API requests should be made to:</p>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
          <code>https://api.frigate.ai/api/v1</code>
        </pre>
      </div>

      {/* API Versioning */}
      <div className="mb-8">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">API Versioning</h3>
        <p className="text-gray-600 mb-4">
          The API supports versioning via URL prefix and Accept header:
        </p>
        <div className="space-y-4">
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">URL Versioning (Recommended):</p>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
              <code>GET /api/v1/materials</code>
            </pre>
          </div>
          <div>
            <p className="text-sm font-semibold text-gray-700 mb-2">Header Versioning:</p>
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
              <code>Accept: application/vnd.frigate.v1+json</code>
            </pre>
          </div>
        </div>
      </div>

      {/* Request/Response Format */}
      <div className="mb-8">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Request/Response Format</h3>
        <p className="text-gray-600 mb-4">
          All requests and responses use JSON. Always include the Content-Type header:
        </p>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto">
          <code>Content-Type: application/json</code>
        </pre>
      </div>

      {/* Rate Limits */}
      <div className="mb-8">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Rate Limits</h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600 mb-2">1,000</div>
            <div className="text-sm text-gray-600">requests per hour</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600 mb-2">100</div>
            <div className="text-sm text-gray-600">concurrent requests</div>
          </div>
          <div className="p-4 bg-gray-50 rounded-lg">
            <div className="text-3xl font-bold text-blue-600 mb-2">10 MB</div>
            <div className="text-sm text-gray-600">max request size</div>
          </div>
        </div>
      </div>

      {/* Error Handling */}
      <div className="mb-8">
        <h3 className="text-2xl font-semibold text-gray-800 mb-4">Error Handling</h3>
        <p className="text-gray-600 mb-4">
          All errors follow a standardized format with <code className="bg-gray-100 px-2 py-1 rounded">requestId</code> and{' '}
          <code className="bg-gray-100 px-2 py-1 rounded">traceId</code> for debugging:
        </p>
        <pre className="bg-gray-900 text-red-400 p-4 rounded-lg overflow-x-auto">
          <code>{`{
  "error": "Invalid material code",
  "code": "BAD_REQUEST",
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "traceId": "1a2b3c4d5e6f7g8h",
  "timestamp": "2025-10-02T10:30:00.000Z",
  "path": "/api/v1/price/v2/calculate"
}`}</code>
        </pre>
        <div className="mt-4">
          <h4 className="text-lg font-semibold text-gray-800 mb-2">Common Error Codes</h4>
          <ul className="space-y-2 text-gray-600">
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded">BAD_REQUEST</code> - Invalid input (400)
            </li>
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded">UNAUTHORIZED</code> - Missing or invalid API key (401)
            </li>
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded">FORBIDDEN</code> - Insufficient permissions (403)
            </li>
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded">NOT_FOUND</code> - Resource not found (404)
            </li>
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded">RATE_LIMITED</code> - Rate limit exceeded (429)
            </li>
            <li>
              <code className="bg-gray-100 px-2 py-1 rounded">INTERNAL</code> - Server error (500)
            </li>
          </ul>
        </div>
      </div>
    </div>
  );
}
