/** @type {import('next').NextConfig} */
const nextConfig = {
  reactStrictMode: true,
  serverExternalPackages: ['node:sqlite'],
  experimental: {
    serverComponentsExternalPackages: ['node:sqlite'],
  },
};

module.exports = nextConfig;
