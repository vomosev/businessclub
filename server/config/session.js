const session = require('express-session');
const { pool } = require('./db');
const MySQLSessionStore = require('./mysqlSessionStore');

const SESSION_MAX_AGE = 7 * 24 * 60 * 60 * 1000;
const isProduction = process.env.NODE_ENV === 'production';

if (!process.env.SESSION_SECRET) {
  throw new Error('SESSION_SECRET environment variable is required');
}

const sessionMiddleware = session({
  store: new MySQLSessionStore(pool),
  secret: process.env.SESSION_SECRET,
  resave: false,
  saveUninitialized: false,
  proxy: true,
  cookie: {
    httpOnly: true,
    secure: true,
    sameSite: 'none',
    maxAge: SESSION_MAX_AGE,
    path: '/',
    ...(isProduction ? { domain: '.geo-drops.com' } : {})
  }
});

module.exports = sessionMiddleware;