import CustomerLayout from '@/components/CustomerLayout';
export default function FilesIndexPage() {
  return (
    <CustomerLayout>
      <h1 className="text-2xl font-semibold mb-6">Files</h1>
      <div className="rounded-lg border bg-white dark:bg-gray-900 p-6 text-sm text-gray-500 dark:text-gray-400">Upload CAD files via the Instant Quote page.</div>
    </CustomerLayout>
  );
}
