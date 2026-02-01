/** @type {import('next').NextConfig} */
const nextConfig = {
  // Speed up build trace collection - exclude large packages
  outputFileTracingExcludes: {
    '*': [
      'node_modules/@swc/core-linux-x64-gnu',
      'node_modules/@swc/core-linux-x64-musl',
      'node_modules/@esbuild/**',
      'node_modules/sharp/**',
      'node_modules/canvas/**',
      'node_modules/jsdom/**',
      // Passkit generator dependencies
      'node_modules/node-forge/**',
      'node_modules/yazl/**',
      'node_modules/do-not-zip/**',
    ],
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
