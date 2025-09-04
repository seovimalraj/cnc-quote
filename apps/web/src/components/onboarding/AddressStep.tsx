import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface AddressStepProps {
  data: {
    street: string
    city: string
    state: string
    zipCode: string
    country: string
  }
  onChange: (data: Partial<AddressStepProps['data']>) => void
}

const US_STATES = [
  'AL', 'AK', 'AZ', 'AR', 'CA', 'CO', 'CT', 'DE', 'FL', 'GA',
  'HI', 'ID', 'IL', 'IN', 'IA', 'KS', 'KY', 'LA', 'ME', 'MD',
  'MA', 'MI', 'MN', 'MS', 'MO', 'MT', 'NE', 'NV', 'NH', 'NJ',
  'NM', 'NY', 'NC', 'ND', 'OH', 'OK', 'OR', 'PA', 'RI', 'SC',
  'SD', 'TN', 'TX', 'UT', 'VT', 'VA', 'WA', 'WV', 'WI', 'WY'
]

const COUNTRIES = [
  { code: 'US', name: 'United States' },
  { code: 'CA', name: 'Canada' },
  { code: 'MX', name: 'Mexico' },
]

export function AddressStep({ data, onChange }: AddressStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="street" className="block text-sm font-medium text-gray-700">
          Street Address *
        </Label>
        <div className="mt-1">
          <Input
            id="street"
            type="text"
            required
            value={data.street}
            onChange={(e) => onChange({ street: e.target.value })}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="123 Main Street"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="city" className="block text-sm font-medium text-gray-700">
            City *
          </Label>
          <div className="mt-1">
            <Input
              id="city"
              type="text"
              required
              value={data.city}
              onChange={(e) => onChange({ city: e.target.value })}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="City"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="state" className="block text-sm font-medium text-gray-700">
            State/Province *
          </Label>
          <div className="mt-1">
            {data.country === 'US' ? (
              <Select value={data.state} onValueChange={(value) => onChange({ state: value })}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select state" />
                </SelectTrigger>
                <SelectContent>
                  {US_STATES.map((state) => (
                    <SelectItem key={state} value={state}>
                      {state}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            ) : (
              <Input
                id="state"
                type="text"
                required
                value={data.state}
                onChange={(e) => onChange({ state: e.target.value })}
                className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
                placeholder="State/Province"
              />
            )}
          </div>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="zipCode" className="block text-sm font-medium text-gray-700">
            ZIP/Postal Code *
          </Label>
          <div className="mt-1">
            <Input
              id="zipCode"
              type="text"
              required
              value={data.zipCode}
              onChange={(e) => onChange({ zipCode: e.target.value })}
              className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
              placeholder="12345"
            />
          </div>
        </div>

        <div>
          <Label htmlFor="country" className="block text-sm font-medium text-gray-700">
            Country *
          </Label>
          <div className="mt-1">
            <Select value={data.country} onValueChange={(value) => onChange({ country: value })}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
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
              This address will be used for billing and shipping purposes. Make sure it's accurate.
            </p>
          </div>
        </div>
      </div>
    </div>
  )
}
