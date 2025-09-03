'use client';

import DefaultLayout from '@/components/Layouts/DefaultLayout';
import { useState } from 'react';
import { 
  CloudArrowUpIcon,
  CubeIcon,
  ClockIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XMarkIcon,
  DocumentIcon,
} from '@heroicons/react/24/outline';

const QuoteWizardPage = () => {
  const [step, setStep] = useState(1);
  const [files, setFiles] = useState<File[]>([]);
  const [quoteData, setQuoteData] = useState({
    material: '',
    quantity: 1,
    surface: '',
    tolerance: '',
    leadTime: '',
    notes: '',
  });

  const materials = [
    { id: 'aluminum', name: 'Aluminum 6061-T6', price: '$12.50/lb' },
    { id: 'steel', name: 'Mild Steel', price: '$8.20/lb' },
    { id: 'stainless', name: 'Stainless Steel 316', price: '$18.90/lb' },
    { id: 'titanium', name: 'Titanium Grade 2', price: '$45.00/lb' },
  ];

  const surfaceFinishes = [
    { id: 'as-machined', name: 'As Machined', extra: '$0' },
    { id: 'anodized', name: 'Anodized', extra: '+$15' },
    { id: 'powder-coat', name: 'Powder Coating', extra: '+$25' },
    { id: 'plating', name: 'Chrome Plating', extra: '+$35' },
  ];

  const tolerances = [
    { id: 'standard', name: 'Standard (±0.005")', extra: '$0' },
    { id: 'tight', name: 'Tight (±0.002")', extra: '+$50' },
    { id: 'precision', name: 'Precision (±0.001")', extra: '+$100' },
  ];

  const leadTimes = [
    { id: 'standard', name: '5-7 Business Days', extra: '$0' },
    { id: 'expedited', name: '2-3 Business Days', extra: '+$100' },
    { id: 'rush', name: '24-48 Hours', extra: '+$250' },
  ];

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const uploadedFiles = Array.from(event.target.files || []);
    setFiles([...files, ...uploadedFiles]);
  };

  const removeFile = (index: number) => {
    setFiles(files.filter((_, i) => i !== index));
  };

  const calculateQuote = () => {
    // Mock calculation
    const basePrice = 245;
    const materialMultiplier = quoteData.material === 'titanium' ? 3.5 : 
                              quoteData.material === 'stainless' ? 1.8 : 1.2;
    const quantityDiscount = quoteData.quantity > 100 ? 0.85 : 
                            quoteData.quantity > 50 ? 0.9 : 1;
    
    return Math.round(basePrice * materialMultiplier * quantityDiscount * quoteData.quantity);
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
    }).format(amount);
  };

  return (
    <DefaultLayout>
      <div className="grid grid-cols-1 gap-9 sm:grid-cols-1">
        <div className="flex flex-col gap-9">
          {/* Quote Wizard Header */}
          <div className="rounded-sm border border-stroke bg-white shadow-default dark:border-strokedark dark:bg-boxdark">
            <div className="border-b border-stroke py-4 px-7 dark:border-strokedark">
              <h3 className="font-medium text-black dark:text-white">
                CNC Quote Wizard
              </h3>
            </div>
            <div className="p-7">
              {/* Progress Steps */}
              <div className="mb-8">
                <div className="flex items-center justify-between">
                  {[1, 2, 3, 4].map((stepNumber) => (
                    <div key={stepNumber} className="flex items-center">
                      <div
                        className={`flex h-10 w-10 items-center justify-center rounded-full ${
                          step >= stepNumber
                            ? 'bg-primary text-white'
                            : 'bg-gray-200 text-gray-500'
                        }`}
                      >
                        {step > stepNumber ? (
                          <CheckCircleIcon className="h-6 w-6" />
                        ) : (
                          stepNumber
                        )}
                      </div>
                      {stepNumber < 4 && (
                        <div
                          className={`h-1 w-16 lg:w-32 ${
                            step > stepNumber ? 'bg-primary' : 'bg-gray-200'
                          }`}
                        />
                      )}
                    </div>
                  ))}
                </div>
                <div className="mt-2 flex justify-between text-sm">
                  <span className={step >= 1 ? 'text-primary' : 'text-gray-500'}>
                    Upload Files
                  </span>
                  <span className={step >= 2 ? 'text-primary' : 'text-gray-500'}>
                    Materials
                  </span>
                  <span className={step >= 3 ? 'text-primary' : 'text-gray-500'}>
                    Options
                  </span>
                  <span className={step >= 4 ? 'text-primary' : 'text-gray-500'}>
                    Quote
                  </span>
                </div>
              </div>

              {/* Step Content */}
              {step === 1 && (
                <div>
                  <h4 className="mb-4 text-xl font-semibold text-black dark:text-white">
                    Upload Your CAD Files
                  </h4>
                  
                  {/* File Upload Area */}
                  <div className="mb-6">
                    <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                      Supported formats: .step, .stp, .iges, .igs, .stl, .dwg, .dxf
                    </label>
                    <div className="relative">
                      <input
                        type="file"
                        multiple
                        accept=".step,.stp,.iges,.igs,.stl,.dwg,.dxf"
                        onChange={handleFileUpload}
                        className="absolute inset-0 z-50 m-0 h-full w-full cursor-pointer p-0 opacity-0 outline-none"
                      />
                      <div className="flex h-40 w-full cursor-pointer items-center justify-center rounded-md border-2 border-dashed border-primary bg-gray p-3">
                        <div className="text-center">
                          <CloudArrowUpIcon className="mx-auto h-12 w-12 text-primary" />
                          <p className="mt-2 text-sm text-gray-600">
                            <span className="font-medium text-primary">Click to upload</span> or
                            drag and drop
                          </p>
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Uploaded Files */}
                  {files.length > 0 && (
                    <div className="mb-6">
                      <h5 className="mb-3 text-lg font-medium text-black dark:text-white">
                        Uploaded Files ({files.length})
                      </h5>
                      <div className="space-y-2">
                        {files.map((file, index) => (
                          <div
                            key={index}
                            className="flex items-center justify-between rounded border border-stroke p-3 dark:border-strokedark"
                          >
                            <div className="flex items-center gap-3">
                              <DocumentIcon className="h-6 w-6 text-primary" />
                              <div>
                                <p className="text-sm font-medium text-black dark:text-white">
                                  {file.name}
                                </p>
                                <p className="text-xs text-gray-500">
                                  {(file.size / 1024 / 1024).toFixed(2)} MB
                                </p>
                              </div>
                            </div>
                            <button
                              onClick={() => removeFile(index)}
                              className="text-red-500 hover:text-red-700"
                            >
                              <XMarkIcon className="h-5 w-5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}

                  <div className="flex justify-end">
                    <button
                      onClick={() => setStep(2)}
                      disabled={files.length === 0}
                      className="inline-flex items-center justify-center rounded-md bg-primary py-4 px-10 text-center font-medium text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {step === 2 && (
                <div>
                  <h4 className="mb-4 text-xl font-semibold text-black dark:text-white">
                    Select Material & Quantity
                  </h4>
                  
                  {/* Material Selection */}
                  <div className="mb-6">
                    <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                      Material
                    </label>
                    <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                      {materials.map((material) => (
                        <div
                          key={material.id}
                          className={`cursor-pointer rounded-md border-2 p-4 ${
                            quoteData.material === material.id
                              ? 'border-primary bg-primary bg-opacity-10'
                              : 'border-stroke dark:border-strokedark'
                          }`}
                          onClick={() => setQuoteData({ ...quoteData, material: material.id })}
                        >
                          <h5 className="font-medium text-black dark:text-white">
                            {material.name}
                          </h5>
                          <p className="text-sm text-meta-5">{material.price}</p>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Quantity */}
                  <div className="mb-6">
                    <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                      Quantity
                    </label>
                    <input
                      type="number"
                      min="1"
                      value={quoteData.quantity}
                      onChange={(e) => setQuoteData({ ...quoteData, quantity: parseInt(e.target.value) || 1 })}
                      className="w-full rounded-lg border-[1.5px] border-stroke bg-transparent py-3 px-5 text-black outline-none transition focus:border-primary active:border-primary disabled:cursor-default disabled:bg-whiter dark:border-form-strokedark dark:bg-form-input dark:text-white dark:focus:border-primary"
                    />
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setStep(1)}
                      className="inline-flex items-center justify-center rounded-md border border-primary py-4 px-10 text-center font-medium text-primary hover:bg-opacity-90"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setStep(3)}
                      disabled={!quoteData.material}
                      className="inline-flex items-center justify-center rounded-md bg-primary py-4 px-10 text-center font-medium text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Continue
                    </button>
                  </div>
                </div>
              )}

              {step === 3 && (
                <div>
                  <h4 className="mb-4 text-xl font-semibold text-black dark:text-white">
                    Manufacturing Options
                  </h4>
                  
                  {/* Surface Finish */}
                  <div className="mb-6">
                    <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                      Surface Finish
                    </label>
                    <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                      {surfaceFinishes.map((finish) => (
                        <div
                          key={finish.id}
                          className={`cursor-pointer rounded border p-3 ${
                            quoteData.surface === finish.id
                              ? 'border-primary bg-primary bg-opacity-10'
                              : 'border-stroke dark:border-strokedark'
                          }`}
                          onClick={() => setQuoteData({ ...quoteData, surface: finish.id })}
                        >
                          <div className="flex justify-between">
                            <span className="text-black dark:text-white">{finish.name}</span>
                            <span className="text-meta-5">{finish.extra}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Tolerance */}
                  <div className="mb-6">
                    <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                      Tolerance
                    </label>
                    <div className="space-y-3">
                      {tolerances.map((tolerance) => (
                        <div
                          key={tolerance.id}
                          className={`cursor-pointer rounded border p-3 ${
                            quoteData.tolerance === tolerance.id
                              ? 'border-primary bg-primary bg-opacity-10'
                              : 'border-stroke dark:border-strokedark'
                          }`}
                          onClick={() => setQuoteData({ ...quoteData, tolerance: tolerance.id })}
                        >
                          <div className="flex justify-between">
                            <span className="text-black dark:text-white">{tolerance.name}</span>
                            <span className="text-meta-5">{tolerance.extra}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Lead Time */}
                  <div className="mb-6">
                    <label className="mb-3 block text-sm font-medium text-black dark:text-white">
                      Lead Time
                    </label>
                    <div className="space-y-3">
                      {leadTimes.map((leadTime) => (
                        <div
                          key={leadTime.id}
                          className={`cursor-pointer rounded border p-3 ${
                            quoteData.leadTime === leadTime.id
                              ? 'border-primary bg-primary bg-opacity-10'
                              : 'border-stroke dark:border-strokedark'
                          }`}
                          onClick={() => setQuoteData({ ...quoteData, leadTime: leadTime.id })}
                        >
                          <div className="flex justify-between">
                            <span className="text-black dark:text-white">{leadTime.name}</span>
                            <span className="text-meta-5">{leadTime.extra}</span>
                          </div>
                        </div>
                      ))}
                    </div>
                  </div>

                  <div className="flex justify-between">
                    <button
                      onClick={() => setStep(2)}
                      className="inline-flex items-center justify-center rounded-md border border-primary py-4 px-10 text-center font-medium text-primary hover:bg-opacity-90"
                    >
                      Back
                    </button>
                    <button
                      onClick={() => setStep(4)}
                      disabled={!quoteData.surface || !quoteData.tolerance || !quoteData.leadTime}
                      className="inline-flex items-center justify-center rounded-md bg-primary py-4 px-10 text-center font-medium text-white hover:bg-opacity-90 disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      Get Quote
                    </button>
                  </div>
                </div>
              )}

              {step === 4 && (
                <div>
                  <h4 className="mb-6 text-xl font-semibold text-black dark:text-white">
                    Your Quote is Ready!
                  </h4>
                  
                  {/* Quote Summary */}
                  <div className="mb-6 rounded-sm border border-stroke bg-gray p-6 dark:border-strokedark dark:bg-meta-4">
                    <div className="mb-4 flex items-center justify-between">
                      <h5 className="text-lg font-medium text-black dark:text-white">
                        Quote Summary
                      </h5>
                      <div className="text-right">
                        <p className="text-2xl font-bold text-primary">
                          {formatCurrency(calculateQuote())}
                        </p>
                        <p className="text-sm text-body">
                          {formatCurrency(calculateQuote() / quoteData.quantity)} per part
                        </p>
                      </div>
                    </div>
                    
                    <div className="space-y-3">
                      <div className="flex justify-between">
                        <span>Material:</span>
                        <span className="font-medium">
                          {materials.find(m => m.id === quoteData.material)?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Quantity:</span>
                        <span className="font-medium">{quoteData.quantity} pieces</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Surface Finish:</span>
                        <span className="font-medium">
                          {surfaceFinishes.find(s => s.id === quoteData.surface)?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Tolerance:</span>
                        <span className="font-medium">
                          {tolerances.find(t => t.id === quoteData.tolerance)?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Lead Time:</span>
                        <span className="font-medium">
                          {leadTimes.find(l => l.id === quoteData.leadTime)?.name}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Files:</span>
                        <span className="font-medium">{files.length} uploaded</span>
                      </div>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                    <button
                      onClick={() => setStep(3)}
                      className="inline-flex items-center justify-center rounded-md border border-primary py-4 px-6 text-center font-medium text-primary hover:bg-opacity-90"
                    >
                      Modify Quote
                    </button>
                    <button className="inline-flex items-center justify-center rounded-md bg-meta-3 py-4 px-6 text-center font-medium text-white hover:bg-opacity-90">
                      Save Quote
                    </button>
                    <button className="inline-flex items-center justify-center rounded-md bg-primary py-4 px-6 text-center font-medium text-white hover:bg-opacity-90">
                      Place Order
                    </button>
                  </div>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </DefaultLayout>
  );
};

export default QuoteWizardPage;
