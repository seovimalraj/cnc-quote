import './globals.css';
import { PayPalProvider } from '@/components/providers/PayPalProvider';
import { Toaster } from 'react-hot-toast';

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="en">
      <body>
        <PayPalProvider>
          <div className="min-h-screen bg-gray-50">
            {children}
          </div>
          <Toaster />
        </PayPalProvider>
      </body>
    </html>
  )
}
