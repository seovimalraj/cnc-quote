import { formatDistanceToNow } from 'date-fns';
import type { Quote, QuoteEta } from '@/types/quote';

export function useQuoteEta(quote: Quote | null): QuoteEta | null {
  if (!quote || quote.status !== 'tbd_pending') return null;

  // Check if the quote has an active manual review task
  if (!quote.manual_review_tasks) return null;
  
  const task = quote.manual_review_tasks.find(
    (t) => t.status === 'pending'
  );
  
  if (!task) return null;

  const dueDate = new Date(task.due_at);
    
  return {
    type: 'manual_review',
    dueIn: formatDistanceToNow(dueDate, { addSuffix: true }),
    dueDate,
    message: task.rule?.message || 'Manual review in progress',
  };
}
