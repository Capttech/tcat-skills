import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  allowedDevOrigins: ['trivia.versanexusllc.com'],
  turbopack: {
    // __dirname is undefined in ESM; import.meta.dirname gives the correct absolute path.
    root: import.meta.dirname,
  },
};

export default nextConfig;
