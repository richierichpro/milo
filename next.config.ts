import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Keeps the Next.js badge out of the demo video.
  devIndicators: false,
  turbopack: {
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
