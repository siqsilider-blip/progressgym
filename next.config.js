/** @type {import('next').NextConfig} */
const nextConfig = {
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
