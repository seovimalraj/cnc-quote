const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  experimental: {
    appDir: true,
    serverActions: true,
    serverComponentsExternalPackages: [],
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
      'cnc-quote-web.onrender.com',
      'cnc-quote-api.onrender.com',
      'cnc-quote-cad.onrender.com'
    ],
  },
  // Disable static generation completely
  trailingSlash: false,
  // Force all pages to be dynamic
  generateBuildId: async () => {
    return 'build-' + Date.now()
  },

  async headers() {
    return [
      {
        source: '/:path*',
        headers: [
          {
            key: 'X-Frame-Options',
            value: 'DENY',
          },
          {
            key: 'X-Content-Type-Options',
            value: 'nosniff',
          },
          {
            key: 'X-XSS-Protection',
            value: '1; mode=block',
          },
          {
            key: 'Referrer-Policy',
            value: 'same-origin',
          },
        ],
      },
    ];
  },
};

module.exports = nextConfig;
