/** @type {import('next').NextConfig} */
const nextConfig = {
  async rewrites() {
    return [
      {
        source: '/.well-known/assetlinks.json',
        destination: '/api/android/assetlinks',
      },
      {
        source: '/.well-known/apple-app-site-association',
        destination: '/api/ios/apple-app-site-association',
      },
    ]
  },
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: '**.supabase.co',
      },
    ],
  },
  experimental: {
    staleTimes: {
      dynamic: 60,
      static: 300,
    },
  },
}

module.exports = nextConfig
