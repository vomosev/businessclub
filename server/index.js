require('dotenv').config();

const fs = require('fs');
const https = require('https');
const express = require('express');
const cors = require('cors');

const { testConnection } = require('./config/db');
const sessionMiddleware = require('./config/session');
const authRoutes = require('./routes/authRoutes');
const memberRoutes = require('./routes/memberRoutes');
const eventRoutes = require('./routes/eventRoutes');
const { notFound, errorHandler } = require('./middleware/errorHandler');

const FRONTEND_ORIGIN = 'https://businessclub.geo-drops.com';
const CERTIFICATE_PATH =
  '/home/arx-app/backends/businessclub/certs/certificate.crt';
const PRIVATE_KEY_PATH =
  '/home/arx-app/backends/businessclub/certs/private.key';

const app = express();

app.disable('x-powered-by');
app.set('trust proxy', 1);

app.use(
  cors({
    origin(origin, callback) {
      if (!origin || origin === FRONTEND_ORIGIN) {
        callback(null, true);
        return;
      }

      callback(null, false);
    },
    credentials: true,
    methods: ['GET', 'POST', 'PUT', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Accept'],
    optionsSuccessStatus: 204,
  })
);

app.use(express.json({ limit: '1mb' }));
app.use(sessionMiddleware);

app.get('/health', (req, res) => {
  res.json({ status: 'ok' });
});

app.use('/auth', authRoutes);
app.use('/members', memberRoutes);
app.use('/events', eventRoutes);

app.use(notFound);
app.use(errorHandler);

async function startServer() {
  const backendPort = Number.parseInt(process.env.BACKEND_PORT, 10);

  if (
    !Number.isInteger(backendPort) ||
    backendPort < 1 ||
    backendPort > 65535
  ) {
    throw new Error('BACKEND_PORT must be a valid TCP port number.');
  }

  await testConnection();

  const credentials = {
    cert: fs.readFileSync(CERTIFICATE_PATH),
    key: fs.readFileSync(PRIVATE_KEY_PATH),
  };

  const server = https.createServer(credentials, app);

  server.on('error', (error) => {
    console.error('HTTPS server error:', error.message);
    process.exitCode = 1;
  });

  server.listen(backendPort, '0.0.0.0', () => {
    console.log(`Business Club API is listening securely on port ${backendPort}.`);
  });

  const shutdown = (signal) => {
    console.log(`${signal} received. Shutting down HTTPS server.`);

    server.close((error) => {
      if (error) {
        console.error('Failed to close HTTPS server cleanly:', error.message);
        process.exit(1);
      }

      process.exit(0);
    });

    setTimeout(() => {
      console.error('Forced shutdown after timeout.');
      process.exit(1);
    }, 10000).unref();
  };

  process.once('SIGTERM', () => shutdown('SIGTERM'));
  process.once('SIGINT', () => shutdown('SIGINT'));
}

startServer().catch((error) => {
  console.error('Unable to start the Business Club API:', error.message);
  process.exit(1);
});