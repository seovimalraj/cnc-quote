import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Customer Portal - CNC Quote',
  description: 'Customer portal for CNC quoting platform',
}

export default function PortalPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-primary-600">Customer Portal</h1>
    </div>
  )
}
