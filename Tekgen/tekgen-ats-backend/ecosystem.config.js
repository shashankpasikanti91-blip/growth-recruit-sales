module.exports = {
  apps: [{
    name: 'tekgen-ats',
    script: 'src/index.js',
    cwd: 'C:/Tekgen/tekgen-ats-backend',
    env: {
      NODE_ENV: 'development',
      PORT: 5000,
    },
    max_restarts: 5,
    min_uptime: '10s',
    kill_timeout: 8000,
    wait_ready: false,
    autorestart: true,
    // Graceful reload: new process starts before old one dies
    // so the server is never down during code updates
  }],
};
