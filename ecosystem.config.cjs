/** PM2 config for VPS — app listens on PORT (default 3009) */
module.exports = {
  apps: [
    {
      name: "crypto-pulse",
      cwd: __dirname,
      script: "npm",
      args: "start",
      env: {
        NODE_ENV: "production",
        PORT: 3009,
      },
    },
  ],
};
