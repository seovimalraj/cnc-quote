export default function NotFoundPage() {
  return (
    <div className="min-h-screen bg-gray-50 flex items-center justify-center px-4 sm:px-6 lg:px-8">
      <div className="max-w-md w-full bg-white rounded-lg shadow-sm border border-gray-200">
        <div className="pt-8 pb-8 text-center">
          <div className="mx-auto w-24 h-24 bg-red-100 rounded-full flex items-center justify-center mb-6">
            <div className="w-12 h-12 text-red-600">⚠️</div>
          </div>

          <h1 className="text-4xl font-bold text-gray-900 mb-2">404</h1>
          <h2 className="text-xl font-semibold text-gray-700 mb-4">Page Not Found</h2>

          <p className="text-gray-600 mb-8">
            The page you're looking for doesn't exist or has been moved.
          </p>

          <div className="space-y-3">
            <button
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded-md font-medium cursor-not-allowed opacity-50"
              disabled
            >
              <span>🏠</span>
              <span>Go to Dashboard</span>
            </button>

            <button
              className="w-full flex items-center justify-center space-x-2 px-4 py-2 border border-gray-300 bg-white text-gray-700 rounded-md font-medium cursor-not-allowed opacity-50"
              disabled
            >
              <span>⬅️</span>
              <span>Go Back</span>
            </button>

            <button
              className="w-full px-4 py-2 text-gray-700 rounded-md font-medium cursor-not-allowed opacity-50"
              disabled
            >
              Visit Help Center
            </button>
          </div>

          <div className="mt-8 pt-6 border-t border-gray-200">
            <p className="text-xs text-gray-500">
              If you believe this is an error, please{' '}
              <span className="text-blue-600 cursor-not-allowed opacity-50">
                contact support
              </span>
              .
            </p>
          </div>
        </div>
      </div>

      {/* Demo Notice */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md">
        <h3 className="text-sm font-semibold text-blue-900 mb-2">404 Error Demo</h3>
        <p className="text-sm text-blue-800">
          This is a demo of the 404 not found page. In the live application, users would be able to navigate back or contact support.
        </p>
      </div>
    </div>
  );
}
