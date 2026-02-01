/** @type {import('next').NextConfig} */
const nextConfig = {
  // Speed up build trace collection - exclude large/native packages
  experimental: {
    outputFileTracingExcludes: {
      '*': [
        // Platform-specific binaries
        'node_modules/@swc/**',
        'node_modules/@esbuild/**',
        'node_modules/esbuild/**',
        // Image processing
        'node_modules/sharp/**',
        'node_modules/canvas/**',
        // Browser emulation
        'node_modules/jsdom/**',
        'node_modules/puppeteer/**',
        // Passkit and all dependencies
        'node_modules/passkit-generator/**',
        'node_modules/node-forge/**',
        'node_modules/yazl/**',
        'node_modules/do-not-zip/**',
        'node_modules/pem/**',
        // Other large packages
        'node_modules/typescript/**',
        'node_modules/@types/**',
        'node_modules/terser/**',
        'node_modules/webpack/**',
      ],
    },
  },
  async rewrites() {
    return [
      // Portal subdomain: /prettypaidcloset -> /client/prettypaidcloset
      {
        source: '/:slug',
        has: [
          {
            type: 'host',
            value: 'portal.l7shift.com',
          },
        ],
        destination: '/client/:slug',
      },
      // Portal subdomain: /prettypaidcloset/dashboard -> /client/prettypaidcloset/dashboard
      {
        source: '/:slug/:path*',
        has: [
          {
            type: 'host',
            value: 'portal.l7shift.com',
          },
        ],
        destination: '/client/:slug/:path*',
      },
    ]
  },
}

module.exports = nextConfig
