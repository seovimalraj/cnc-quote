import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select'

interface CompanyInfoStepProps {
  data: {
    name: string
    industry: string
    size: string
    description: string
  }
  onChange: (data: Partial<CompanyInfoStepProps['data']>) => void
}

const INDUSTRIES = [
  'Manufacturing',
  'Automotive',
  'Aerospace',
  'Medical Devices',
  'Electronics',
  'Construction',
  'Oil & Gas',
  'Other',
]

const COMPANY_SIZES = [
  '1-10 employees',
  '11-50 employees',
  '51-200 employees',
  '201-1000 employees',
  '1000+ employees',
]

export function CompanyInfoStep({ data, onChange }: CompanyInfoStepProps) {
  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="company-name" className="block text-sm font-medium text-gray-700">
          Company Name *
        </Label>
        <div className="mt-1">
          <Input
            id="company-name"
            type="text"
            required
            value={data.name}
            onChange={(e) => onChange({ name: e.target.value })}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Enter your company name"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="industry" className="block text-sm font-medium text-gray-700">
          Industry *
        </Label>
        <div className="mt-1">
          <Select value={data.industry} onValueChange={(value) => onChange({ industry: value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select your industry" />
            </SelectTrigger>
            <SelectContent>
              {INDUSTRIES.map((industry) => (
                <SelectItem key={industry} value={industry}>
                  {industry}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="company-size" className="block text-sm font-medium text-gray-700">
          Company Size *
        </Label>
        <div className="mt-1">
          <Select value={data.size} onValueChange={(value) => onChange({ size: value })}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select company size" />
            </SelectTrigger>
            <SelectContent>
              {COMPANY_SIZES.map((size) => (
                <SelectItem key={size} value={size}>
                  {size}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description" className="block text-sm font-medium text-gray-700">
          Company Description
        </Label>
        <div className="mt-1">
          <Textarea
            id="description"
            rows={3}
            value={data.description}
            onChange={(e) => onChange({ description: e.target.value })}
            className="appearance-none block w-full px-3 py-2 border border-gray-300 rounded-md placeholder-gray-400 focus:outline-none focus:ring-blue-500 focus:border-blue-500 sm:text-sm"
            placeholder="Tell us about your company (optional)"
          />
        </div>
        <p className="mt-1 text-xs text-gray-500">
          This helps us provide better recommendations and support
        </p>
      </div>
    </div>
  )
}
