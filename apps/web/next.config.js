const { withSentryConfig } = require("@sentry/nextjs");

const nextConfig = {
  reactStrictMode: true,
  experimental: {
    serverActions: {
      allowedOrigins: ['localhost:3000', 'quote.frigate.ai']
    },
    forceSwcTransforms: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  eslint: {
    ignoreDuringBuilds: true,
  },
  images: {
    domains: [
      'quote.frigate.ai'
    ],
  },
  // Disable static generation completely
  trailingSlash: false,
  // Force all pages to be dynamic
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },

  // Commenting out aggressive headers for now to fix static asset loading
  // async headers() {
  //   return [
  //     {
  //       // Apply security headers only to pages, not static assets
  //       source: '/((?!_next|favicon.ico|.*\\.).*)',
  //       headers: [
  //         {
  //           key: 'X-Frame-Options',
  //           value: 'DENY',
  //         },
  //         {
  //           key: 'X-Content-Type-Options',
  //           value: 'nosniff',
  //         },
  //         {
  //           key: 'X-XSS-Protection',
  //           value: '1; mode=block',
  //         },
  //         {
  //           key: 'Referrer-Policy',
  //           value: 'same-origin',
  //         },
  //         {
  //           key: 'Cache-Control',
  //           value: 'no-cache, no-store, must-revalidate',
  //         },
  //         {
  //           key: 'Pragma',
  //           value: 'no-cache',
  //         },
  //         {
  //           key: 'Expires',
  //           value: '0',
  //         },
  //       ],
  //     },
  //   ];
  // },
};

module.exports = withSentryConfig(nextConfig, {
  silent: true,
  org: process.env.SENTRY_ORG,
  project: process.env.SENTRY_PROJECT,
});
