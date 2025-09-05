'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function TermsOfServicePage() {
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <div className="bg-white border-b border-gray-200">
        <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="flex items-center h-16">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => window.history.back()}
              className="flex items-center space-x-2"
            >
              <ArrowLeftIcon className="w-4 h-4" />
              <span>Back</span>
            </Button>
          </div>
        </div>
      </div>

      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <Card>
          <CardHeader>
            <CardTitle className="text-2xl">Terms of Service</CardTitle>
            <p className="text-sm text-gray-600">Last updated: September 1, 2024</p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <h2>1. Acceptance of Terms</h2>
            <p>
              By accessing and using CNC Quotes ("the Service"), you accept and agree to be bound by the terms
              and provision of this agreement. If you do not agree to abide by the above, please do not use this service.
            </p>

            <h2>2. Use License</h2>
            <p>
              Permission is granted to temporarily use the Service for personal, non-commercial transitory viewing only.
              This is the grant of a license, not a transfer of title, and under this license you may not:
            </p>
            <ul>
              <li>modify or copy the materials</li>
              <li>use the materials for any commercial purpose or for any public display</li>
              <li>attempt to decompile or reverse engineer any software contained on the Service</li>
              <li>remove any copyright or other proprietary notations from the materials</li>
            </ul>

            <h2>3. Service Description</h2>
            <p>
              CNC Quotes provides automated CNC machining quote generation using CAD file analysis.
              The service includes instant pricing, DFM analysis, and order processing for CNC machined parts.
            </p>

            <h2>4. User Accounts</h2>
            <p>
              When you create an account with us, you must provide information that is accurate, complete, and current at all times.
              You are responsible for safeguarding the password and for all activities that occur under your account.
            </p>

            <h2>5. Acceptable Use</h2>
            <p>You agree not to use the service:</p>
            <ul>
              <li>For any unlawful purpose or to solicit others to perform unlawful acts</li>
              <li>To violate any international, federal, provincial, or state regulations, rules, laws, or local ordinances</li>
              <li>To infringe upon or violate our intellectual property rights or the intellectual property rights of others</li>
              <li>To harass, abuse, insult, harm, defame, slander, disparage, intimidate, or discriminate</li>
              <li>To submit false or misleading information</li>
            </ul>

            <h2>6. Intellectual Property</h2>
            <p>
              The Service and its original content, features, and functionality are and will remain the exclusive property
              of CNC Quotes and its licensors. The service is protected by copyright, trademark, and other laws.
            </p>

            <h2>7. Termination</h2>
            <p>
              We may terminate or suspend your account and bar access to the Service immediately, without prior notice or liability,
              under our sole discretion, for any reason whatsoever and without limitation, including but not limited to a breach of the Terms.
            </p>

            <h2>8. Limitation of Liability</h2>
            <p>
              In no event shall CNC Quotes, nor its directors, employees, partners, agents, suppliers, or affiliates,
              be liable for any indirect, incidental, special, consequential, or punitive damages, including without limitation,
              loss of profits, data, use, goodwill, or other intangible losses.
            </p>

            <h2>9. Governing Law</h2>
            <p>
              These Terms shall be interpreted and governed by the laws of the jurisdiction in which CNC Quotes operates,
              without regard to its conflict of law provisions.
            </p>

            <h2>10. Changes to Terms</h2>
            <p>
              We reserve the right, at our sole discretion, to modify or replace these Terms at any time.
              If a revision is material, we will provide at least 30 days notice prior to any new terms taking effect.
            </p>

            <h2>Contact Information</h2>
            <p>
              If you have any questions about these Terms of Service, please contact us at{' '}
              <a href="mailto:legal@cncquotes.com" className="text-blue-600 hover:text-blue-800">
                legal@cncquotes.com
              </a>
            </p>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
