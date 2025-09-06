'use client'

import React, { useState, useEffect } from 'react'
import { useAuth } from '@/contexts/AuthContext'
import { QuoteHeader } from './QuoteHeader'
import { PartsPanel } from './PartsPanel'
import { ViewerPanel } from './ViewerPanel'
import { ConfiguratorPanel } from './ConfiguratorPanel'
import { PricingSummary } from './PricingSummary'
import { DFMPanel } from './DFMPanel'
import { useQuoteStore } from '@/lib/hooks/use-quote-store'

interface Props {
  clientOrigin: string
  theme?: string
}

export const AdvancedQuotePage = ({ clientOrigin, theme }: Props) => {
  const { user } = useAuth()
  const [isMobile, setIsMobile] = useState(false)
  const [showPricingSummary, setShowPricingSummary] = useState(false)

  // Initialize quote store
  const {
    quote,
    parts,
    selectedPart,
    isLoading,
    error,
    addPart,
    updatePart,
    removePart,
    selectPart,
    updateQuote,
    calculatePrice,
    validateDFM
  } = useQuoteStore()

  // Handle responsive layout
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 1280)
    }

    checkMobile()
    window.addEventListener('resize', checkMobile)
    return () => window.removeEventListener('resize', checkMobile)
  }, [])

  // Post messages to parent window (for widget embedding)
  const postToParent = (type: string, data: unknown) => {
    if (window.parent !== window) {
      window.parent.postMessage({
        type,
        data
      }, clientOrigin)
    }
  }

  // Handle file uploads
  const handleFileUpload = async (files: File[]) => {
    for (const file of files) {
      const partId = await addPart(file)
      postToParent('part:uploaded', { partId, fileName: file.name })
    }
  }

  // Handle configuration changes
  const handleConfigChange = async (config: any) => {
    await updateQuote(config)
    await calculatePrice()
    await validateDFM()
    postToParent('quote:updated', { config })
  }

  // Handle price calculation
  const handlePriceCalculation = async () => {
    const price = await calculatePrice()
    postToParent('price:updated', { price })
  }

  // Handle DFM validation
  const handleDFMValidation = async () => {
    const dfmResults = await validateDFM()
    postToParent('dfm:validated', { results: dfmResults })
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <QuoteHeader
        user={user}
        onShowPricing={() => setShowPricingSummary(!showPricingSummary)}
        isMobile={isMobile}
      />

      {/* Main Content */}
      <div className="flex h-[calc(100vh-64px)]">
        {/* Left Panel - Parts List */}
        <div className={`${isMobile ? 'w-full' : 'w-80'} bg-white border-r border-gray-200 flex flex-col`}>
          <PartsPanel
            parts={parts}
            selectedPart={selectedPart}
            onSelectPart={selectPart}
            onAddPart={handleFileUpload}
            onRemovePart={removePart}
            onDuplicatePart={(partId) => {
              // TODO: Implement duplicate functionality
              console.log('Duplicate part:', partId)
            }}
            onGroupAsAssembly={(partIds) => {
              // TODO: Implement assembly grouping
              console.log('Group as assembly:', partIds)
            }}
          />
        </div>

        {/* Center Panel - Viewer & Configurator */}
        {!isMobile && (
          <div className="flex-1 flex flex-col">
            {/* 3D Viewer */}
            <div className="flex-1 bg-gray-900 relative">
              <ViewerPanel
                selectedPart={selectedPart}
                onPartSelect={selectPart}
                onMeasurement={(measurement) => {
                  postToParent('viewer:measurement', { measurement })
                }}
              />

              {/* DFM Panel Overlay */}
              <DFMPanel
                part={selectedPart}
                dfmResults={quote.dfmResults}
                onFixIssue={(issueId, fix) => {
                  // TODO: Implement DFM fix application
                  console.log('Fix DFM issue:', issueId, fix)
                }}
              />
            </div>

            {/* Configurator Tabs */}
            <div className="h-96 bg-white border-t border-gray-200">
              <ConfiguratorPanel
                quote={quote}
                selectedPart={selectedPart}
                onConfigChange={handleConfigChange}
                onPriceCalculation={handlePriceCalculation}
                onDFMValidation={handleDFMValidation}
              />
            </div>
          </div>
        )}

        {/* Right Panel - Pricing Summary (Desktop) */}
        {!isMobile && (
          <div className="w-96 bg-white border-l border-gray-200">
            <PricingSummary
              quote={quote}
              parts={parts}
              isLoading={isLoading}
              error={error}
              onCheckout={() => {
                // TODO: Implement checkout flow
                console.log('Proceed to checkout')
              }}
              onSaveQuote={() => {
                // TODO: Implement save quote
                console.log('Save quote')
              }}
              onSendForApproval={() => {
                // TODO: Implement send for approval
                console.log('Send for approval')
              }}
            />
          </div>
        )}
      </div>

      {/* Mobile Pricing Summary Overlay */}
      {isMobile && showPricingSummary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 z-50 flex items-end">
          <div className="w-full bg-white rounded-t-lg max-h-[80vh] overflow-y-auto">
            <PricingSummary
              quote={quote}
              parts={parts}
              isLoading={isLoading}
              error={error}
              onCheckout={() => {
                setShowPricingSummary(false)
                // TODO: Implement checkout flow
              }}
              onSaveQuote={() => {
                setShowPricingSummary(false)
                // TODO: Implement save quote
              }}
              onSendForApproval={() => {
                setShowPricingSummary(false)
                // TODO: Implement send for approval
              }}
            />
          </div>
        </div>
      )}

      {/* Mobile Viewer & Configurator */}
      {isMobile && !showPricingSummary && (
        <div className="fixed inset-0 bg-white z-40 flex flex-col">
          {/* Mobile Header */}
          <div className="flex items-center justify-between p-4 border-b">
            <button
              onClick={() => setShowPricingSummary(true)}
              className="px-4 py-2 bg-blue-600 text-white rounded-lg"
            >
              View Price
            </button>
            <button
              onClick={() => {/* TODO: Close mobile view */}}
              className="p-2"
            >
              ✕
            </button>
          </div>

          {/* Mobile Viewer */}
          <div className="flex-1 bg-gray-900">
            <ViewerPanel
              selectedPart={selectedPart}
              onPartSelect={selectPart}
              onMeasurement={(measurement) => {
                postToParent('viewer:measurement', { measurement })
              }}
            />
          </div>

          {/* Mobile Configurator */}
          <div className="h-80 bg-white border-t">
            <ConfiguratorPanel
              quote={quote}
              selectedPart={selectedPart}
              onConfigChange={handleConfigChange}
              onPriceCalculation={handlePriceCalculation}
              onDFMValidation={handleDFMValidation}
            />
          </div>
        </div>
      )}
    </div>
  )
}
