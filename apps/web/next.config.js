/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  output: 'standalone',
  images: {
    domains: [
      'cnc-quote-web.onrender.com',
      'cnc-quote-api.onrender.com',
      'cnc-quote-cad.onrender.com'
    ],
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
  // Optimize build for Render.com
  experimental: {
    optimizeFonts: true,
    optimizeImages: true,
    optimizeCss: true,
    scrollRestoration: true,
  },
}

module.exports = nextConfig
