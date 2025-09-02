import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Dropzone } from '@/components/upload/Dropzone'
import { MaterialSelector } from '@/components/widget/MaterialSelector'
import { FinishSelector } from '@/components/widget/FinishSelector'
import { ToleranceSelector } from '@/components/widget/ToleranceSelector'
import { QuantitySelector } from '@/components/widget/QuantitySelector'
import { useQuote } from '@/lib/hooks/use-quote'

interface Props {
  clientOrigin: string
  theme?: string
}

export const QuoteWizard = ({ clientOrigin, theme: _theme }: Props) => {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const { quote, updateQuote, calculatePrice } = useQuote()
  
  // Post messages to parent window
  const postToParent = (type: string, data: unknown) => {
    if (window.parent !== window) {
      window.parent.postMessage({
        type,
        data
      }, clientOrigin)
    }
  }

  useEffect(() => {
    // Listen for messages from parent
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== clientOrigin) return
      
      // Handle any parent window commands
      switch (event.data.type) {
        case 'setTheme':
          // Update theme color
          document.documentElement.style.setProperty('--primary', event.data.color)
          break
      }
    }

    window.addEventListener('message', handleMessage)
    return () => window.removeEventListener('message', handleMessage)
  }, [clientOrigin])

  const steps = [
    {
      title: 'Upload Files',
      component: (
        <Dropzone
          organizationId="default-org" // TODO: Get from context
          onUploadComplete={(files) => {
            // Convert file string to QuoteFile array
            const fileArray = files.split(',').map((filename, index) => ({
              id: `file-${index}`,
              name: filename,
              type: 'application/octet-stream',
              size: 0
            }));
            updateQuote({ files: fileArray })
            postToParent('files:uploaded', { files: fileArray })
            setStep(1)
          }}
        />
      )
    },
    {
      title: 'Specifications',
      component: (
        <div className="space-y-6">
          <MaterialSelector
            onChange={(material: { id?: string } | string) => {
              updateQuote({ material: typeof material === 'object' ? material.id : material })
              postToParent('material:selected', { material })
            }}
          />
          <FinishSelector
            onChange={(finish: { id?: string } | string) => {
              updateQuote({ finish: typeof finish === 'object' ? finish.id : finish })
              postToParent('finish:selected', { finish })
            }}
          />
          <ToleranceSelector
            onChange={(tolerance: { id?: string } | string) => {
              updateQuote({ tolerance: typeof tolerance === 'object' ? tolerance.id : tolerance })
              postToParent('tolerance:selected', { tolerance })
            }}
          />
          <QuantitySelector
            onChange={(quantity: number) => {
              updateQuote({ quantity })
              calculatePrice().then((price: unknown) => {
                postToParent('price:updated', { price })
              })
            }}
          />
          <Button 
            onClick={() => setStep(2)}
            disabled={!quote.isValid}
          >
            Continue
          </Button>
        </div>
      )
    },
    {
      title: 'Review & Checkout',
      component: (
        <div className="space-y-6">
          <div className="text-lg font-semibold">
            {quote.price ? (
              <div>
                ${quote.price.total_price.toFixed(2)}
              </div>
            ) : (
              <div className="text-gray-600">
                Price calculation in progress...
              </div>
            )}
          </div>
          <Button
            onClick={() => {
              postToParent('checkout:started', { quote })
              router.push('/checkout')
            }}
          >
            Proceed to Checkout
          </Button>
        </div>
      )
    }
  ]

  return (
    <Card className="p-6 shadow-lg">
      <Tabs value={step.toString()} className="w-full">
        <TabsList className="w-full">
          {steps.map((s, i) => (
            <TabsTrigger
              key={i}
              value={i.toString()}
              disabled={i > step}
              onClick={() => setStep(i)}
            >
              {s.title}
            </TabsTrigger>
          ))}
        </TabsList>
        {steps.map((s, i) => (
          <TabsContent key={i} value={i.toString()}>
            {s.component}
          </TabsContent>
        ))}
      </Tabs>
    </Card>
  )
}
