import { FC } from 'react';
import { QuoteEtaBadge } from '@/components/ui/quote-eta-badge';
import type { Quote } from '@/types/quote';

export const QuoteStatusDisplay: FC<{ quote: Quote }> = ({ quote }: { quote: Quote }) => {
  return (
    <div className="space-y-2">
      {quote.status === 'tbd_pending' && (
        <div className="mb-4">
          <QuoteEtaBadge quote={quote} />
        </div>
      )}
      {/* Show price/etc */}
      <div className="text-lg font-semibold">
        {quote.status === 'tbd_pending' ? (
          <div className="text-gray-600">
            Price pending manual review
          </div>
        ) : (
          <div>
            ${quote.price?.toFixed(2)} {quote.currency}
          </div>
        )}
      </div>
      {quote.status === 'tbd_pending' && (
        <p className="text-sm text-gray-500">
          Your quote requires manual review. We will email you when the review is complete.
        </p>
      )}
    </div>
  );
};
