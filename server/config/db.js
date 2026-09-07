'use strict';

const mysql = require('mysql2/promise');

const requiredVariables = ['DB_HOST', 'DB_USER', 'DB_PASSWORD', 'DB_NAME'];
const missingVariables = requiredVariables.filter(
  (name) => typeof process.env[name] !== 'string' || process.env[name].trim() === ''
);

if (missingVariables.length > 0) {
  throw new Error(
    `Missing required database environment variables: ${missingVariables.join(', ')}`
  );
}

const pool = mysql.createPool({
  host: process.env.DB_HOST,
  user: process.env.DB_USER,
  password: process.env.DB_PASSWORD,
  database: process.env.DB_NAME,
  charset: 'utf8mb4',
  waitForConnections: true,
  connectionLimit: 10,
  maxIdle: 10,
  idleTimeout: 60000,
  queueLimit: 100,
  enableKeepAlive: true,
  keepAliveInitialDelay: 0
});

// ── TEMPORARY DIAGNOSTIC — logs every caller of getConnection() so you can
// find who's triggering the recursive/duplicate pool wrapping. Remove once fixed. ──
const originalGetConnection = pool.getConnection.bind(pool);
let callDepth = 0;

pool.getConnection = function (...args) {
  callDepth++;
  if (callDepth > 5) {
    console.error('🚨 getConnection() called recursively — stack trace:');
    console.error(new Error().stack);
    callDepth = 0; // reset so we don't keep spamming
    throw new Error('Aborting suspected recursive getConnection() call.');
  }
  const result = originalGetConnection(...args);
  Promise.resolve(result).finally(() => { callDepth--; });
  return result;
};

async function testConnection() {
  let connection;

  try {
    connection = await pool.getConnection();
    await connection.ping();
    await connection.query(
      'SET NAMES utf8mb4 COLLATE utf8mb4_unicode_ci'
    );
    return true;
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = {
  pool,
  testConnection
};