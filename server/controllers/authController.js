const bcrypt = require('bcrypt');
const { pool } = require('../config/db');

const BCRYPT_ROUNDS = 12;
const SESSION_COOKIE_NAME = 'connect.sid';
const EMAIL_MAX_LENGTH = 254;
const PASSWORD_MAX_LENGTH = 128;

const SAFE_USER_COLUMNS = `
  id,
  email,
  name,
  company,
  job_title,
  sector,
  location,
  bio,
  website,
  membership_status,
  role,
  created_at,
  updated_at
`;

function normaliseEmail(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().toLowerCase();
}

function normaliseText(value) {
  if (typeof value !== 'string') {
    return '';
  }

  return value.trim().replace(/\s+/g, ' ');
}

function isValidEmail(email) {
  return (
    email.length > 0 &&
    email.length <= EMAIL_MAX_LENGTH &&
    /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)
  );
}

function validateSignupPassword(password) {
  if (typeof password !== 'string') {
    return 'Password is required.';
  }

  if (password.length < 8) {
    return 'Password must be at least 8 characters long.';
  }

  if (password.length > PASSWORD_MAX_LENGTH) {
    return `Password must not exceed ${PASSWORD_MAX_LENGTH} characters.`;
  }

  if (!/[A-Za-z]/.test(password) || !/\d/.test(password)) {
    return 'Password must contain at least one letter and one number.';
  }

  return null;
}

function validateRequiredText(value, label, maximumLength) {
  if (!value) {
    return `${label} is required.`;
  }

  if (value.length > maximumLength) {
    return `${label} must not exceed ${maximumLength} characters.`;
  }

  return null;
}

function toSafeUser(row) {
  return {
    id: Number(row.id),
    email: row.email,
    name: row.name,
    company: row.company,
    jobTitle: row.job_title,
    sector: row.sector || '',
    location: row.location,
    bio: row.bio || '',
    website: row.website || '',
    membershipStatus: row.membership_status,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

function regenerateSession(req) {
  return new Promise((resolve, reject) => {
    req.session.regenerate((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function saveSession(req) {
  return new Promise((resolve, reject) => {
    req.session.save((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function destroySession(req) {
  return new Promise((resolve, reject) => {
    if (!req.session) {
      resolve();
      return;
    }

    req.session.destroy((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

function clearSessionCookie(res) {
  const options = {
    path: '/',
    httpOnly: true,
    secure: true,
    sameSite: 'none'
  };

  if (process.env.NODE_ENV === 'production') {
    options.domain = '.geo-drops.com';
  }

  res.clearCookie(SESSION_COOKIE_NAME, options);
}

async function establishSession(req, user) {
  await regenerateSession(req);

  req.session.userId = Number(user.id);
  req.session.role = user.role;

  await saveSession(req);
}

async function signup(req, res, next) {
  try {
    const email = normaliseEmail(req.body?.email);
    const password = req.body?.password;
    const name = normaliseText(req.body?.name);
    const company = normaliseText(req.body?.company);
    const jobTitle = normaliseText(req.body?.jobTitle ?? req.body?.job_title);
    const location = normaliseText(req.body?.location);

    if (!isValidEmail(email)) {
      return res.status(400).json({ error: 'Please provide a valid email address.' });
    }

    const passwordError = validateSignupPassword(password);
    if (passwordError) {
      return res.status(400).json({ error: passwordError });
    }

    const fieldError =
      validateRequiredText(name, 'Name', 120) ||
      validateRequiredText(company, 'Company', 160) ||
      validateRequiredText(jobTitle, 'Job title', 120) ||
      validateRequiredText(location, 'Location', 120);

    if (fieldError) {
      return res.status(400).json({ error: fieldError });
    }

    const [existingUsers] = await pool.execute(
      'SELECT id FROM users WHERE email = ? LIMIT 1',
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(409).json({
        error: 'An account already exists for this email address.'
      });
    }

    const passwordHash = await bcrypt.hash(password, BCRYPT_ROUNDS);

    let result;

    try {
      [result] = await pool.execute(
        `INSERT INTO users
          (email, password_hash, name, company, job_title, location, membership_status, role)
         VALUES (?, ?, ?, ?, ?, ?, 'active', 'member')`,
        [email, passwordHash, name, company, jobTitle, location]
      );
    } catch (error) {
      if (error && (error.code === 'ER_DUP_ENTRY' || error.errno === 1062)) {
        return res.status(409).json({
          error: 'An account already exists for this email address.'
        });
      }

      throw error;
    }

    const [users] = await pool.execute(
      `SELECT ${SAFE_USER_COLUMNS}
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [result.insertId]
    );

    if (users.length === 0) {
      throw new Error('The newly created account could not be loaded.');
    }

    const user = users[0];
    await establishSession(req, user);

    return res.status(201).json({
      message: 'Your membership account has been created.',
      user: toSafeUser(user)
    });
  } catch (error) {
    return next(error);
  }
}

async function login(req, res, next) {
  try {
    const email = normaliseEmail(req.body?.email);
    const password = req.body?.password;

    if (!isValidEmail(email) || typeof password !== 'string' || password.length === 0) {
      return res.status(400).json({
        error: 'A valid email address and password are required.'
      });
    }

    if (password.length > PASSWORD_MAX_LENGTH) {
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    const [users] = await pool.execute(
      `SELECT
        ${SAFE_USER_COLUMNS},
        password_hash
       FROM users
       WHERE email = ?
       LIMIT 1`,
      [email]
    );

    if (users.length === 0) {
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    const user = users[0];
    const passwordMatches = await bcrypt.compare(password, user.password_hash);

    if (!passwordMatches) {
      return res.status(401).json({ error: 'Invalid email address or password.' });
    }

    if (user.membership_status !== 'active') {
      return res.status(403).json({
        error: 'This membership account is not currently active.'
      });
    }

    await establishSession(req, user);

    return res.status(200).json({
      message: 'You are now signed in.',
      user: toSafeUser(user)
    });
  } catch (error) {
    return next(error);
  }
}

async function logout(req, res, next) {
  try {
    await destroySession(req);
    clearSessionCookie(res);

    return res.status(200).json({ message: 'You have been signed out.' });
  } catch (error) {
    clearSessionCookie(res);
    return next(error);
  }
}

async function me(req, res, next) {
  try {
    const userId = Number(req.session?.userId);

    if (!Number.isInteger(userId) || userId <= 0) {
      return res.status(401).json({ error: 'Authentication is required.' });
    }

    const [users] = await pool.execute(
      `SELECT ${SAFE_USER_COLUMNS}
       FROM users
       WHERE id = ?
       LIMIT 1`,
      [userId]
    );

    if (users.length === 0 || users[0].membership_status !== 'active') {
      await destroySession(req);
      clearSessionCookie(res);

      return res.status(401).json({
        error: 'Your session is no longer valid. Please sign in again.'
      });
    }

    const user = users[0];

    if (req.session.role !== user.role) {
      req.session.role = user.role;
      await saveSession(req);
    }

    return res.status(200).json({ user: toSafeUser(user) });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  signup,
  login,
  logout,
  me
};