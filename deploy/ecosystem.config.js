module.exports = {
  apps: [
    {
      name: 'aegis',
      script: 'node_modules/next/dist/bin/next',
      args: 'start',
      interpreter: 'node',
      cwd: '/home/admin/workspace/aegis',
      instances: 1,
      exec_mode: 'fork',
      max_memory_restart: '800M',
      env_file: '/home/admin/workspace/aegis/.env.production',
      env: {
        NODE_ENV: 'production',
        PORT: 3000,
      },
      log_date_format: 'YYYY-MM-DD HH:mm:ss Z',
      error_file: '/home/admin/workspace/aegis/logs/error.log',
      out_file: '/home/admin/workspace/aegis/logs/out.log',
      merge_logs: true,
      max_restarts: 10,
      min_uptime: '10s',
      restart_delay: 5000,
      watch: false,
    },
  ],
};
