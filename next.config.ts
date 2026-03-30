import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // When nested in a monorepo, avoid resolving the wrong lockfile (local dev only; Vercel cwd is this app).
  turbopack: {
    root: process.cwd(),
  },
};

export default nextConfig;
