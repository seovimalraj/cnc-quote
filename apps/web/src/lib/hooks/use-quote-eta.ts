import { formatDistanceToNow } from 'date-fns';

export function useQuoteEta(quote: any) {
  if (!quote || quote.status !== 'tbd_pending') return null;

  // Check if the quote has an active manual review task
  const hasManualReview = quote.manual_review_tasks?.some(
    (task: any) => task.status === 'pending'
  );

  if (hasManualReview) {
    const task = quote.manual_review_tasks.find(
      (t: any) => t.status === 'pending'
    );
    const dueDate = new Date(task.due_at);
    
    return {
      type: 'manual_review',
      dueIn: formatDistanceToNow(dueDate, { addSuffix: true }),
      dueDate,
      message: task.rule?.message || 'Manual review in progress',
    };
  }

  return null;
}
