'use client';

export default function SupplierSchedulePage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-3xl font-bold text-gray-900 dark:text-white">Production Schedule</h1>
        <p className="text-gray-600 dark:text-gray-400 mt-1">
          View and manage production timeline
        </p>
      </div>
      <div className="bg-white dark:bg-gray-800 rounded-lg border border-gray-200 dark:border-gray-700 p-12 text-center">
        <p className="text-gray-500">Production schedule calendar will be displayed here</p>
      </div>
    </div>
  );
}
