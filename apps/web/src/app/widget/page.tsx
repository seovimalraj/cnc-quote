import { Metadata } from 'next'

export const metadata: Metadata = {
  title: 'Quote Widget - CNC Quote',
  description: 'Embeddable quote widget for CNC quoting platform',
}

export default function WidgetPage() {
  return (
    <div className="p-4">
      <h1 className="text-2xl font-bold text-primary-600">Quote Widget</h1>
    </div>
  )
}
