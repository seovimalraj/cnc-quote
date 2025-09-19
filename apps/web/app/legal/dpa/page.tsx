'use client';

import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { ArrowLeftIcon } from '@heroicons/react/24/outline';

export default function DataProcessingAgreementPage() {
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
            <CardTitle className="text-2xl">Data Processing Agreement</CardTitle>
            <p className="text-sm text-gray-600">Last updated: September 1, 2024</p>
          </CardHeader>
          <CardContent className="prose prose-gray max-w-none">
            <p className="text-center font-semibold mb-6">
              DATA PROCESSING AGREEMENT
            </p>

            <p className="text-center mb-8">
              This Data Processing Agreement ("DPA") forms part of the Terms of Service between CNC Quotes
              ("Processor" or "we") and the Customer ("Controller" or "you") and governs the processing of
              Personal Data in connection with the Services.
            </p>

            <h2>1. Definitions</h2>
            <ul>
              <li><strong>"Personal Data"</strong> means any information relating to an identified or identifiable natural person</li>
              <li><strong>"Processing"</strong> means any operation or set of operations performed on Personal Data</li>
              <li><strong>"Data Subject"</strong> means the identified or identifiable natural person to whom Personal Data relates</li>
              <li><strong>"Controller"</strong> means the natural or legal person who determines the purposes and means of Processing</li>
              <li><strong>"Processor"</strong> means the natural or legal person who Processes Personal Data on behalf of the Controller</li>
              <li><strong>"Sub-processor"</strong> means any third party engaged by the Processor to Process Personal Data</li>
            </ul>

            <h2>2. Scope and Applicability</h2>
            <p>
              This DPA applies to the Processing of Personal Data by the Processor on behalf of the Controller
              in connection with the provision of CNC Quotes services. The Processor shall Process Personal Data
              only in accordance with the Controller's documented instructions.
            </p>

            <h2>3. Data Processing Details</h2>

            <h3>3.1 Categories of Data Subjects</h3>
            <ul>
              <li>Controller's employees and contractors</li>
              <li>Controller's customers and end users</li>
              <li>Individuals whose Personal Data is contained in CAD files or other materials provided by Controller</li>
            </ul>

            <h3>3.2 Categories of Personal Data</h3>
            <ul>
              <li>Contact information (names, email addresses, phone numbers)</li>
              <li>Professional information (job titles, company names)</li>
              <li>Technical data (IP addresses, device information)</li>
              <li>Usage data and analytics</li>
            </ul>

            <h3>3.3 Processing Activities</h3>
            <ul>
              <li>Collection and storage of Personal Data</li>
              <li>Analysis and processing for service provision</li>
              <li>Transmission and communication</li>
              <li>Security measures and monitoring</li>
              <li>Deletion and anonymization</li>
            </ul>

            <h3>3.4 Purposes of Processing</h3>
            <ul>
              <li>Provision of CNC machining quote services</li>
              <li>CAD file analysis and processing</li>
              <li>Customer support and communication</li>
              <li>Service improvement and analytics</li>
              <li>Legal compliance and security</li>
            </ul>

            <h2>4. Controller's Obligations</h2>
            <p>The Controller shall:</p>
            <ul>
              <li>Ensure that Processing instructions are lawful and compliant with applicable data protection laws</li>
              <li>Obtain all necessary consents and provide all necessary notices to Data Subjects</li>
              <li>Ensure that Personal Data provided to the Processor is accurate and up to date</li>
              <li>Comply with its obligations as a Controller under applicable data protection laws</li>
            </ul>

            <h2>5. Processor's Obligations</h2>
            <p>The Processor shall:</p>
            <ul>
              <li>Process Personal Data only in accordance with Controller's documented instructions</li>
              <li>Implement appropriate technical and organizational measures to ensure security of Personal Data</li>
              <li>Ensure that persons authorized to Process Personal Data are bound by confidentiality</li>
              <li>Assist Controller in responding to Data Subject requests and data protection impact assessments</li>
              <li>Notify Controller of any Personal Data breaches without undue delay</li>
              <li>Cooperate with supervisory authorities and assist Controller in compliance efforts</li>
            </ul>

            <h2>6. Security Measures</h2>
            <p>The Processor shall implement and maintain appropriate technical and organizational measures to ensure:</p>
            <ul>
              <li>Confidentiality of Personal Data</li>
              <li>Integrity and availability of Personal Data</li>
              <li>Resilience of Processing systems</li>
              <li>Ability to restore availability and access to Personal Data</li>
              <li>Regular testing and evaluation of security measures</li>
            </ul>

            <h2>7. Sub-processing</h2>
            <p>
              The Controller hereby authorizes the Processor to engage Sub-processors. The Processor shall
              maintain an up-to-date list of Sub-processors and provide it to the Controller upon request.
              The Processor shall ensure that Sub-processors are bound by written agreements containing
              data protection obligations substantially similar to those in this DPA.
            </p>

            <h2>8. Data Subject Rights</h2>
            <p>The Processor shall assist the Controller in fulfilling its obligations to respond to Data Subject requests, including:</p>
            <ul>
              <li>Right of access</li>
              <li>Right to rectification</li>
              <li>Right to erasure</li>
              <li>Right to restriction of processing</li>
              <li>Right to data portability</li>
              <li>Right to object</li>
            </ul>

            <h2>9. Data Breach Notification</h2>
            <p>
              In the event of a Personal Data breach, the Processor shall notify the Controller without undue delay
              after becoming aware of the breach. The notification shall include all information necessary for the
              Controller to comply with its own breach notification obligations.
            </p>

            <h2>10. Data Protection Impact Assessment</h2>
            <p>
              The Processor shall assist the Controller in conducting data protection impact assessments and
              prior consultations with supervisory authorities as required by applicable data protection laws.
            </p>

            <h2>11. Audit Rights</h2>
            <p>
              The Controller shall have the right to audit the Processor's compliance with this DPA. Audits shall
              be conducted with reasonable notice and during normal business hours. The Processor shall provide
              all reasonable assistance and cooperation for such audits.
            </p>

            <h2>12. International Data Transfers</h2>
            <p>
              Where Personal Data is transferred outside the European Economic Area, the Processor shall ensure
              that appropriate safeguards are in place, such as Standard Contractual Clauses or adequacy decisions.
            </p>

            <h2>13. Return or Deletion of Personal Data</h2>
            <p>
              Upon termination of the Services or at the Controller's request, the Processor shall return or delete
              all Personal Data, including copies, unless retention is required by applicable law. The Processor
              shall certify the completion of such return or deletion.
            </p>

            <h2>14. Liability</h2>
            <p>
              Each party shall be liable for its own breaches of this DPA. The Processor's liability shall be limited
              to the amount of fees paid by the Controller to the Processor in the 12 months preceding the claim.
            </p>

            <h2>15. Governing Law</h2>
            <p>
              This DPA shall be governed by and construed in accordance with the laws of the jurisdiction
              specified in the main Terms of Service, without regard to conflict of laws principles.
            </p>

            <h2>16. Amendments</h2>
            <p>
              This DPA may be amended by mutual written agreement of the parties. The Processor may update
              this DPA to comply with changes in applicable data protection laws, with reasonable notice to the Controller.
            </p>

            <h2>Contact Information</h2>
            <p>
              For questions regarding this DPA, please contact our Data Protection Officer at{' '}
              <a href="mailto:dpo@cncquotes.com" className="text-blue-600 hover:text-blue-800">
                dpo@cncquotes.com
              </a>
            </p>

            <div className="mt-8 p-4 bg-gray-50 rounded">
              <p className="text-sm text-gray-600">
                <strong>Acceptance:</strong> By using CNC Quotes services, you acknowledge that you have read,
                understood, and agree to be bound by this Data Processing Agreement.
              </p>
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
}
