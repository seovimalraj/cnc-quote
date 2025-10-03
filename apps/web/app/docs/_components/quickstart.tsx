/**
 * Step 20: Quickstart Component
 * 5-minute guide to first API call
 */

import React from 'react';

export default function Quickstart() {
  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Quickstart</h2>
      <p className="text-gray-600 mb-8">
        Get your first quote in under 5 minutes. This guide walks you through calculating a price for a CNC milled part.
      </p>

      {/* Step 1 */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold mr-3">
            1
          </span>
          <h3 className="text-xl font-semibold text-gray-800">Set Up Authentication</h3>
        </div>
        <p className="text-gray-600 mb-4 ml-11">
          Export your API key as an environment variable:
        </p>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto ml-11">
          <code>{`export FRIGATE_API_KEY="your_api_key_here"`}</code>
        </pre>
      </div>

      {/* Step 2 */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold mr-3">
            2
          </span>
          <h3 className="text-xl font-semibold text-gray-800">Get Available Materials</h3>
        </div>
        <p className="text-gray-600 mb-4 ml-11">
          Fetch the list of supported materials:
        </p>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto ml-11">
          <code>{`curl -X GET "https://api.frigate.ai/api/v1/materials" \\
  -H "Authorization: Bearer $FRIGATE_API_KEY" \\
  -H "Accept: application/vnd.frigate.v1+json"`}</code>
        </pre>
      </div>

      {/* Step 3 */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold mr-3">
            3
          </span>
          <h3 className="text-xl font-semibold text-gray-800">Calculate a Price Quote</h3>
        </div>
        <p className="text-gray-600 mb-4 ml-11">
          Request pricing for a CNC milled aluminum part:
        </p>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto ml-11 text-sm">
          <code>{`curl -X POST "https://api.frigate.ai/api/price/v2/calculate" \\
  -H "Authorization: Bearer $FRIGATE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "part_config": {
      "process_type": "milling",
      "material": "AL_6061",
      "finish": "anodized_type_ii",
      "tolerance_class": "standard",
      "lead_time_option": "standard"
    },
    "quantities": [1, 10, 50, 100]
  }'`}</code>
        </pre>
      </div>

      {/* Step 4 */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <span className="flex items-center justify-center w-8 h-8 bg-blue-600 text-white rounded-full font-bold mr-3">
            4
          </span>
          <h3 className="text-xl font-semibold text-gray-800">Calculate with Tax (Optional)</h3>
        </div>
        <p className="text-gray-600 mb-4 ml-11">
          Add tax calculation for US, EU, or India:
        </p>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto ml-11 text-sm">
          <code>{`curl -X POST "https://api.frigate.ai/api/price/v2/calculate?calculate_tax=true" \\
  -H "Authorization: Bearer $FRIGATE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "part_config": {
      "process_type": "milling",
      "material": "AL_6061",
      "finish": "anodized_type_ii"
    },
    "quantities": [10, 100],
    "shipTo": {
      "country": "US",
      "state": "CA",
      "postalCode": "94102"
    },
    "customerType": "B2B"
  }'`}</code>
        </pre>
      </div>

      {/* Example Response */}
      <div className="mb-8">
        <div className="flex items-center mb-4">
          <span className="flex items-center justify-center w-8 h-8 bg-green-600 text-white rounded-full font-bold mr-3">
            ✓
          </span>
          <h3 className="text-xl font-semibold text-gray-800">Example Response</h3>
        </div>
        <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto ml-11 text-sm">
          <code>{`{
  "pricing": {
    "pricing_matrix": [
      {
        "quantity": 10,
        "unit_price": 45.50,
        "total_price": 455.00,
        "cost_factors": {
          "material": 12.30,
          "machining": 25.20,
          "setup": 5.00,
          "finish": 3.00
        },
        "currency": "USD"
      }
    ],
    "tax": {
      "totalTax": 33.01,
      "jurisdiction": "US-CA",
      "provider": "taxjar-stub",
      "lines": [
        {
          "quantity": 10,
          "taxAmount": 33.01,
          "taxRate": 0.0725,
          "taxableAmount": 455.00
        }
      ]
    },
    "currency": "USD"
  },
  "requestId": "550e8400-e29b-41d4-a716-446655440000",
  "traceId": "1a2b3c4d5e6f7g8h"
}`}</code>
        </pre>
      </div>

      {/* Next Steps */}
      <div className="bg-blue-50 border-l-4 border-blue-500 rounded p-4">
        <h4 className="text-lg font-semibold text-blue-900 mb-2">Next Steps</h4>
        <ul className="space-y-2 text-blue-800">
          <li>✓ Explore the full API Reference below</li>
          <li>✓ Check out code samples in multiple languages</li>
          <li>✓ Download the TypeScript SDK (coming soon)</li>
          <li>✓ Read about tax calculation for international orders</li>
        </ul>
      </div>
    </div>
  );
}
