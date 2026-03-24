import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  transpilePackages: ["@pmxt/components", "@pmxt/sdk"],
};

export default nextConfig;
