/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**",
      },
    ],
  },
  // Production optimizations
  poweredByHeader: false,
  compress: true,
  reactStrictMode: true,
};

export default nextConfig;
