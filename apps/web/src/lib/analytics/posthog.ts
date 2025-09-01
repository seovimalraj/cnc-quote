import posthog from 'posthog-js';
import type { AnalyticsProperties } from '@/types/analytics';

export function initAnalytics() {
  // Only initialize in production
  if (process.env.NEXT_PUBLIC_POSTHOG_KEY) {
    posthog.init(process.env.NEXT_PUBLIC_POSTHOG_KEY, {
      api_host: process.env.NEXT_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com',
      persistence: 'localStorage',
      autocapture: true,
      capture_pageview: true,
      capture_pageleave: false,
      disable_session_recording: false,
    });
  }
}

export function trackEvent(event: string, properties?: AnalyticsProperties) {
  if (process.env.NODE_ENV === 'production') {
    posthog.capture(event, properties);
  }
}

export function setUserProperties(properties: AnalyticsProperties) {
  if (process.env.NODE_ENV === 'production') {
    posthog.people.set(properties);
  }
}

export function identifyUser(userId: string, properties?: AnalyticsProperties) {
  if (process.env.NODE_ENV === 'production') {
    posthog.identify(userId, properties);
  }
}

export function startQuoteSession() {
  if (process.env.NODE_ENV === 'production') {
    const sessionId = Math.random().toString(36).substring(2);
    posthog.group('session_id', sessionId);
    return sessionId;
  }
  return '';
}

export function trackStep(step: string, properties?: AnalyticsProperties) {
  trackEvent('quote_step', {
    step,
    ...properties,
  });
}

// Product events
export const QuoteEvents = {
  STARTED: 'quote_started',
  FILE_UPLOADED: 'file_uploaded',
  PROCESS_SELECTED: 'process_selected',
  MATERIAL_SELECTED: 'material_selected',
  FEATURES_UPDATED: 'features_updated',
  QUANTITY_UPDATED: 'quantity_updated', 
  PRICE_GENERATED: 'price_generated',
  QUOTE_CREATED: 'quote_created',
  QUOTE_ACCEPTED: 'quote_accepted',
  PAYMENT_STARTED: 'payment_started',
  PAYMENT_COMPLETED: 'payment_completed',
  ORDER_CREATED: 'order_created',
} as const;
