import "./src/env"; // Validate environment variables at build time
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  // standalone output is for Docker/production deployments only.
  // In CI E2E tests, "next start" is incompatible with standalone output.
  output: process.env.CI ? undefined : "standalone",
  serverExternalPackages: ["@react-pdf/renderer", "pg-boss", "exceljs"],
  experimental: {
    turbopackFileSystemCacheForDev: false,
    serverActions: {
      bodySizeLimit: "5mb",
    },
  },
};

const withNextIntl = createNextIntlPlugin();
export default withNextIntl(nextConfig);
