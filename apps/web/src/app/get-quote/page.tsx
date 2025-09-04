'use client';

import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import {
  CloudArrowUpIcon,
  BoltIcon,
  CubeIcon,
  ShieldCheckIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';

function HeroSection() {
  return (
    <div className="bg-gradient-to-br from-blue-600 to-indigo-700 text-white py-20">
      <div className="max-w-4xl mx-auto text-center px-6">
        <h1 className="text-4xl md:text-6xl font-bold mb-6">
          Upload Your CAD. Get Instant Pricing.
        </h1>
        <p className="text-xl md:text-2xl mb-8 text-blue-100">
          CNC machining, Sheet Metal, and Injection Molding with live DFM.
        </p>
        <div className="flex flex-wrap justify-center gap-4 mb-8">
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30 px-4 py-2">
            ISO 9001
          </Badge>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30 px-4 py-2">
            Secure Uploads
          </Badge>
          <Badge variant="secondary" className="bg-white/20 text-white border-white/30 px-4 py-2">
            Onshore Options
          </Badge>
        </div>
      </div>
    </div>
  );
}

function InstantQuotePanel() {
  const [dragActive, setDragActive] = useState(false);

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);

    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      console.log('Files dropped:', e.dataTransfer.files);
    }
  };

  return (
    <Card className="max-w-2xl mx-auto -mt-16 relative z-10 shadow-2xl">
      <CardContent className="p-8">
        <div
          className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${
            dragActive
              ? 'border-blue-400 bg-blue-50'
              : 'border-gray-300 hover:border-gray-400'
          }`}
          onDragEnter={handleDrag}
          onDragLeave={handleDrag}
          onDragOver={handleDrag}
          onDrop={handleDrop}
        >
          <CloudArrowUpIcon className="mx-auto h-16 w-16 text-gray-400 mb-4" />
          <p className="text-lg font-medium text-gray-900 mb-2">
            Upload your CAD files
          </p>
          <p className="text-sm text-gray-500 mb-6">
            No signup required to preview pricing. Save or order when ready.
          </p>
          <div className="flex flex-col sm:flex-row gap-3 justify-center">
            <Button size="lg">
              Start Instant Quote
            </Button>
            <Button size="lg" variant="outline">
              Talk to an Expert
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}

function EducationStrip() {
  const features = [
    {
      icon: BoltIcon,
      title: "First Price in <2s",
      desc: "Editable materials, finishes, quantities"
    },
    {
      icon: CubeIcon,
      title: "3D DFM",
      desc: "Auto highlights and suggestions"
    },
    {
      icon: ShieldCheckIcon,
      title: "Secure by Default",
      desc: "Org-scoped access and audit logs"
    }
  ];

  return (
    <div className="py-16 bg-gray-50">
      <div className="max-w-6xl mx-auto px-6">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {features.map((feature, index) => (
            <div key={index} className="text-center">
              <feature.icon className="mx-auto h-12 w-12 text-blue-600 mb-4" />
              <h3 className="text-xl font-semibold text-gray-900 mb-2">
                {feature.title}
              </h3>
              <p className="text-gray-600">
                {feature.desc}
              </p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}

function FAQAccordion() {
  const [openItems, setOpenItems] = useState<Set<number>>(new Set());

  const faqs = [
    {
      q: "What files are supported?",
      a: "STEP, IGES, STL, SLDPRT, JT, 3MF, DXF and ZIP assemblies."
    },
    {
      q: "How is price calculated?",
      a: "Machine time, material, tooling, finish, inspection, and logistics."
    }
  ];

  const toggleItem = (index: number) => {
    const newOpenItems = new Set(openItems);
    if (newOpenItems.has(index)) {
      newOpenItems.delete(index);
    } else {
      newOpenItems.add(index);
    }
    setOpenItems(newOpenItems);
  };

  return (
    <div className="py-16 bg-white">
      <div className="max-w-2xl mx-auto px-6">
        <h2 className="text-3xl font-bold text-center text-gray-900 mb-12">
          Frequently Asked Questions
        </h2>
        <div className="space-y-4">
          {faqs.map((faq, index) => (
            <Card key={index} className="cursor-pointer" onClick={() => toggleItem(index)}>
              <CardContent className="p-6">
                <div className="flex items-center justify-between">
                  <h3 className="text-lg font-medium text-gray-900">
                    {faq.q}
                  </h3>
                  {openItems.has(index) ? (
                    <ChevronUpIcon className="h-5 w-5 text-gray-500" />
                  ) : (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500" />
                  )}
                </div>
                {openItems.has(index) && (
                  <p className="text-gray-600 mt-4">
                    {faq.a}
                  </p>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

export default function GetQuotePage() {
  return (
    <div className="min-h-screen">
      <HeroSection />
      <div className="relative">
        <InstantQuotePanel />
      </div>
      <EducationStrip />
      <FAQAccordion />
    </div>
  );
}
