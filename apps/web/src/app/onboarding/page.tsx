'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'
import { Progress } from '@/components/ui/progress'
import { CompanyInfoStep } from '@/components/onboarding/CompanyInfoStep'
import { AddressStep } from '@/components/onboarding/AddressStep'
import { TaxInfoStep } from '@/components/onboarding/TaxInfoStep'
import { ReviewStep } from '@/components/onboarding/ReviewStep'
import { posthog } from 'posthog-js'

const STEPS = [
  { id: 'company', title: 'Company Info', description: 'Basic company details' },
  { id: 'address', title: 'Address', description: 'Business address' },
  { id: 'tax', title: 'Tax Information', description: 'Tax details' },
  { id: 'review', title: 'Review', description: 'Confirm your information' },
]

export default function OnboardingPage() {
  const [currentStep, setCurrentStep] = useState(0)
  const [formData, setFormData] = useState({
    company: {
      name: '',
      industry: '',
      size: '',
      description: '',
    },
    address: {
      street: '',
      city: '',
      state: '',
      zipCode: '',
      country: 'US',
    },
    tax: {
      ein: '',
      taxId: '',
      taxClassification: '',
      stateTaxId: '',
    },
  })

  const router = useRouter()

  const updateFormData = (step: string, data: any) => {
    setFormData(prev => ({
      ...prev,
      [step]: { ...prev[step as keyof typeof prev], ...data }
    }))
  }

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1)
      posthog.capture('onboarding_step_completed', {
        step: STEPS[currentStep].id,
        step_number: currentStep + 1
      })
    }
  }

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleComplete = async () => {
    try {
      posthog.capture('onboarding_completed', {
        company_name: formData.company.name,
        industry: formData.company.industry,
        company_size: formData.company.size
      })

      // In a real implementation, you'd save this data to your database

      // Redirect to dashboard
      router.push('/dashboard')
    } catch (error) {
      console.error('Error completing onboarding:', error)
    }
  }

  const renderStep = () => {
    switch (currentStep) {
      case 0:
        return (
          <CompanyInfoStep
            data={formData.company}
            onChange={(data) => updateFormData('company', data)}
          />
        )
      case 1:
        return (
          <AddressStep
            data={formData.address}
            onChange={(data) => updateFormData('address', data)}
          />
        )
      case 2:
        return (
          <TaxInfoStep
            data={formData.tax}
            onChange={(data) => updateFormData('tax', data)}
          />
        )
      case 3:
        return (
          <ReviewStep
            data={formData}
          />
        )
      default:
        return null
    }
  }

  const progress = ((currentStep + 1) / STEPS.length) * 100

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
            {STEPS.map((step, index) => (
              <div
                key={step.id}
                className={`flex-1 text-center ${
                  index <= currentStep ? 'text-blue-600 font-medium' : ''
                }`}
              >
                {step.title}
              </div>
            ))}
          </div>
          <Progress value={progress} className="w-full" />
        </div>

        {/* Step Content */}
        <Card>
          <CardHeader>
            <CardTitle>{STEPS[currentStep].title}</CardTitle>
            <CardDescription>{STEPS[currentStep].description}</CardDescription>
          </CardHeader>
          <CardContent>
            {renderStep()}
          </CardContent>
        </Card>

        {/* Navigation */}
        <div className="mt-8 flex justify-between">
          <Button
            variant="outline"
            onClick={prevStep}
            disabled={currentStep === 0}
          >
            Previous
          </Button>

          {currentStep === STEPS.length - 1 ? (
            <Button onClick={handleComplete}>
              Complete Setup
            </Button>
          ) : (
            <Button onClick={nextStep}>
              Next
            </Button>
          )}
        </div>

        {/* Skip Option */}
        {currentStep < STEPS.length - 1 && (
          <div className="mt-4 text-center">
            <button
              onClick={() => router.push('/dashboard')}
              className="text-sm text-gray-500 hover:text-gray-700"
            >
              Skip for now
            </button>
          </div>
        )}
      </div>
    </div>
  )
}
