import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  outputFileTracingIncludes: {
    "/api/submissions": ["./node_modules/ffmpeg-static/**"],
    "/api/campaigns/[campaignId]/submissions": [
      "./node_modules/ffmpeg-static/**",
    ],
    "/api/internal/ai/submissions/process": [
      "./node_modules/ffmpeg-static/**",
    ],
  },
};

export default nextConfig;
