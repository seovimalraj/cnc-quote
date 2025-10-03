/**
 * Step 20: Developer Portal - Main Page
 * API documentation hub with navigation
 */

import React from 'react';
import Link from 'next/link';
import GettingStarted from './_components/getting-started';
import Quickstart from './_components/quickstart';
import ApiReference from './_components/api-reference';
import CodeSamples from './_components/code-samples';

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white border-b border-gray-200 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Link href="/" className="text-2xl font-bold text-blue-600">
                Frigate API
              </Link>
              <span className="text-sm text-gray-500">v1.0</span>
            </div>
            <nav className="hidden md:flex space-x-6">
              <a href="#getting-started" className="text-gray-700 hover:text-blue-600">
                Getting Started
              </a>
              <a href="#quickstart" className="text-gray-700 hover:text-blue-600">
                Quickstart
              </a>
              <a href="#api-reference" className="text-gray-700 hover:text-blue-600">
                API Reference
              </a>
              <a href="#code-samples" className="text-gray-700 hover:text-blue-600">
                Code Samples
              </a>
              <a
                href="/openapi.json"
                target="_blank"
                rel="noopener noreferrer"
                className="text-gray-700 hover:text-blue-600"
              >
                OpenAPI Spec
              </a>
            </nav>
          </div>
        </div>
      </header>

      {/* Hero Section */}
      <section className="bg-gradient-to-r from-blue-600 to-indigo-700 text-white py-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h1 className="text-4xl md:text-5xl font-bold mb-4">
            Frigate Manufacturing API
          </h1>
          <p className="text-xl text-blue-100 mb-8 max-w-3xl">
            Build manufacturing applications with instant CNC quoting, DFM analysis, and automated pricing.
            RESTful API with comprehensive tax calculation for US, EU, and India.
          </p>
          <div className="flex flex-wrap gap-4">
            <a
              href="#quickstart"
              className="bg-white text-blue-600 px-6 py-3 rounded-lg font-semibold hover:bg-blue-50 transition"
            >
              Get Started
            </a>
            <a
              href="/openapi.json"
              target="_blank"
              rel="noopener noreferrer"
              className="bg-blue-500 text-white px-6 py-3 rounded-lg font-semibold hover:bg-blue-400 transition"
            >
              View OpenAPI Spec
            </a>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        {/* Getting Started */}
        <section id="getting-started" className="mb-16 scroll-mt-20">
          <GettingStarted />
        </section>

        {/* Quickstart */}
        <section id="quickstart" className="mb-16 scroll-mt-20">
          <Quickstart />
        </section>

        {/* API Reference */}
        <section id="api-reference" className="mb-16 scroll-mt-20">
          <ApiReference />
        </section>

        {/* Code Samples */}
        <section id="code-samples" className="mb-16 scroll-mt-20">
          <CodeSamples />
        </section>
      </main>

      {/* Footer */}
      <footer className="bg-gray-800 text-gray-300 py-8 mt-16">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div>
              <h3 className="text-white font-semibold mb-4">Resources</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/openapi.json" className="hover:text-white">
                    OpenAPI Specification
                  </a>
                </li>
                <li>
                  <a href="#api-reference" className="hover:text-white">
                    API Reference
                  </a>
                </li>
                <li>
                  <a href="#code-samples" className="hover:text-white">
                    Code Examples
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Support</h3>
              <ul className="space-y-2">
                <li>
                  <a href="mailto:support@frigate.ai" className="hover:text-white">
                    Contact Support
                  </a>
                </li>
                <li>
                  <a href="/status" className="hover:text-white">
                    API Status
                  </a>
                </li>
              </ul>
            </div>
            <div>
              <h3 className="text-white font-semibold mb-4">Legal</h3>
              <ul className="space-y-2">
                <li>
                  <a href="/terms" className="hover:text-white">
                    Terms of Service
                  </a>
                </li>
                <li>
                  <a href="/privacy" className="hover:text-white">
                    Privacy Policy
                  </a>
                </li>
              </ul>
            </div>
          </div>
          <div className="border-t border-gray-700 mt-8 pt-8 text-center text-sm">
            <p>&copy; 2025 Frigate. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
}
