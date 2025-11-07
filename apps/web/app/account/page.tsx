import CustomerLayout from '@/components/CustomerLayout';
export default function AccountPage() {
  return (
    <CustomerLayout>
      <h1 className="text-2xl font-semibold mb-4">Account</h1>
      <div className="grid gap-6 max-w-xl">
        <section className="rounded-lg border bg-white dark:bg-gray-900 p-4">
          <h2 className="font-medium mb-2">Profile</h2>
          <p className="text-sm text-gray-500 dark:text-gray-400 mb-4">Manage your user information.</p>
          <div className="space-y-3">
            <div>
              <label htmlFor="name" className="block text-xs font-medium uppercase tracking-wide mb-1">Name</label>
              <input id="name" className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm cursor-not-allowed opacity-75" placeholder="Jane Doe" disabled />
            </div>
            <div>
              <label htmlFor="email" className="block text-xs font-medium uppercase tracking-wide mb-1">Email</label>
              <input id="email" disabled className="w-full rounded-md border border-gray-300 dark:border-gray-700 bg-gray-50 dark:bg-gray-800 px-3 py-2 text-sm cursor-not-allowed opacity-75" value="user@example.com" />
            </div>
            <button type="button" className="rounded-md bg-blue-600 text-white px-4 py-2 text-sm font-medium cursor-not-allowed opacity-50">Save</button>
          </div>
        </section>
      </div>

      {/* Demo Notice */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-xl">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">Account Settings Demo</h3>
        <p className="text-sm text-blue-800">
          This is a demo of the account settings page. In the live application, you can update your profile information and manage your account preferences.
        </p>
      </div>
    </CustomerLayout>
  );
}
