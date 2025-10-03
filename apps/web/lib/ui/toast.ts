/**
 * Step 13: Toast Notifications
 * User feedback for pricing events and errors
 */

export type ToastType = 'info' | 'success' | 'warning' | 'error';

export interface ToastOptions {
  duration?: number; // Auto-dismiss after ms (0 = no auto-dismiss)
  action?: {
    label: string;
    onClick: () => void;
  };
}

/**
 * Simple toast queue manager
 * TODO: Integrate with your UI library (e.g., Radix UI, Sonner, React Hot Toast)
 */
class ToastManager {
  private toasts: Array<{
    id: string;
    message: string;
    type: ToastType;
    timestamp: number;
  }> = [];

  /**
   * Show a toast notification
   */
  show(message: string, type: ToastType = 'info', options?: ToastOptions): string {
    const id = `toast-${Date.now()}-${Math.random()}`;
    
    this.toasts.push({
      id,
      message,
      type,
      timestamp: Date.now(),
    });

    // Log to console for now
    const emoji = {
      info: 'ℹ️',
      success: '✅',
      warning: '⚠️',
      error: '❌',
    }[type];

    console.log(`${emoji} [${type.toUpperCase()}] ${message}`);

    // Auto-dismiss
    if (options?.duration && options.duration > 0) {
      setTimeout(() => this.dismiss(id), options.duration);
    }

    return id;
  }

  /**
   * Dismiss a toast
   */
  dismiss(id: string): void {
    this.toasts = this.toasts.filter((t) => t.id !== id);
  }

  /**
   * Dismiss all toasts
   */
  dismissAll(): void {
    this.toasts = [];
  }

  /**
   * Get active toasts
   */
  getActive(): typeof this.toasts {
    return [...this.toasts];
  }
}

// Singleton instance
const toastManager = new ToastManager();

/**
 * Show toast notification
 */
export function toast(
  message: string,
  type: ToastType = 'info',
  options?: ToastOptions
): string {
  return toastManager.show(message, type, options);
}

/**
 * Convenience methods
 */
export const toastInfo = (msg: string, opts?: ToastOptions) => toast(msg, 'info', opts);
export const toastSuccess = (msg: string, opts?: ToastOptions) => toast(msg, 'success', opts);
export const toastWarning = (msg: string, opts?: ToastOptions) => toast(msg, 'warning', opts);
export const toastError = (msg: string, opts?: ToastOptions) => toast(msg, 'error', opts);

/**
 * Pricing-specific toasts
 */
export const pricingToasts = {
  /**
   * Show error when pricing fails
   */
  pricingFailed: (error?: string) => {
    toast(
      error || 'Could not calculate price. Please try again.',
      'error',
      { duration: 5000 }
    );
  },

  /**
   * Show warning when optimistic price rolled back
   */
  pricingRollback: () => {
    toast(
      'Price estimate updated with actual calculation',
      'info',
      { duration: 3000 }
    );
  },

  /**
   * Show info when using cached price
   */
  pricingCached: () => {
    // Don't show this to users - it's just for debugging
    if (process.env.NODE_ENV === 'development') {
      toast('Using cached price', 'info', { duration: 2000 });
    }
  },

  /**
   * Show error when network is slow
   */
  pricingSlow: () => {
    toast(
      'Pricing is taking longer than usual...',
      'warning',
      { duration: 4000 }
    );
  },
};

export default toast;
export { toastManager };
