export default function HelpCenterPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Search and Contact Bar */}
        <div className="mb-8 flex flex-col sm:flex-row gap-4 items-center justify-between">
          <div className="flex-1 max-w-md">
            <div className="relative">
              <svg className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" fill="currentColor" viewBox="0 0 20 20">
                <path fillRule="evenodd" d="M8 4a4 4 0 100 8 4 4 0 000-8zM2 8a6 6 0 1110.89 3.476l4.817 4.817a1 1 0 01-1.414 1.414l-4.816-4.816A6 6 0 012 8z" clipRule="evenodd" />
              </svg>
              <input
                type="text"
                placeholder="Search help & DFM guides… (⌘/)"
                defaultValue=""
                className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg bg-gray-50 text-gray-900 cursor-not-allowed opacity-75"
                disabled
              />
            </div>
          </div>

          <button className="flex items-center space-x-2 px-4 py-3 bg-blue-600 text-white rounded-lg font-medium opacity-50 cursor-not-allowed">
            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 20 20">
              <path fillRule="evenodd" d="M18 10c0 3.866-3.582 7-8 7a8.841 8.841 0 01-4.083-.98L2 17l1.338-3.123C2.493 12.767 2 11.434 2 10c0-3.866 3.582-7 8-7s8 3.134 8 7zM7 9H5v2h2V9zm8 0h-2v2h2V9zM9 9h2v2H9V9z" clipRule="evenodd" />
            </svg>
            <span>Contact Support</span>
          </button>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-4 gap-8">
          {/* Left Sidebar */}
          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg shadow-sm border border-gray-200">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Categories</h3>
                <div className="space-y-2">
                  <button className="w-full text-left px-3 py-2 bg-blue-50 text-blue-700 rounded-lg font-medium">
                    All Articles
                  </button>
                  {[
                    'Getting Started',
                    'File Formats',
                    'Pricing Rules',
                    'DFM Guide',
                    'Payments',
                    'Orders',
                    'Privacy & Security'
                  ].map((category) => (
                    <button
                      key={category}
                      className="w-full text-left px-3 py-2 text-gray-700 hover:bg-gray-50 rounded-lg"
                    >
                      {category}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            {/* Popular Articles */}
            <div className="bg-white rounded-lg shadow-sm border border-gray-200 mt-6">
              <div className="p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Popular Articles</h3>
                <div className="space-y-3">
                  {[
                    { title: 'Getting Started with CNC Quotes', category: 'Getting Started' },
                    { title: 'Supported CAD File Formats', category: 'File Formats' },
                    { title: 'Design for Manufacturability Guide', category: 'DFM Guide' },
                    { title: 'How Pricing Works', category: 'Pricing Rules' }
                  ].map((article, index) => (
                    <div key={index} className="p-3 hover:bg-gray-50 rounded-lg cursor-not-allowed opacity-75">
                      <div className="font-medium text-sm text-gray-900">{article.title}</div>
                      <span className="inline-block mt-1 px-2 py-1 bg-gray-100 text-gray-600 text-xs rounded">
                        {article.category}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>

          {/* Main Content */}
          <div className="lg:col-span-3">
            <div className="space-y-6">
              {/* Articles List */}
              <div className="space-y-4">
                {[
                  {
                    title: 'Getting Started with CNC Quotes',
                    category: 'Getting Started',
                    excerpt: 'Welcome to CNC Quotes! Learn how to upload your CAD files and get instant pricing for precision manufacturing.',
                    updated: '2024-09-01'
                  },
                  {
                    title: 'Supported CAD File Formats',
                    category: 'File Formats',
                    excerpt: 'We support STEP, IGES, STL, and other industry-standard CAD formats for seamless quote generation.',
                    updated: '2024-09-02'
                  },
                  {
                    title: 'Design for Manufacturability Guide',
                    category: 'DFM Guide',
                    excerpt: 'Optimize your designs for CNC machining with our comprehensive DFM guidelines and best practices.',
                    updated: '2024-09-03'
                  },
                  {
                    title: 'How Pricing Works',
                    category: 'Pricing Rules',
                    excerpt: 'Understanding our transparent pricing model based on material, complexity, and lead time requirements.',
                    updated: '2024-09-04'
                  }
                ].map((article, index) => (
                  <div key={index} className="bg-white rounded-lg shadow-sm border border-gray-200 p-6 hover:shadow-md transition-shadow cursor-not-allowed opacity-75">
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">
                          {article.title}
                        </h3>
                        <span className="inline-block px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full mb-3">
                          {article.category}
                        </span>
                        <p className="text-gray-600 text-sm">
                          {article.excerpt}
                        </p>
                      </div>
                      <svg className="w-5 h-5 text-gray-400 flex-shrink-0 ml-4" fill="currentColor" viewBox="0 0 20 20">
                        <path fillRule="evenodd" d="M4 4a2 2 0 012-2h4.586A2 2 0 0112 2.586L15.414 6A2 2 0 0116 7.414V16a2 2 0 01-2 2H6a2 2 0 01-2-2V4zm2 6a1 1 0 011-1h6a1 1 0 110 2H7a1 1 0 01-1-1zm1 3a1 1 0 100 2h6a1 1 0 100-2H7z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="flex items-center justify-between mt-4">
                      <span className="text-xs text-gray-500">
                        Updated {article.updated}
                      </span>
                      <button className="text-blue-600 hover:text-blue-700 font-medium opacity-50 cursor-not-allowed">
                        Read More →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>

        {/* Demo Notice */}
        <div className="mt-12 text-center">
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-6 max-w-2xl mx-auto">
            <h3 className="text-lg font-semibold text-blue-900 mb-2">Help Center Demo</h3>
            <p className="text-blue-800">
              This is a demo of our help center. In the live application, you can search articles, browse by category, and access comprehensive documentation for CNC quoting and manufacturing.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
}
