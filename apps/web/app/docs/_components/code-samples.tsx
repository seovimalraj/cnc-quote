/**
 * Step 20: Code Samples Component
 * Example code in multiple languages
 */

'use client';

import React, { useState } from 'react';

export default function CodeSamples() {
  const [activeLanguage, setActiveLanguage] = useState<'curl' | 'javascript' | 'python' | 'typescript'>('curl');

  return (
    <div className="bg-white rounded-lg shadow-sm p-8">
      <h2 className="text-3xl font-bold text-gray-900 mb-6">Code Samples</h2>
      <p className="text-gray-600 mb-6">
        Example code for common API operations in multiple programming languages.
      </p>

      {/* Language Selector */}
      <div className="flex flex-wrap gap-2 mb-6">
        <LanguageButton
          active={activeLanguage === 'curl'}
          onClick={() => setActiveLanguage('curl')}
          label="cURL"
        />
        <LanguageButton
          active={activeLanguage === 'javascript'}
          onClick={() => setActiveLanguage('javascript')}
          label="JavaScript"
        />
        <LanguageButton
          active={activeLanguage === 'python'}
          onClick={() => setActiveLanguage('python')}
          label="Python"
        />
        <LanguageButton
          active={activeLanguage === 'typescript'}
          onClick={() => setActiveLanguage('typescript')}
          label="TypeScript"
        />
      </div>

      {/* Code Examples */}
      <div className="space-y-8">
        {/* Calculate Price */}
        <CodeExample title="Calculate Price Quote">
          {activeLanguage === 'curl' && (
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{`curl -X POST "https://api.frigate.ai/api/price/v2/calculate" \\
  -H "Authorization: Bearer $FRIGATE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "part_config": {
      "process_type": "milling",
      "material": "AL_6061",
      "finish": "anodized_type_ii"
    },
    "quantities": [1, 10, 50, 100]
  }'`}</code>
            </pre>
          )}
          {activeLanguage === 'javascript' && (
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{`const response = await fetch('https://api.frigate.ai/api/price/v2/calculate', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.FRIGATE_API_KEY}\`,
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.frigate.v1+json'
  },
  body: JSON.stringify({
    part_config: {
      process_type: 'milling',
      material: 'AL_6061',
      finish: 'anodized_type_ii'
    },
    quantities: [1, 10, 50, 100]
  })
});

const data = await response.json();
console.log('Unit price:', data.pricing.pricing_matrix[0].unit_price);`}</code>
            </pre>
          )}
          {activeLanguage === 'python' && (
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{`import requests
import os

response = requests.post(
    'https://api.frigate.ai/api/price/v2/calculate',
    headers={
        'Authorization': f'Bearer {os.getenv("FRIGATE_API_KEY")}',
        'Content-Type': 'application/json',
        'Accept': 'application/vnd.frigate.v1+json'
    },
    json={
        'part_config': {
            'process_type': 'milling',
            'material': 'AL_6061',
            'finish': 'anodized_type_ii'
        },
        'quantities': [1, 10, 50, 100]
    }
)

data = response.json()
print(f"Unit price: {data['pricing']['pricing_matrix'][0]['unit_price']}")`}</code>
            </pre>
          )}
          {activeLanguage === 'typescript' && (
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{`interface PricingRequest {
  part_config: {
    process_type: string;
    material: string;
    finish: string;
  };
  quantities: number[];
}

interface PricingResponse {
  pricing: {
    pricing_matrix: Array<{
      quantity: number;
      unit_price: number;
      total_price: number;
    }>;
  };
  requestId: string;
}

const response = await fetch('https://api.frigate.ai/api/price/v2/calculate', {
  method: 'POST',
  headers: {
    'Authorization': \`Bearer \${process.env.FRIGATE_API_KEY}\`,
    'Content-Type': 'application/json',
    'Accept': 'application/vnd.frigate.v1+json'
  },
  body: JSON.stringify({
    part_config: {
      process_type: 'milling',
      material: 'AL_6061',
      finish: 'anodized_type_ii'
    },
    quantities: [1, 10, 50, 100]
  } as PricingRequest)
});

const data: PricingResponse = await response.json();`}</code>
            </pre>
          )}
        </CodeExample>

        {/* Calculate Price with Tax */}
        <CodeExample title="Calculate Price with Tax">
          {activeLanguage === 'curl' && (
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{`curl -X POST "https://api.frigate.ai/api/price/v2/calculate?calculate_tax=true" \\
  -H "Authorization: Bearer $FRIGATE_API_KEY" \\
  -H "Content-Type: application/json" \\
  -d '{
    "part_config": {
      "process_type": "milling",
      "material": "AL_6061"
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
          )}
          {activeLanguage === 'javascript' && (
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{`const response = await fetch(
  'https://api.frigate.ai/api/price/v2/calculate?calculate_tax=true',
  {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${process.env.FRIGATE_API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      part_config: {
        process_type: 'milling',
        material: 'AL_6061'
      },
      quantities: [10, 100],
      shipTo: {
        country: 'US',
        state: 'CA',
        postalCode: '94102'
      },
      customerType: 'B2B'
    })
  }
);

const data = await response.json();
console.log('Tax:', data.pricing.tax.totalTax);
console.log('Provider:', data.pricing.tax.provider);`}</code>
            </pre>
          )}
          {activeLanguage === 'python' && (
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{`response = requests.post(
    'https://api.frigate.ai/api/price/v2/calculate',
    params={'calculate_tax': 'true'},
    headers={
        'Authorization': f'Bearer {os.getenv("FRIGATE_API_KEY")}',
        'Content-Type': 'application/json'
    },
    json={
        'part_config': {
            'process_type': 'milling',
            'material': 'AL_6061'
        },
        'quantities': [10, 100],
        'shipTo': {
            'country': 'US',
            'state': 'CA',
            'postalCode': '94102'
        },
        'customerType': 'B2B'
    }
)

data = response.json()
print(f"Tax: ${data['pricing']['tax']['totalTax']:.2f}")
print(f"Jurisdiction: {data['pricing']['tax']['jurisdiction']}")`}</code>
            </pre>
          )}
          {activeLanguage === 'typescript' && (
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{`interface TaxRequest extends PricingRequest {
  shipTo: {
    country: string;
    state?: string;
    postalCode?: string;
  };
  customerType?: 'B2B' | 'B2C';
  vatNumber?: string;
}

const response = await fetch(
  'https://api.frigate.ai/api/price/v2/calculate?calculate_tax=true',
  {
    method: 'POST',
    headers: {
      'Authorization': \`Bearer \${process.env.FRIGATE_API_KEY}\`,
      'Content-Type': 'application/json'
    },
    body: JSON.stringify({
      part_config: {
        process_type: 'milling',
        material: 'AL_6061'
      },
      quantities: [10, 100],
      shipTo: {
        country: 'US',
        state: 'CA',
        postalCode: '94102'
      },
      customerType: 'B2B'
    } as TaxRequest)
  }
);`}</code>
            </pre>
          )}
        </CodeExample>

        {/* Error Handling */}
        <CodeExample title="Error Handling">
          {activeLanguage === 'curl' && (
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{`# Error responses include requestId for debugging
curl -X GET "https://api.frigate.ai/api/v1/materials/INVALID" \\
  -H "Authorization: Bearer $FRIGATE_API_KEY"

# Response (404):
# {
#   "error": "Material not found",
#   "code": "NOT_FOUND",
#   "requestId": "550e8400-e29b-41d4-a716-446655440000",
#   "traceId": "1a2b3c4d5e6f7g8h"
# }`}</code>
            </pre>
          )}
          {activeLanguage === 'javascript' && (
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{`try {
  const response = await fetch('https://api.frigate.ai/api/v1/materials/INVALID', {
    headers: {
      'Authorization': \`Bearer \${process.env.FRIGATE_API_KEY}\`
    }
  });

  if (!response.ok) {
    const error = await response.json();
    console.error(\`Error [\${error.code}]: \${error.error}\`);
    console.error(\`Request ID: \${error.requestId}\`);
    console.error(\`Trace ID: \${error.traceId}\`);
    throw new Error(error.error);
  }

  const data = await response.json();
} catch (err) {
  console.error('API request failed:', err);
}`}</code>
            </pre>
          )}
          {activeLanguage === 'python' && (
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{`try:
    response = requests.get(
        'https://api.frigate.ai/api/v1/materials/INVALID',
        headers={'Authorization': f'Bearer {os.getenv("FRIGATE_API_KEY")}'}
    )
    response.raise_for_status()
    data = response.json()
except requests.exceptions.HTTPError as err:
    error = response.json()
    print(f"Error [{error['code']}]: {error['error']}")
    print(f"Request ID: {error['requestId']}")
    print(f"Trace ID: {error.get('traceId', 'N/A')}")
    raise`}</code>
            </pre>
          )}
          {activeLanguage === 'typescript' && (
            <pre className="bg-gray-900 text-green-400 p-4 rounded-lg overflow-x-auto text-sm">
              <code>{`interface ErrorResponse {
  error: string;
  code: string;
  requestId: string;
  traceId?: string;
  timestamp: string;
  path: string;
}

async function callApi<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: {
      'Authorization': \`Bearer \${process.env.FRIGATE_API_KEY}\`
    }
  });

  if (!response.ok) {
    const error: ErrorResponse = await response.json();
    console.error(\`[\${error.code}] \${error.error}\`);
    console.error(\`Request ID: \${error.requestId}\`);
    throw new Error(error.error);
  }

  return response.json();
}`}</code>
            </pre>
          )}
        </CodeExample>
      </div>

      {/* SDK Notice */}
      <div className="mt-8 p-6 bg-gradient-to-r from-purple-50 to-pink-50 rounded-lg border border-purple-200">
        <h3 className="text-xl font-semibold text-gray-900 mb-3">TypeScript SDK (Coming Soon)</h3>
        <p className="text-gray-600 mb-4">
          We're building an official TypeScript SDK with full type safety and IntelliSense support. Sign up for early
          access:
        </p>
        <a
          href="mailto:api@frigate.ai?subject=TypeScript%20SDK%20Early%20Access"
          className="inline-flex items-center px-4 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 transition"
        >
          Request Early Access
        </a>
      </div>
    </div>
  );
}

function LanguageButton({
  active,
  onClick,
  label,
}: {
  active: boolean;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      onClick={onClick}
      className={`px-4 py-2 rounded-lg font-semibold transition ${
        active
          ? 'bg-blue-600 text-white'
          : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
      }`}
    >
      {label}
    </button>
  );
}

function CodeExample({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <h3 className="text-xl font-semibold text-gray-900 mb-3">{title}</h3>
      {children}
    </div>
  );
}
