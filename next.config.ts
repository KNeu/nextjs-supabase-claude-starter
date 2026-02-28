import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        // Supabase Storage — replace PROJECT_REF with your project reference
        protocol: "https",
        hostname: "*.supabase.co",
        pathname: "/storage/v1/object/public/**",
      },
      {
        // Google profile pictures (OAuth)
        protocol: "https",
        hostname: "lh3.googleusercontent.com",
      },
    ],
  },
  experimental: {
    // Required for streaming responses from Server Actions
    serverActions: {
      bodySizeLimit: "2mb",
    },
  },
};

export default nextConfig;
