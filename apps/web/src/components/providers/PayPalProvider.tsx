'use client';

// Temporary mock PayPal provider while we resolve server-side context issues
interface PayPalProviderProps {
  children: React.ReactNode;
}

export function PayPalProvider({ children }: PayPalProviderProps) {
  // For now, just return children without PayPal context
  // TODO: Re-implement with proper client-side only loading
  return <>{children}</>;
}
