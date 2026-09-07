'use strict';

const { pool } = require('../config/db');

const MAX_CAPACITY = 100000;
const MAX_TITLE_LENGTH = 180;
const MAX_DESCRIPTION_LENGTH = 10000;
const MAX_VENUE_LENGTH = 255;
const MAX_LOCATION_LENGTH = 160;

function parseEventId(value) {
  const text = String(value ?? '');

  if (!/^[1-9]\d*$/.test(text)) {
    return null;
  }

  const id = Number(text);
  return Number.isSafeInteger(id) ? id : null;
}

function hasOwn(object, property) {
  return Object.prototype.hasOwnProperty.call(object, property);
}

function getBodyValue(body, snakeCaseName, camelCaseName) {
  if (hasOwn(body, snakeCaseName)) {
    return body[snakeCaseName];
  }

  return body[camelCaseName];
}

function validateText(value, fieldName, options = {}) {
  const {
    required = true,
    maxLength = 255,
    allowEmpty = false
  } = options;

  if (value === undefined || value === null) {
    if (required) {
      return { error: `${fieldName} is required.` };
    }

    return { value: null };
  }

  if (typeof value !== 'string') {
    return { error: `${fieldName} must be a string.` };
  }

  const normalised = value.trim();

  if (!allowEmpty && normalised.length === 0) {
    return { error: `${fieldName} is required.` };
  }

  if (normalised.length > maxLength) {
    return {
      error: `${fieldName} must not exceed ${maxLength} characters.`
    };
  }

  return { value: normalised };
}

function validateEventDate(value) {
  if (
    value === undefined ||
    value === null ||
    (typeof value === 'string' && value.trim() === '')
  ) {
    return { error: 'Event date is required.' };
  }

  const date = value instanceof Date ? new Date(value.getTime()) : new Date(value);

  if (Number.isNaN(date.getTime())) {
    return { error: 'Event date must be a valid date and time.' };
  }

  if (date.getTime() <= Date.now()) {
    return { error: 'Event date must be in the future.' };
  }

  return { value: date };
}

function validateCapacity(value) {
  if (value === undefined || value === null || value === '') {
    return { error: 'Capacity is required.' };
  }

  const capacity = Number(value);

  if (
    !Number.isSafeInteger(capacity) ||
    capacity < 1 ||
    capacity > MAX_CAPACITY
  ) {
    return {
      error: `Capacity must be a whole number between 1 and ${MAX_CAPACITY}.`
    };
  }

  return { value: capacity };
}

function validateEventPayload(body, partial = false) {
  if (!body || typeof body !== 'object' || Array.isArray(body)) {
    return { error: 'A valid event payload is required.' };
  }

  const values = {};
  let providedFields = 0;

  const fields = [
    {
      property: 'title',
      snakeCaseName: 'title',
      camelCaseName: 'title',
      validate: (value) =>
        validateText(value, 'Title', {
          maxLength: MAX_TITLE_LENGTH
        })
    },
    {
      property: 'description',
      snakeCaseName: 'description',
      camelCaseName: 'description',
      validate: (value) =>
        validateText(value, 'Description', {
          maxLength: MAX_DESCRIPTION_LENGTH
        })
    },
    {
      property: 'event_date',
      snakeCaseName: 'event_date',
      camelCaseName: 'eventDate',
      validate: validateEventDate
    },
    {
      property: 'venue',
      snakeCaseName: 'venue',
      camelCaseName: 'venue',
      validate: (value) =>
        validateText(value, 'Venue', {
          maxLength: MAX_VENUE_LENGTH
        })
    },
    {
      property: 'location',
      snakeCaseName: 'location',
      camelCaseName: 'location',
      validate: (value) =>
        validateText(value, 'Location', {
          maxLength: MAX_LOCATION_LENGTH
        })
    },
    {
      property: 'capacity',
      snakeCaseName: 'capacity',
      camelCaseName: 'capacity',
      validate: validateCapacity
    }
  ];

  for (const field of fields) {
    const supplied =
      hasOwn(body, field.snakeCaseName) ||
      hasOwn(body, field.camelCaseName);

    if (partial && !supplied) {
      continue;
    }

    providedFields += 1;

    const value = getBodyValue(
      body,
      field.snakeCaseName,
      field.camelCaseName
    );
    const result = field.validate(value);

    if (result.error) {
      return { error: result.error };
    }

    values[field.property] = result.value;
  }

  if (partial && providedFields === 0) {
    return { error: 'At least one event field must be supplied.' };
  }

  return { values };
}

function formatEvent(row) {
  const registrationCount = Number(row.registration_count || 0);
  const capacity = Number(row.capacity);
  const isRegistered = Boolean(Number(row.is_registered || 0));
  const availablePlaces = Math.max(capacity - registrationCount, 0);

  return {
    id: Number(row.id),
    title: row.title,
    description: row.description,
    eventDate: row.event_date,
    event_date: row.event_date,
    venue: row.venue,
    location: row.location,
    capacity,
    registrationCount,
    registration_count: registrationCount,
    availablePlaces,
    available_places: availablePlaces,
    isRegistered,
    is_registered: isRegistered,
    createdAt: row.created_at,
    created_at: row.created_at,
    updatedAt: row.updated_at,
    updated_at: row.updated_at
  };
}

function formatRegistration(row) {
  const event = formatEvent({
    ...row,
    is_registered: 1
  });

  return {
    ...event,
    registeredAt: row.registered_at,
    registered_at: row.registered_at
  };
}

async function selectEvent(executor, eventId, userId = null) {
  const [rows] = await executor.execute(
    `SELECT
       e.id,
       e.title,
       e.description,
       e.event_date,
       e.venue,
       e.location,
       e.capacity,
       e.created_at,
       e.updated_at,
       (
         SELECT COUNT(*)
         FROM event_registrations er_count
         WHERE er_count.event_id = e.id
       ) AS registration_count,
       EXISTS(
         SELECT 1
         FROM event_registrations er_member
         WHERE er_member.event_id = e.id
           AND er_member.user_id = ?
       ) AS is_registered
     FROM events e
     WHERE e.id = ?
     LIMIT 1`,
    [userId, eventId]
  );

  return rows[0] || null;
}

async function listEvents(req, res, next) {
  try {
    const userId = req.session && req.session.userId
      ? req.session.userId
      : null;

    const [rows] = await pool.execute(
      `SELECT
         e.id,
         e.title,
         e.description,
         e.event_date,
         e.venue,
         e.location,
         e.capacity,
         e.created_at,
         e.updated_at,
         (
           SELECT COUNT(*)
           FROM event_registrations er_count
           WHERE er_count.event_id = e.id
         ) AS registration_count,
         EXISTS(
           SELECT 1
           FROM event_registrations er_member
           WHERE er_member.event_id = e.id
             AND er_member.user_id = ?
         ) AS is_registered
       FROM events e
       ORDER BY e.event_date ASC, e.id ASC`,
      [userId]
    );

    return res.json({
      events: rows.map(formatEvent)
    });
  } catch (error) {
    return next(error);
  }
}

async function listMyRegistrations(req, res, next) {
  try {
    const [rows] = await pool.execute(
      `SELECT
         e.id,
         e.title,
         e.description,
         e.event_date,
         e.venue,
         e.location,
         e.capacity,
         e.created_at,
         e.updated_at,
         er.registered_at,
         (
           SELECT COUNT(*)
           FROM event_registrations er_count
           WHERE er_count.event_id = e.id
         ) AS registration_count,
         1 AS is_registered
       FROM event_registrations er
       INNER JOIN events e ON e.id = er.event_id
       WHERE er.user_id = ?
         AND e.event_date >= NOW()
       ORDER BY e.event_date ASC, e.id ASC`,
      [req.session.userId]
    );

    return res.json({
      registrations: rows.map(formatRegistration)
    });
  } catch (error) {
    return next(error);
  }
}

async function registerForEvent(req, res, next) {
  const eventId = parseEventId(req.params.id);

  if (!eventId) {
    return res.status(400).json({
      error: 'A valid event ID is required.'
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [eventRows] = await connection.execute(
      `SELECT id, event_date, capacity
       FROM events
       WHERE id = ?
       FOR UPDATE`,
      [eventId]
    );

    if (eventRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'Event not found.'
      });
    }

    const event = eventRows[0];
    const eventDate = new Date(event.event_date);

    if (
      Number.isNaN(eventDate.getTime()) ||
      eventDate.getTime() <= Date.now()
    ) {
      await connection.rollback();
      return res.status(409).json({
        error: 'Registration is closed because this event has already started.'
      });
    }

    const [existingRows] = await connection.execute(
      `SELECT 1
       FROM event_registrations
       WHERE event_id = ? AND user_id = ?
       LIMIT 1`,
      [eventId, req.session.userId]
    );

    if (existingRows.length > 0) {
      await connection.rollback();
      return res.status(409).json({
        error: 'You are already registered for this event.'
      });
    }

    const [countRows] = await connection.execute(
      `SELECT COUNT(*) AS registration_count
       FROM event_registrations
       WHERE event_id = ?`,
      [eventId]
    );

    const registrationCount = Number(countRows[0].registration_count || 0);
    const capacity = Number(event.capacity);

    if (registrationCount >= capacity) {
      await connection.rollback();
      return res.status(409).json({
        error: 'This event is fully booked.'
      });
    }

    let insertResult;

    try {
      [insertResult] = await connection.execute(
        `INSERT INTO event_registrations (event_id, user_id)
         VALUES (?, ?)`,
        [eventId, req.session.userId]
      );
    } catch (error) {
      if (error && error.code === 'ER_DUP_ENTRY') {
        await connection.rollback();
        return res.status(409).json({
          error: 'You are already registered for this event.'
        });
      }

      throw error;
    }

    await connection.commit();

    const eventRow = await selectEvent(pool, eventId, req.session.userId);

    return res.status(201).json({
      message: 'You have been registered for the event.',
      registration: {
        id: Number(insertResult.insertId),
        eventId,
        event_id: eventId,
        userId: Number(req.session.userId),
        user_id: Number(req.session.userId)
      },
      event: eventRow ? formatEvent(eventRow) : null
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // Preserve the original database error.
      }
    }

    return next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function cancelRegistration(req, res, next) {
  const eventId = parseEventId(req.params.id);

  if (!eventId) {
    return res.status(400).json({
      error: 'A valid event ID is required.'
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [eventRows] = await connection.execute(
      `SELECT id
       FROM events
       WHERE id = ?
       FOR UPDATE`,
      [eventId]
    );

    if (eventRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'Event not found.'
      });
    }

    const [result] = await connection.execute(
      `DELETE FROM event_registrations
       WHERE event_id = ? AND user_id = ?`,
      [eventId, req.session.userId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'You are not registered for this event.'
      });
    }

    await connection.commit();

    return res.json({
      message: 'Your event registration has been cancelled.'
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // Preserve the original database error.
      }
    }

    return next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function createEvent(req, res, next) {
  const validation = validateEventPayload(req.body);

  if (validation.error) {
    return res.status(400).json({
      error: validation.error
    });
  }

  const {
    title,
    description,
    event_date: eventDate,
    venue,
    location,
    capacity
  } = validation.values;

  try {
    const [result] = await pool.execute(
      `INSERT INTO events
         (title, description, event_date, venue, location, capacity, created_by)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        title,
        description,
        eventDate,
        venue,
        location,
        capacity,
        req.session.userId
      ]
    );

    const row = await selectEvent(
      pool,
      result.insertId,
      req.session.userId
    );

    return res.status(201).json({
      message: 'Event created successfully.',
      event: row ? formatEvent(row) : null
    });
  } catch (error) {
    return next(error);
  }
}

async function updateEvent(req, res, next) {
  const eventId = parseEventId(req.params.id);

  if (!eventId) {
    return res.status(400).json({
      error: 'A valid event ID is required.'
    });
  }

  const validation = validateEventPayload(req.body, true);

  if (validation.error) {
    return res.status(400).json({
      error: validation.error
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [eventRows] = await connection.execute(
      `SELECT id, capacity
       FROM events
       WHERE id = ?
       FOR UPDATE`,
      [eventId]
    );

    if (eventRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'Event not found.'
      });
    }

    if (hasOwn(validation.values, 'capacity')) {
      const [countRows] = await connection.execute(
        `SELECT COUNT(*) AS registration_count
         FROM event_registrations
         WHERE event_id = ?`,
        [eventId]
      );

      const registrationCount = Number(
        countRows[0].registration_count || 0
      );

      if (validation.values.capacity < registrationCount) {
        await connection.rollback();
        return res.status(409).json({
          error: `Capacity cannot be lower than the current ${registrationCount} registrations.`
        });
      }
    }

    const assignments = [];
    const parameters = [];

    const allowedColumns = [
      'title',
      'description',
      'event_date',
      'venue',
      'location',
      'capacity'
    ];

    for (const column of allowedColumns) {
      if (hasOwn(validation.values, column)) {
        assignments.push(`${column} = ?`);
        parameters.push(validation.values[column]);
      }
    }

    parameters.push(eventId);

    await connection.execute(
      `UPDATE events
       SET ${assignments.join(', ')}
       WHERE id = ?`,
      parameters
    );

    await connection.commit();

    const row = await selectEvent(pool, eventId, req.session.userId);

    return res.json({
      message: 'Event updated successfully.',
      event: row ? formatEvent(row) : null
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // Preserve the original database error.
      }
    }

    return next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

async function deleteEvent(req, res, next) {
  const eventId = parseEventId(req.params.id);

  if (!eventId) {
    return res.status(400).json({
      error: 'A valid event ID is required.'
    });
  }

  let connection;

  try {
    connection = await pool.getConnection();
    await connection.beginTransaction();

    const [eventRows] = await connection.execute(
      `SELECT id
       FROM events
       WHERE id = ?
       FOR UPDATE`,
      [eventId]
    );

    if (eventRows.length === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'Event not found.'
      });
    }

    await connection.execute(
      `DELETE FROM event_registrations
       WHERE event_id = ?`,
      [eventId]
    );

    const [result] = await connection.execute(
      `DELETE FROM events
       WHERE id = ?`,
      [eventId]
    );

    if (result.affectedRows === 0) {
      await connection.rollback();
      return res.status(404).json({
        error: 'Event not found.'
      });
    }

    await connection.commit();

    return res.json({
      message: 'Event deleted successfully.'
    });
  } catch (error) {
    if (connection) {
      try {
        await connection.rollback();
      } catch {
        // Preserve the original database error.
      }
    }

    return next(error);
  } finally {
    if (connection) {
      connection.release();
    }
  }
}

module.exports = {
  listEvents,
  listMyRegistrations,
  registerForEvent,
  cancelRegistration,
  createEvent,
  updateEvent,
  deleteEvent
};