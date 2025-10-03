/**
 * useRecommendation Hook (Step 10)
 * Fetches and caches process recommendations
 */

'use client';

import { useState, useEffect, useMemo } from 'react';
import { useSession } from 'next-auth/react';

export interface ProcessRecommendation {
  process: string;
  confidence: number;
  reasons: string[];
  decision_vector: {
    rules_fired: string[];
    scores: {
      geometry_fit: number;
      feature_match: number;
      constraint_penalty: number;
      user_intent_bonus: number;
    };
  };
  blocking_constraints: string[];
  metadata: Record<string, any>;
}

export interface ProcessRecommendationResponse {
  recommendations: ProcessRecommendation[];
  version: string;
  generated_at: string;
}

interface UseRecommendationOptions {
  quoteId: string;
  partId: string;
  enabled?: boolean;
}

interface UseRecommendationResult {
  data: ProcessRecommendationResponse | null;
  isLoading: boolean;
  error: Error | null;
  refetch: () => Promise<void>;
}

const API_BASE = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:3001';

export function useRecommendation(options: UseRecommendationOptions): UseRecommendationResult {
  const { data: session } = useSession();
  const [data, setData] = useState<ProcessRecommendationResponse | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<Error | null>(null);

  const cacheKey = useMemo(
    () => `recommendation:${options.quoteId}:${options.partId}`,
    [options.quoteId, options.partId]
  );

  const fetchRecommendation = async () => {
    if (!session?.accessToken) {
      setError(new Error('Not authenticated'));
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      // Check cache first
      const cached = sessionStorage.getItem(cacheKey);
      if (cached) {
        const parsed = JSON.parse(cached);
        const age = Date.now() - new Date(parsed.cached_at).getTime();
        if (age < 15 * 60 * 1000) {
          // 15 min cache
          setData(parsed.data);
          setIsLoading(false);
          return;
        }
      }

      const response = await fetch(`${API_BASE}/routing/recommend`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${session.accessToken}`,
        },
        body: JSON.stringify({
          quote_id: options.quoteId,
          part_id: options.partId,
        }),
      });

      if (!response.ok) {
        throw new Error(`Failed to fetch recommendations: ${response.statusText}`);
      }

      const result: ProcessRecommendationResponse = await response.json();
      setData(result);

      // Cache result
      sessionStorage.setItem(
        cacheKey,
        JSON.stringify({ data: result, cached_at: new Date().toISOString() })
      );
    } catch (err) {
      setError(err as Error);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    if (options.enabled !== false && options.quoteId && options.partId) {
      fetchRecommendation();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [options.quoteId, options.partId, options.enabled, session?.accessToken]);

  return {
    data,
    isLoading,
    error,
    refetch: fetchRecommendation,
  };
}
