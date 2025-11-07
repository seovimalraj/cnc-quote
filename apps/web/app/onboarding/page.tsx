export default function OnboardingPage() {
  return (
    <div className="min-h-screen bg-gray-50 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-2xl mx-auto">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Welcome to CNC Quote</h1>
          <p className="mt-2 text-gray-600">Let's set up your account to get started</p>
        </div>

        {/* Progress Bar */}
        <div className="mb-8">
          <div className="flex justify-between text-sm text-gray-600 mb-2">
            <div className="flex-1 text-center text-blue-600 font-medium">Company Info</div>
            <div className="flex-1 text-center">Address</div>
            <div className="flex-1 text-center">Tax Information</div>
            <div className="flex-1 text-center">Review</div>
          </div>
          <div className="w-full bg-gray-200 rounded-full h-2">
            <div className="bg-blue-600 h-2 rounded-full" style={{ width: '25%' }}></div>
          </div>
        </div>

        {/* Step Content */}
        <div className="bg-white rounded-lg shadow-sm border border-gray-200">
          <div className="p-6">
            <div className="mb-6">
              <h2 className="text-xl font-semibold text-gray-900">Company Information</h2>
              <p className="text-gray-600">Basic company details</p>
            </div>

            <div className="space-y-6">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Name
                  </label>
                  <input
                    type="text"
                    defaultValue="Demo Manufacturing Inc."
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 py-3 px-4 text-gray-900 cursor-not-allowed opacity-75"
                    disabled
                  />
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Industry
                  </label>
                  <select className="w-full rounded-lg border border-gray-300 bg-gray-50 py-3 px-4 text-gray-900 cursor-not-allowed opacity-75" disabled>
                    <option>Aerospace & Defense</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Company Size
                  </label>
                  <select className="w-full rounded-lg border border-gray-300 bg-gray-50 py-3 px-4 text-gray-900 cursor-not-allowed opacity-75" disabled>
                    <option>51-200 employees</option>
                  </select>
                </div>

                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-2">
                    Business Description
                  </label>
                  <input
                    type="text"
                    defaultValue="Precision manufacturing and CNC machining services"
                    className="w-full rounded-lg border border-gray-300 bg-gray-50 py-3 px-4 text-gray-900 cursor-not-allowed opacity-75"
                    disabled
                  />
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <button className="px-6 py-3 border border-gray-300 rounded-lg text-gray-700 opacity-50 cursor-not-allowed">
            Previous
          </button>

          <button className="px-6 py-3 bg-blue-600 text-white rounded-lg font-medium opacity-50 cursor-not-allowed">
            Next
          </button>
        </div>

        {/* Skip Option */}
        <div className="mt-4 text-center">
          <button className="text-sm text-gray-500 opacity-50 cursor-not-allowed">
            Skip for now
          </button>
        </div>

        {/* Demo Notice */}
        <div className="mt-8 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
            <p className="text-sm text-blue-800">
              This is a demo onboarding flow. In the real application, you would complete these steps to set up your account.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
