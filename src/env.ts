import { createEnv } from "@t3-oss/env-nextjs";
import { z } from "zod";

/**
 * Environment Variable Validation
 *
 * Centralized Zod schema for all environment variables with build-time validation.
 * Validation runs when next.config.ts imports this file.
 *
 * Usage: import { env } from "@/env"
 * Access: env.DATABASE_URL (type-safe with IDE autocomplete)
 *
 * Docker builds: Set SKIP_ENV_VALIDATION=1 to bypass validation when secrets unavailable
 */
export const env = createEnv({
  /**
   * Server-side environment variables (not exposed to client)
   * Access these ONLY in server components, API routes, or server actions
   */
  server: {
    // Database (PostgreSQL 16)
    DATABASE_URL: z.string().url(),
    POSTGRES_USER: z.string().min(1),
    POSTGRES_PASSWORD: z.string().min(1), // Alphanumeric only per CLAUDE.md
    POSTGRES_DB: z.string().min(1),
    POSTGRES_PORT: z.coerce.number().int().positive(),

    // Authentication (Better Auth)
    BETTER_AUTH_SECRET: z.string().min(32),
    BETTER_AUTH_URL: z.string().url(),

    // AWS S3 Evidence Storage (Mumbai region for RBI data localization)
    AWS_REGION: z.string().min(1), // Flexible for dev/test
    AWS_ACCESS_KEY_ID: z.string().min(1),
    AWS_SECRET_ACCESS_KEY: z.string().min(1),
    S3_BUCKET_NAME: z.string().min(1),

    // AWS SES Email (Mumbai region for RBI data localization)
    // Optional in development - required in production for email notifications
    AWS_SES_REGION: z.string().min(1).optional(),
    SES_FROM_EMAIL: z.string().email().optional(),

    // Application
    NODE_ENV: z
      .enum(["development", "test", "production"])
      .default("development"),
  },

  /**
   * Client-side environment variables (exposed to browser)
   * MUST have NEXT_PUBLIC_ prefix
   */
  client: {
    NEXT_PUBLIC_APP_URL: z.string().url(),
  },

  /**
   * Runtime environment mapping
   * CRITICAL: Next.js bundler requires explicit destructuring
   * Every key in server/client schemas MUST have a matching entry here
   */
  runtimeEnv: {
    // Server vars
    DATABASE_URL: process.env.DATABASE_URL,
    POSTGRES_USER: process.env.POSTGRES_USER,
    POSTGRES_PASSWORD: process.env.POSTGRES_PASSWORD,
    POSTGRES_DB: process.env.POSTGRES_DB,
    POSTGRES_PORT: process.env.POSTGRES_PORT,
    BETTER_AUTH_SECRET: process.env.BETTER_AUTH_SECRET,
    BETTER_AUTH_URL: process.env.BETTER_AUTH_URL,
    AWS_REGION: process.env.AWS_REGION,
    AWS_ACCESS_KEY_ID: process.env.AWS_ACCESS_KEY_ID,
    AWS_SECRET_ACCESS_KEY: process.env.AWS_SECRET_ACCESS_KEY,
    S3_BUCKET_NAME: process.env.S3_BUCKET_NAME,
    AWS_SES_REGION: process.env.AWS_SES_REGION,
    SES_FROM_EMAIL: process.env.SES_FROM_EMAIL,
    NODE_ENV: process.env.NODE_ENV,

    // Client vars
    NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
  },

  /**
   * Skip validation when SKIP_ENV_VALIDATION=1
   * Use for Docker builds where secrets aren't available at build time
   */
  skipValidation: !!process.env.SKIP_ENV_VALIDATION,

  /**
   * Treat empty strings as undefined (catches common misconfiguration)
   * Empty string in .env file → treated as missing variable
   */
  emptyStringAsUndefined: true,
});
