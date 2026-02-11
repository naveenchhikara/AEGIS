import "./src/env"; // Validate environment variables at build time
import type { NextConfig } from "next";
import createNextIntlPlugin from "next-intl/plugin";

const nextConfig: NextConfig = {
  output: "standalone",
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
