import { useQuoteEta } from '@/lib/hooks/use-quote-eta';

import type { Quote } from '@/types/quote';

export function QuoteEtaBadge({ quote }: { quote: Quote }) {
  const eta = useQuoteEta(quote);
  
  if (!eta) return null;

  return (
    <div className="inline-flex items-center gap-2 px-2 py-1 text-sm font-medium rounded bg-yellow-100 text-yellow-800">
      <svg 
        xmlns="http://www.w3.org/2000/svg" 
        viewBox="0 0 24 24" 
        fill="currentColor" 
        className="w-4 h-4"
      >
        <path 
          fillRule="evenodd" 
          d="M12 2.25c-5.385 0-9.75 4.365-9.75 9.75s4.365 9.75 9.75 9.75 9.75-4.365 9.75-9.75S17.385 2.25 12 2.25zM12.75 6a.75.75 0 00-1.5 0v6c0 .414.336.75.75.75h4.5a.75.75 0 000-1.5h-3.75V6z" 
          clipRule="evenodd" 
        />
      </svg>
      <span>{eta.message}</span>
      <span>•</span>
      <span>Due {eta.dueIn}</span>
    </div>
  );
}
