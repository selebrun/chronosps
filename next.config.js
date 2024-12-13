/** @type {import('next').NextConfig} */

const nextConfig = {
  experimental: {
    serverActions: {
      allowedForwardedHosts: ['localhost'],
      allowedOrigins: [
        'http://localhost',
        'https://piso.chronosps.app',
      ]
    }
  }
}

module.exports = nextConfig


