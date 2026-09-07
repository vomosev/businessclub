'use strict';

const session = require('express-session');

const DEFAULT_TTL_MS = 7 * 24 * 60 * 60 * 1000;
const DEFAULT_CLEANUP_INTERVAL_MS = 15 * 60 * 1000;

class MySQLSessionStore extends session.Store {
  constructor(poolOrOptions, storeOptions = {}) {
    super();

    let pool = poolOrOptions;
    let options = storeOptions;

    if (
      poolOrOptions &&
      typeof poolOrOptions === 'object' &&
      typeof poolOrOptions.execute !== 'function' &&
      poolOrOptions.pool
    ) {
      pool = poolOrOptions.pool;
      options = poolOrOptions;
    }

    if (!pool || typeof pool.execute !== 'function') {
      throw new TypeError(
        'MySQLSessionStore requires a mysql2/promise connection pool.'
      );
    }

    this.pool = pool;
    this.ttlMs = this.#positiveNumber(
      options.ttlMs ?? options.ttl,
      DEFAULT_TTL_MS
    );
    this.cleanupIntervalMs = this.#nonNegativeNumber(
      options.cleanupIntervalMs ?? options.cleanupInterval,
      DEFAULT_CLEANUP_INTERVAL_MS
    );
    this.cleanupTimer = null;

    if (this.cleanupIntervalMs > 0) {
      this.cleanupTimer = setInterval(() => {
        this.cleanupExpiredSessions().catch((error) => {
          if (this.listenerCount('error') > 0) {
            this.emit('error', error);
          } else {
            console.error('Failed to clean up expired sessions.');
          }
        });
      }, this.cleanupIntervalMs);

      if (typeof this.cleanupTimer.unref === 'function') {
        this.cleanupTimer.unref();
      }
    }
  }

  get(sessionId, callback) {
    const operation = (async () => {
      this.#validateSessionId(sessionId);

      const [rows] = await this.pool.execute(
        `SELECT \`data\`
           FROM \`sessions\`
          WHERE \`session_id\` = ?
            AND \`expires_at\` > CURRENT_TIMESTAMP
          LIMIT 1`,
        [sessionId]
      );

      if (!rows.length) {
        return null;
      }

      const storedData = rows[0].data;

      if (storedData === null || storedData === undefined) {
        return null;
      }

      if (Buffer.isBuffer(storedData)) {
        return JSON.parse(storedData.toString('utf8'));
      }

      if (typeof storedData === 'string') {
        return JSON.parse(storedData);
      }

      if (typeof storedData === 'object') {
        return storedData;
      }

      throw new TypeError('Stored session data is invalid.');
    })();

    return this.#complete(operation, callback, true);
  }

  set(sessionId, sessionData, callback) {
    const operation = (async () => {
      this.#validateSessionId(sessionId);

      if (!sessionData || typeof sessionData !== 'object') {
        throw new TypeError('Session data must be an object.');
      }

      const serializedData = JSON.stringify(sessionData);

      if (serializedData === undefined) {
        throw new TypeError('Session data could not be serialized.');
      }

      const expiresAt = this.#getExpirationDate(sessionData);

      await this.pool.execute(
        `INSERT INTO \`sessions\` (
           \`session_id\`,
           \`expires_at\`,
           \`data\`
         )
         VALUES (?, ?, ?)
         ON DUPLICATE KEY UPDATE
           \`expires_at\` = VALUES(\`expires_at\`),
           \`data\` = VALUES(\`data\`)`,
        [sessionId, expiresAt, serializedData]
      );
    })();

    return this.#complete(operation, callback, false);
  }

  destroy(sessionId, callback) {
    const operation = (async () => {
      this.#validateSessionId(sessionId);

      await this.pool.execute(
        'DELETE FROM `sessions` WHERE `session_id` = ?',
        [sessionId]
      );
    })();

    return this.#complete(operation, callback, false);
  }

  touch(sessionId, sessionData, callback) {
    const operation = (async () => {
      this.#validateSessionId(sessionId);

      const expiresAt = this.#getExpirationDate(sessionData);

      await this.pool.execute(
        `UPDATE \`sessions\`
            SET \`expires_at\` = ?
          WHERE \`session_id\` = ?`,
        [expiresAt, sessionId]
      );
    })();

    return this.#complete(operation, callback, false);
  }

  cleanupExpiredSessions(callback) {
    const operation = (async () => {
      const [result] = await this.pool.execute(
        'DELETE FROM `sessions` WHERE `expires_at` <= CURRENT_TIMESTAMP'
      );

      return Number(result.affectedRows) || 0;
    })();

    return this.#complete(operation, callback, true);
  }

  close(callback) {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
      this.cleanupTimer = null;
    }

    const operation = Promise.resolve();
    return this.#complete(operation, callback, false);
  }

  #getExpirationDate(sessionData) {
    const cookie =
      sessionData && typeof sessionData === 'object'
        ? sessionData.cookie
        : null;

    if (cookie && cookie.expires) {
      const expiresAt = new Date(cookie.expires);

      if (!Number.isNaN(expiresAt.getTime())) {
        return expiresAt;
      }
    }

    const maxAge = Number(cookie && cookie.maxAge);

    if (Number.isFinite(maxAge) && maxAge >= 0) {
      return new Date(Date.now() + maxAge);
    }

    const originalMaxAge = Number(cookie && cookie.originalMaxAge);

    if (Number.isFinite(originalMaxAge) && originalMaxAge >= 0) {
      return new Date(Date.now() + originalMaxAge);
    }

    return new Date(Date.now() + this.ttlMs);
  }

  #validateSessionId(sessionId) {
    if (typeof sessionId !== 'string' || sessionId.length === 0) {
      throw new TypeError('A valid session ID is required.');
    }
  }

  #complete(operation, callback, includeValue) {
    if (typeof callback === 'function') {
      operation.then(
        (value) => {
          this.#invokeCallback(
            callback,
            includeValue ? [null, value] : [null]
          );
        },
        (error) => {
          this.#invokeCallback(callback, [error]);
        }
      );
    }

    return operation;
  }

  #invokeCallback(callback, args) {
    try {
      callback(...args);
    } catch (error) {
      setImmediate(() => {
        throw error;
      });
    }
  }

  #positiveNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number > 0 ? number : fallback;
  }

  #nonNegativeNumber(value, fallback) {
    const number = Number(value);
    return Number.isFinite(number) && number >= 0 ? number : fallback;
  }
}

module.exports = MySQLSessionStore;
module.exports.MySQLSessionStore = MySQLSessionStore;