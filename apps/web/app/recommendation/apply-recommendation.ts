/**
 * Apply Recommendation Logic (Step 10)
 * Optimistically applies process recommendation and reprices
 */

'use client';

import { useSession } from 'next-auth/react';

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export interface ApplyRecommendationOptions {
  quoteId: string;
  partId: string;
  process: string;
  confidence: number;
  onSuccess?: () => void;
  onError?: (error: Error) => void;
}

export async function applyRecommendation(
  options: ApplyRecommendationOptions,
  accessToken: string
): Promise<void> {
  try {
    // Update quote config with recommended process
    const response = await fetch(`${API_BASE}/quotes/${options.quoteId}/parts/${options.partId}`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        process_type: options.process,
        _recommendation_applied: {
          process: options.process,
          confidence: options.confidence,
          applied_at: new Date().toISOString(),
        },
      }),
    });

    if (!response.ok) {
      throw new Error(`Failed to apply recommendation: ${response.statusText}`);
    }

    // Trigger reprice
    await fetch(`${API_BASE}/price/v2/calculate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${accessToken}`,
      },
      body: JSON.stringify({
        part_config: {
          id: options.partId,
          quote_id: options.quoteId,
          process_type: options.process,
        },
      }),
    });

    if (options.onSuccess) {
      options.onSuccess();
    }
  } catch (error) {
    if (options.onError) {
      options.onError(error as Error);
    } else {
      throw error;
    }
  }
}

export function useApplyRecommendation() {
  const { data: session } = useSession();

  const apply = async (options: ApplyRecommendationOptions) => {
    if (!session?.accessToken) {
      throw new Error('Not authenticated');
    }
    return applyRecommendation(options, session.accessToken as string);
  };

  return { apply };
}
