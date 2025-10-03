import CustomerLayout from '@/components/CustomerLayout';
export default function AccountPage() {
  return (
    <CustomerLayout>
      <h1 className="text-2xl font-semibold mb-4">Account</h1>
      <div className="grid gap-6 max-w-xl">
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-4">
          <h2 className="font-medium mb-2">Profile</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Manage your user information.</p>
          <form className="space-y-3">
            <div>
              <label htmlFor="name" className="block text-xs font-medium uppercase tracking-wide mb-1">Name</label>
              <input id="name" className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-transparent px-3 py-2 text-sm" placeholder="Jane Doe" />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wide mb-1">Email</label>
              <input id="email" disabled className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm" value="user@example.com" />
            </div>
            <button type="button" className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium hover:bg-blue-500">Save</button>
          </form>
        </section>
      </div>
    </CustomerLayout>
  );
}
