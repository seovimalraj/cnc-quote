import { FC } from 'react'
import { Card } from '@/components/ui/card'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { createClientComponentClient } from '@supabase/auth-helpers-nextjs'

export default function EmbedWidgetPage() {
  const supabase = createClientComponentClient()
  
  const generateEmbedCode = async (origin: string, themeColor: string) => {
    // Add origin to allowed list
    await supabase
      .from('widget_origins')
      .upsert({ 
        org_id: 'current_org_id', // TODO: Get from context
        origin,
        active: true
      })

    return `
<!-- CNC Quote Widget -->
<div id="cnc-quote-widget"></div>
<script>
(function() {
  // Create iframe
  var iframe = document.createElement('iframe');
  iframe.src = '${process.env.NEXT_PUBLIC_APP_URL}/widget/quote';
  iframe.style.width = '100%';
  iframe.style.height = '700px';
  iframe.style.border = 'none';
  
  // Add to container
  document.getElementById('cnc-quote-widget').appendChild(iframe);

  // Handle messages from widget
  window.addEventListener('message', function(event) {
    if (event.origin !== '${process.env.NEXT_PUBLIC_APP_URL}') return;
    
    switch(event.data.type) {
      case 'quote:created':
        // Emit custom event
        window.dispatchEvent(new CustomEvent('cncQuoteCreated', {
          detail: event.data
        }));
        break;
        
      case 'price:updated':
        window.dispatchEvent(new CustomEvent('cncPriceUpdated', {
          detail: event.data
        }));
        break;
        
      case 'checkout:started':
        window.dispatchEvent(new CustomEvent('cncCheckoutStarted', {
          detail: event.data
        }));
        break;
    }
  });
  
  // Set theme color
  var msg = {type: 'setTheme', color: '${themeColor}'};
  iframe.onload = function() {
    iframe.contentWindow.postMessage(msg, '${process.env.NEXT_PUBLIC_APP_URL}');
  };
})();
</script>
<link rel="stylesheet" href="${process.env.NEXT_PUBLIC_APP_URL}/widget.css">
`
  }

  return (
    <div className="container py-8">
      <h1 className="text-2xl font-bold mb-6">Widget Embed Code</h1>
      
      <Card className="p-6">
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="origin">Allowed Origin</Label>
            <Input 
              id="origin"
              placeholder="https://yourdomain.com"
            />
            <p className="text-sm text-gray-500">
              The domain where the widget will be embedded
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="theme">Theme Color</Label>
            <Input
              id="theme"
              type="color"
              defaultValue="#674299"
            />
          </div>

          <Button>Generate Embed Code</Button>

          <div className="space-y-2">
            <Label htmlFor="code">Embed Code</Label>
            <pre className="p-4 bg-gray-100 rounded-lg overflow-auto">
              <code id="code">
                {/* Generated code will go here */}
              </code>
            </pre>
          </div>
        </div>
      </Card>
    </div>
  )
}
