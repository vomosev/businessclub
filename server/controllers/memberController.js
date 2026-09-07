'use strict';

const { pool } = require('../config/db');

const FIELD_RULES = {
  name: {
    column: 'name',
    label: 'Name',
    required: true,
    minLength: 2,
    maxLength: 100
  },
  company: {
    column: 'company',
    label: 'Company',
    required: true,
    minLength: 2,
    maxLength: 150
  },
  jobTitle: {
    column: 'job_title',
    label: 'Job title',
    required: true,
    minLength: 2,
    maxLength: 120
  },
  sector: {
    column: 'sector',
    label: 'Sector',
    required: false,
    maxLength: 100
  },
  location: {
    column: 'location',
    label: 'Location',
    required: true,
    minLength: 2,
    maxLength: 120
  },
  bio: {
    column: 'bio',
    label: 'Bio',
    required: false,
    maxLength: 2000
  }
};

function hasOwn(object, property) {
  return Object.prototype.hasOwnProperty.call(object, property);
}

function validateStringField(value, rule) {
  if (typeof value !== 'string') {
    return { error: `${rule.label} must be a string.` };
  }

  const normalisedValue = value.trim();

  if (!normalisedValue) {
    if (rule.required) {
      return { error: `${rule.label} is required.` };
    }

    return { value: null };
  }

  if (rule.minLength && normalisedValue.length < rule.minLength) {
    return {
      error: `${rule.label} must be at least ${rule.minLength} characters long.`
    };
  }

  if (normalisedValue.length > rule.maxLength) {
    return {
      error: `${rule.label} must not exceed ${rule.maxLength} characters.`
    };
  }

  return { value: normalisedValue };
}

function validateWebsite(value) {
  if (value === null || value === undefined || value === '') {
    return { value: null };
  }

  if (typeof value !== 'string') {
    return { error: 'Website must be a valid URL.' };
  }

  const website = value.trim();

  if (!website) {
    return { value: null };
  }

  if (website.length > 255) {
    return { error: 'Website must not exceed 255 characters.' };
  }

  try {
    const parsedUrl = new URL(website);

    if (
      !['http:', 'https:'].includes(parsedUrl.protocol) ||
      !parsedUrl.hostname ||
      parsedUrl.username ||
      parsedUrl.password
    ) {
      return {
        error: 'Website must be a valid HTTP or HTTPS URL without credentials.'
      };
    }

    const normalisedWebsite = parsedUrl.toString();

    if (normalisedWebsite.length > 255) {
      return { error: 'Website must not exceed 255 characters.' };
    }

    return { value: normalisedWebsite };
  } catch {
    return {
      error: 'Website must be a complete URL beginning with http:// or https://.'
    };
  }
}

function toPublicMember(row) {
  return {
    id: row.id,
    name: row.name,
    company: row.company,
    jobTitle: row.job_title,
    sector: row.sector,
    location: row.location,
    bio: row.bio,
    website: row.website,
    role: row.role
  };
}

function toSafeUser(row) {
  return {
    id: row.id,
    email: row.email,
    name: row.name,
    company: row.company,
    jobTitle: row.job_title,
    sector: row.sector,
    location: row.location,
    bio: row.bio,
    website: row.website,
    membershipStatus: row.membership_status,
    role: row.role,
    createdAt: row.created_at,
    updatedAt: row.updated_at
  };
}

async function listMembers(req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT id, name, company, job_title, sector, location, bio, website, role
       FROM users
       WHERE membership_status = ?
       ORDER BY name ASC, company ASC, id ASC`,
      ['active']
    );

    return res.status(200).json({
      members: rows.map(toPublicMember)
    });
  } catch (error) {
    return next(error);
  }
}

async function getMemberById(req, res, next) {
  const memberId = Number(req.params.id);

  if (!Number.isSafeInteger(memberId) || memberId <= 0) {
    return res.status(400).json({
      error: 'A valid member ID is required.'
    });
  }

  try {
    const [rows] = await pool.execute(
      `SELECT id, name, company, job_title, sector, location, bio, website, role
       FROM users
       WHERE id = ? AND membership_status = ?
       LIMIT 1`,
      [memberId, 'active']
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Member not found.'
      });
    }

    return res.status(200).json({
      member: toPublicMember(rows[0])
    });
  } catch (error) {
    return next(error);
  }
}

async function updateCurrentMember(req, res, next) {
  const userId = Number(req.session && req.session.userId);

  if (!Number.isSafeInteger(userId) || userId <= 0) {
    return res.status(401).json({
      error: 'Authentication is required.'
    });
  }

  if (
    !req.body ||
    typeof req.body !== 'object' ||
    Array.isArray(req.body)
  ) {
    return res.status(400).json({
      error: 'A valid profile payload is required.'
    });
  }

  const updates = [];
  const values = [];

  for (const [field, rule] of Object.entries(FIELD_RULES)) {
    if (!hasOwn(req.body, field)) {
      continue;
    }

    const result = validateStringField(req.body[field], rule);

    if (result.error) {
      return res.status(400).json({ error: result.error });
    }

    updates.push(`${rule.column} = ?`);
    values.push(result.value);
  }

  if (hasOwn(req.body, 'website')) {
    const websiteResult = validateWebsite(req.body.website);

    if (websiteResult.error) {
      return res.status(400).json({ error: websiteResult.error });
    }

    updates.push('website = ?');
    values.push(websiteResult.value);
  }

  if (updates.length === 0) {
    return res.status(400).json({
      error: 'No supported profile fields were provided.'
    });
  }

  try {
    const [updateResult] = await pool.execute(
      `UPDATE users
       SET ${updates.join(', ')}, updated_at = CURRENT_TIMESTAMP
       WHERE id = ? AND membership_status = ?`,
      [...values, userId, 'active']
    );

    if (updateResult.affectedRows === 0) {
      return res.status(404).json({
        error: 'Active member profile not found.'
      });
    }

    const [rows] = await pool.execute(
      `SELECT
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
       FROM users
       WHERE id = ? AND membership_status = ?
       LIMIT 1`,
      [userId, 'active']
    );

    if (rows.length === 0) {
      return res.status(404).json({
        error: 'Active member profile not found.'
      });
    }

    return res.status(200).json({
      message: 'Profile updated successfully.',
      user: toSafeUser(rows[0])
    });
  } catch (error) {
    return next(error);
  }
}

module.exports = {
  listMembers,
  getMemberById,
  updateCurrentMember
};