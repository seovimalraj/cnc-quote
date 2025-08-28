import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Admin Dashboard - CNC Quote',
  description: 'Admin dashboard for managing CNC quoting platform',
}

export default function AdminPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-primary-600">Admin Dashboard</h1>
    </div>
  )
}
