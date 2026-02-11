// ==============================================================================
// AEGIS - PM2 Process Configuration
// Manages the Next.js production server
// Usage: pm2 start deploy/ecosystem.config.js
// ==============================================================================

const os = require("os");
const path = require("path");

const deployUser = process.env.AEGIS_DEPLOY_USER || os.userInfo().username;
const deployHome =
  process.env.AEGIS_APP_DIR ||
  path.join(os.homedir(), "aegis");

module.exports = {
  apps: [
    {
      name: "aegis",
      script: "node_modules/next/dist/bin/next",
      args: "start",
      interpreter: "node",
      cwd: deployHome,
      instances: 1,
      exec_mode: "fork",
      max_memory_restart: "400M",
      env: {
        NODE_ENV: "production",
        PORT: 3000,
      },
      // Logging
      log_date_format: "YYYY-MM-DD HH:mm:ss Z",
      error_file: path.join(deployHome, "logs", "error.log"),
      out_file: path.join(deployHome, "logs", "out.log"),
      merge_logs: true,
      // Restart policy
      max_restarts: 10,
      min_uptime: "10s",
      restart_delay: 5000,
      // Watch (disabled in production)
      watch: false,
    },
  ],
};
