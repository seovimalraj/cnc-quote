export const ACTIVE_PRICING_CONFIG_CACHE_KEY = 'pricing:config:active';
export const PREVIEW_PRICING_CONFIG_CACHE_KEY = 'pricing:config:preview';

export const ACTIVE_PRICING_CONFIG_TTL_SECONDS = 5 * 60; // 5 minutes to refresh frequently while still caching.
export const PREVIEW_PRICING_CONFIG_TTL_SECONDS = 60; // Preview cache is short to reflect operator edits rapidly.
