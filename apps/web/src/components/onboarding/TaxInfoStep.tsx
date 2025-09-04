import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface TaxInfoStepProps {
  data: {
    ein: string
    taxId: string
    taxClassification: string
    stateTaxId: string
  }
  onChange: (data: Partial<TaxInfoStepProps['data']>) => void
}

const TAX_CLASSIFICATIONS = [
  'S-Corporation',
  'C-Corporation',
  'LLC',
  'Partnership',
  'Sole Proprietorship',
  'Non-Profit',
  'Government Entity',
  'Other',
]

export function TaxInfoStep({ data, onChange }: TaxInfoStepProps) {
  const formatEIN = (value: string) => {
    // Remove all non-digits
    const digits = value.replace(/\D/g, '')
    // Format as XX-XXXXXXX
    if (digits.length >= 2) {
      return `${digits.slice(0, 2)}-${digits.slice(2, 9)}`
    }
    return digits
  }

  const handleEINChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const formatted = formatEIN(e.target.value)
    onChange({ ein: formatted })
  }

  return (
    <div className="space-y-6">
      <div className="bg-yellow-50 p-4 rounded-md">
        <div className="flex">
          <div className="flex-shrink-0">
            <svg className="h-5 w-5 text-yellow-400" viewBox="0 0 20 20" fill="currentColor">
              <path fillRule="evenodd" d="M8.257 3.099c.765-1.36 2.722-1.36 3.486 0l5.58 9.92c.75 1.334-.213 2.98-1.742 2.98H4.42c-1.53 0-2.493-1.646-1.743-2.98l5.58-9.92zM11 13a1 1 0 11-2 0 1 1 0 012 0zm-1-8a1 1 0 00-1 1v3a1 1 0 002 0V6a1 1 0 00-1-1z" clipRule="evenodd" />
            </svg>
          </div>
          <div className="ml-3">
            <p className="text-sm text-yellow-700">
              Tax information is required for invoicing and compliance. This information is kept secure and confidential.
            </p>
          </div>
        </div>
      </div>

      <div>
        <Label htmlFor="ein" className="block text-sm font-medium text-gray-700">
          Employer Identification Number (EIN) *
        </Label>
        <div className="mt-1">
          <Input
            id="ein"
            type="text"
            required
            value={data.ein}
            onChange={handleEINChange}
            maxLength={10}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="XX-XXXXXXX"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Format: XX-XXXXXXX (9 digits total)
        </p>
      </div>

      <div>
        <Label htmlFor="taxClassification" className="block text-sm font-medium text-gray-700">
          Tax Classification *
        </Label>
        <div className="mt-1">
          <Select value={data.taxClassification} onValueChange={(value) => onChange({ taxClassification: value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select tax classification" />
            </SelectTrigger>
            <SelectContent>
              {TAX_CLASSIFICATIONS.map((classification) => (
                <SelectItem key={classification} value={classification}>
                  {classification}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="stateTaxId" className="block text-sm font-medium text-gray-700">
          State Tax ID
        </Label>
        <div className="mt-1">
          <Input
            id="stateTaxId"
            type="text"
            value={data.stateTaxId}
            onChange={(e) => onChange({ stateTaxId: e.target.value })}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="State tax identification number (if applicable)"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          Required in some states for tax purposes
        </p>
      </div>

      <div>
        <Label htmlFor="taxId" className="block text-sm font-medium text-gray-700">
          Additional Tax ID
        </Label>
        <div className="mt-1">
          <Input
            id="taxId"
            type="text"
            value={data.taxId}
            onChange={(e) => onChange({ taxId: e.target.value })}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Any additional tax identification numbers"
          />
        </div>
      </div>

      <div className="bg-gray-50 p-4 rounded-md">
        <h4 className="text-sm font-medium text-gray-900 mb-2">Need help finding your EIN?</h4>
        <ul className="text-xs text-gray-600 space-y-1">
          <li>• Check your business formation documents</li>
          <li>• Contact the IRS at 1-800-829-4933</li>
          <li>• Visit IRS.gov to apply for a new EIN</li>
        </ul>
      </div>
    </div>
  )
}
