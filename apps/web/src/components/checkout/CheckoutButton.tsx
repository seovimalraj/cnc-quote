'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent } from '@/components/ui/dialog';
import { CheckoutOptions } from '@/components/checkout/CheckoutOptions';

interface CheckoutButtonProps {
  quoteId: string;
  amount: number;
  currency: string;
  disabled?: boolean;
}

export function CheckoutButton({
  quoteId,
  amount,
  currency,
  disabled,
}: CheckoutButtonProps) {
  const [isOpen, setIsOpen] = useState(false);

  return (
    <>
      <Button
        onClick={() => setIsOpen(true)}
        disabled={disabled}
        variant="default"
        className="bg-green-600 hover:bg-green-700 text-white"
      >
        Proceed to Checkout
      </Button>

      <Dialog open={isOpen} onOpenChange={setIsOpen}>
        <DialogContent className="sm:max-w-md">
          <div className="py-4">
            <CheckoutOptions
              quoteId={quoteId}
              amount={amount}
              currency={currency}
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
