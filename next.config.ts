import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  /* config options here */
  images: {
    remotePatterns: [
      {
        protocol: "https",
        hostname: "serpapi.com",
      },
      {
        protocol: "https",
        hostname: "images.pexels.com",
      },
      {
        protocol: "https",
        hostname: "res.cloudinary.com",
        // restrict to your Cloudinary cloud (replace `daegir3wd` if different)
        // pathname: "/daegir3wd/**",
      },
    ],
  },
};

export default nextConfig;