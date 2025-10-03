import CustomerLayout from '@/components/CustomerLayout';
import Link from 'next/link';

export default async function QuotesIndexPage() {
  // Placeholder fetch; replace with real API call
  const quotes: Array<{ id: string; status: string; total: number; updated_at: string }> = [];
  return (
    <CustomerLayout>
      <div className="flex items-center justify-between mb-6">
        <h1 className="text-2xl font-semibold">Quotes</h1>
        <Link href="/instant-quote" className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-500">New Instant Quote</Link>
      </div>
      <div className="overflow-hidden rounded-lg border bg-white dark:bg-gray-900">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 dark:bg-gray-800 text-left">
            <tr>
              <th className="px-4 py-2 font-medium">Quote ID</th>
              <th className="px-4 py-2 font-medium">Status</th>
              <th className="px-4 py-2 font-medium">Total</th>
              <th className="px-4 py-2 font-medium">Updated</th>
              <th className="px-4 py-2" />
            </tr>
          </thead>
          <tbody>
            {quotes.length === 0 && (
              <tr>
                <td colSpan={5} className="px-4 py-10 text-center text-gray-500">No quotes yet. Start with an <Link href="/instant-quote" className="text-blue-600 hover:underline">instant quote</Link>.</td>
              </tr>
            )}
            {quotes.map(q => (
              <tr key={q.id} className="border-t border-gray-100 dark:border-gray-800 hover:bg-gray-50/50 dark:hover:bg-gray-800/40">
                <td className="px-4 py-2 font-mono text-xs">{q.id.slice(0,8)}</td>
                <td className="px-4 py-2 capitalize">{q.status}</td>
                <td className="px-4 py-2">${'{'}q.total.toFixed(2){'}'}</td>
                <td className="px-4 py-2 text-xs">{new Date(q.updated_at).toLocaleString()}</td>
                <td className="px-4 py-2 text-right"><Link href={`/quotes/${q.id}`} className="text-blue-600 hover:underline">View</Link></td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </CustomerLayout>
  );
}
