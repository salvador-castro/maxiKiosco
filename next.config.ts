import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: 'https',
        hostname: 'kxaygskhpuykrtysklim.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
      // si también usás el otro proyecto/logo en algún lado:
      {
        protocol: 'https',
        hostname: 'cmtfqzzhfzymzwyktjhm.supabase.co',
        pathname: '/storage/v1/object/public/**',
      },
    ],
  },
  reactCompiler: true,
};

export default nextConfig;