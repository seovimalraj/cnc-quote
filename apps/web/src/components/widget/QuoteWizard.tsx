import { FC, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Card } from '@/components/ui/card'
import { Button } from '@/components/ui/button'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Dropzone } from '@/components/upload/Dropzone'
import { MaterialSelector } from '@/components/widget/MaterialSelector'
import { FinishSelector } from '@/components/widget/FinishSelector'
import { ToleranceSelector } from '@/components/widget/ToleranceSelector'
import { QuantitySelector } from '@/components/widget/QuantitySelector'
import { QuoteStatusDisplay } from '@/components/widget/QuoteStatusDisplay'
import { useQuote } from '@/lib/hooks/use-quote'

interface Props {
  clientOrigin: string
  theme: string
}

export const QuoteWizard: FC<Props> = ({ clientOrigin, theme }) => {
  const router = useRouter()
  const [step, setStep] = useState(0)
  const { quote, updateQuote, calculatePrice } = useQuote()
  
  // Post messages to parent window
  const postToParent = (type: string, data: any) => {
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
          onUploadComplete={(files) => {
            updateQuote({ files })
            postToParent('files:uploaded', { files })
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
            onChange={(material) => {
              updateQuote({ material })
              postToParent('material:selected', { material })
            }}
          />
          <FinishSelector
            onChange={(finish) => {
              updateQuote({ finish })
              postToParent('finish:selected', { finish })
            }}
          />
          <ToleranceSelector
            onChange={(tolerance) => {
              updateQuote({ tolerance })
              postToParent('tolerance:selected', { tolerance })
            }}
          />
          <QuantitySelector
            onChange={(quantity) => {
              updateQuote({ quantity })
              calculatePrice().then(price => {
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
          <QuoteStatusDisplay quote={quote} />
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
