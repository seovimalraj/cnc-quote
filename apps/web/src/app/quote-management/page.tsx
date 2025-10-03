"use client";

import React, { useState } from 'react';
import { QuoteHistory } from '../../../components/instant-quote/QuoteHistory';
import { QuoteComparison } from '../../../components/instant-quote/QuoteComparison';
import { FileText, GitCompare, History } from 'lucide-react';

// Mock comparison data
const MOCK_COMPARISON_OPTIONS = [
  {
    id: 'opt-1',
    name: 'Standard CNC - Aluminum 6061',
    material: 'Aluminum 6061-T6',
    process: 'CNC Machining',
    quantity: 50,
    unitPrice: 165.00,
    totalPrice: 8250.00,
    leadTimeDays: 7,
    manufacturabilityScore: 8.5,
    features: { holes: 12, pockets: 3, threads: 8 },
    pros: [
      'Best overall value for aluminum',
      'Excellent machinability',
      'Good corrosion resistance',
      'Fast lead time'
    ],
    cons: [
      'Not suitable for high-stress applications',
      'Lower strength than 7075'
    ],
    recommended: true
  },
  {
    id: 'opt-2',
    name: 'High-Strength - Aluminum 7075',
    material: 'Aluminum 7075-T6',
    process: 'CNC Machining',
    quantity: 50,
    unitPrice: 210.00,
    totalPrice: 10500.00,
    leadTimeDays: 9,
    manufacturabilityScore: 7.5,
    features: { holes: 12, pockets: 3, threads: 8 },
    pros: [
      'Superior strength-to-weight ratio',
      'Aerospace-grade material',
      'Excellent for high-stress parts'
    ],
    cons: [
      '27% more expensive',
      '2 days longer lead time',
      'More difficult to machine'
    ]
  },
  {
    id: 'opt-3',
    name: 'Budget Option - Aluminum 6063',
    material: 'Aluminum 6063',
    process: 'CNC Machining',
    quantity: 50,
    unitPrice: 140.00,
    totalPrice: 7000.00,
    leadTimeDays: 6,
    manufacturabilityScore: 9.0,
    features: { holes: 12, pockets: 3, threads: 8 },
    pros: [
      '15% cost savings vs 6061',
      'Fastest lead time',
      'Excellent for extrusions',
      'Best machinability score'
    ],
    cons: [
      'Lower strength than 6061',
      'Not for structural applications',
      'Limited to simple geometries'
    ]
  },
  {
    id: 'opt-4',
    name: 'Stainless Steel 304',
    material: 'Stainless Steel 304',
    process: 'CNC Machining',
    quantity: 50,
    unitPrice: 195.00,
    totalPrice: 9750.00,
    leadTimeDays: 10,
    manufacturabilityScore: 6.5,
    features: { holes: 12, pockets: 3, threads: 8 },
    pros: [
      'Excellent corrosion resistance',
      'Food-safe and medical-grade',
      'High temperature resistance',
      'Long-lasting durability'
    ],
    cons: [
      '18% more expensive than baseline',
      'Longest lead time (10 days)',
      'Harder to machine',
      '3x heavier than aluminum'
    ]
  }
];

export default function QuoteManagementPage() {
  const [activeTab, setActiveTab] = useState<'history' | 'comparison'>('history');

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-gray-100 dark:from-gray-900 dark:to-gray-800">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 sticky top-0 z-40 shadow-sm">
        <div className="max-w-[1800px] mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-500 rounded-lg">
                <FileText className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900 dark:text-gray-100">
                  Quote Management
                </h1>
                <p className="text-xs text-gray-500 dark:text-gray-400">
                  View history, compare options, and track your quotes
                </p>
              </div>
            </div>

            {/* Tab Navigation */}
            <div className="flex gap-2 p-1 bg-gray-100 dark:bg-gray-900 rounded-lg">
              <button
                onClick={() => setActiveTab('history')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'history'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <History className="w-4 h-4" />
                Quote History
              </button>
              <button
                onClick={() => setActiveTab('comparison')}
                className={`px-4 py-2 rounded-lg text-sm font-medium transition-all flex items-center gap-2 ${
                  activeTab === 'comparison'
                    ? 'bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 shadow-sm'
                    : 'text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-100'
                }`}
              >
                <GitCompare className="w-4 h-4" />
                Compare Options
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Content */}
      <main className="max-w-[1800px] mx-auto px-6 py-6">
        {activeTab === 'history' && (
          <QuoteHistory
            onViewQuote={(id) => console.log('View quote:', id)}
            onDuplicateQuote={(id) => console.log('Duplicate quote:', id)}
            onDeleteQuote={(id) => {
              if (confirm('Are you sure you want to delete this quote?')) {
                console.log('Delete quote:', id);
              }
            }}
            onExportQuote={(id) => console.log('Export quote:', id)}
          />
        )}

        {activeTab === 'comparison' && (
          <div className="space-y-6">
            {/* Info Banner */}
            <div className="p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
              <h3 className="text-sm font-semibold text-blue-900 dark:text-blue-100 mb-1">
                Material Comparison for Bracket Assembly (50 units)
              </h3>
              <p className="text-xs text-blue-700 dark:text-blue-300">
                We've analyzed your part and generated 4 optimized options across different materials. 
                The recommended option offers the best balance of cost, quality, and lead time.
              </p>
            </div>

            <QuoteComparison
              options={MOCK_COMPARISON_OPTIONS}
              baselineId="opt-1"
              onSelectOption={(id) => console.log('Selected option:', id)}
            />

            {/* Bottom CTA */}
            <div className="p-6 bg-gradient-to-r from-purple-500 to-pink-500 rounded-lg text-white text-center">
              <h3 className="text-lg font-bold mb-2">Need Help Choosing?</h3>
              <p className="text-sm opacity-90 mb-4">
                Our manufacturing experts can review your requirements and recommend the best option
              </p>
              <button className="px-6 py-2 bg-white text-purple-600 font-semibold rounded-lg hover:bg-gray-100 transition-colors">
                Schedule a Consultation
              </button>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
