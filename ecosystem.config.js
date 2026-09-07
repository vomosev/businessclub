module.exports = {
  apps: [
    {
      name: 'businessclub',
      cwd: '/home/arx-app/backends/businessclub',
      script: 'node_modules/.bin/next',
      args: 'start',
      env: {
        NODE_ENV: 'production',
        PORT: 4000,
      },
    },
  ],
};