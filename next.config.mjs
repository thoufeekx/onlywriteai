/** @type {import('next').NextConfig} */
const nextConfig = {
  eslint: {
    ignoreDuringBuilds: true,
  },
  typescript: {
    ignoreBuildErrors: true,
  },
  images: {
    unoptimized: true,
  },
  // Enable standalone output for Docker production builds
  output: 'standalone',
  // Disable static optimization for dynamic content
  trailingSlash: false,
}

export default nextConfig
