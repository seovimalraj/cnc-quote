interface FormData {
  company: {
    name: string
    industry: string
    size: string
    description: string
  }
  address: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  tax: {
    ein: string
    taxId: string
    taxClassification: string
    stateTaxId: string
  }
}

interface ReviewStepProps {
  data: FormData
}

export function ReviewStep({ data }: ReviewStepProps) {
  return (
    <div className="space-y-6">
      <div className="bg-green-50 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-green-700">
              Please review your information below. You can go back to edit any section if needed.
            </p>
          </div>
        </div>
      </div>

      <div className="space-y-6">
        {/* Company Information */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Company Information</h3>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Company Name:</dt>
              <dd className="text-sm text-gray-900">{data.company.name || 'Not provided'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Industry:</dt>
              <dd className="text-sm text-gray-900">{data.company.industry || 'Not provided'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Company Size:</dt>
              <dd className="text-sm text-gray-900">{data.company.size || 'Not provided'}</dd>
            </div>
            {data.company.description && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Description:</dt>
                <dd className="text-sm text-gray-900 max-w-xs truncate">{data.company.description}</dd>
              </div>
            )}
          </dl>
        </div>

        {/* Address Information */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Address Information</h3>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Street Address:</dt>
              <dd className="text-sm text-gray-900">{data.address.street || 'Not provided'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">City:</dt>
              <dd className="text-sm text-gray-900">{data.address.city || 'Not provided'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">State/Province:</dt>
              <dd className="text-sm text-gray-900">{data.address.state || 'Not provided'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">ZIP/Postal Code:</dt>
              <dd className="text-sm text-gray-900">{data.address.zipCode || 'Not provided'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Country:</dt>
              <dd className="text-sm text-gray-900">
                {data.address.country === 'US' ? 'United States' :
                 data.address.country === 'CA' ? 'Canada' :
                 data.address.country === 'MX' ? 'Mexico' : data.address.country || 'Not provided'}
              </dd>
            </div>
          </dl>
        </div>

        {/* Tax Information */}
        <div className="border border-gray-200 rounded-lg p-4">
          <h3 className="text-lg font-medium text-gray-900 mb-3">Tax Information</h3>
          <dl className="space-y-2">
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">EIN:</dt>
              <dd className="text-sm text-gray-900 font-mono">{data.tax.ein || 'Not provided'}</dd>
            </div>
            <div className="flex justify-between">
              <dt className="text-sm font-medium text-gray-500">Tax Classification:</dt>
              <dd className="text-sm text-gray-900">{data.tax.taxClassification || 'Not provided'}</dd>
            </div>
            {data.tax.stateTaxId && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">State Tax ID:</dt>
                <dd className="text-sm text-gray-900 font-mono">{data.tax.stateTaxId}</dd>
              </div>
            )}
            {data.tax.taxId && (
              <div className="flex justify-between">
                <dt className="text-sm font-medium text-gray-500">Additional Tax ID:</dt>
                <dd className="text-sm text-gray-900 font-mono">{data.tax.taxId}</dd>
              </div>
            )}
          </dl>
        </div>
      </div>

      <div className="bg-blue-50 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-blue-700">
              By completing this setup, you agree that all information provided is accurate and up-to-date.
              You can update this information later in your account settings.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
