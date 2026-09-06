import type { NextConfig } from "next";
import path from "node:path";

const baseDomain = process.env.BASE_DOMAIN;

const nextConfig: NextConfig = {
  output: "standalone",
  turbopack: {
    root: path.resolve(__dirname),
  },
  // `next dev` blocks cross-origin requests to dev-only assets by default (only `localhost`
  // is allowed out of the box) — needed here since every tenant lives on its own subdomain,
  // e.g. admin.<BASE_DOMAIN> or kunde1.<BASE_DOMAIN>, and BASE_DOMAIN is often not localhost
  // (a plain-IP test domain, or a real domain during local staging).
  allowedDevOrigins: baseDomain && baseDomain !== "localhost" ? [baseDomain, `*.${baseDomain}`] : [],
};

export default nextConfig;
