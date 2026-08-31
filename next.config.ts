import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "image.tmdb.org",
        pathname: "/t/p/**",
      },
    ],
    // Vercel's Hobby-plan image-optimization quota (source images
    // transformed per billing period) got exhausted — posters that were
    // already cached kept rendering, anything new started 402ing
    // (x-vercel-error: OPTIMIZED_IMAGE_REQUEST_PAYMENT_REQUIRED). TMDB
    // already serves pre-sized images per the `w342`/`w500`/`w1280`
    // path segments this app requests, so Next's own resize/format
    // conversion was mostly redundant anyway.
    unoptimized: true,
  },
};

export default nextConfig;
