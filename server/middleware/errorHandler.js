'use strict';

const DEFAULT_MESSAGES = {
  400: 'Invalid request.',
  401: 'Authentication required.',
  403: 'You do not have permission to perform this action.',
  404: 'Resource not found.',
  405: 'Method not allowed.',
  409: 'The request conflicts with the current resource state.',
  413: 'Request body is too large.',
  415: 'Unsupported media type.',
  422: 'The submitted data is invalid.',
  429: 'Too many requests. Please try again later.',
  500: 'Internal server error.',
  502: 'Service temporarily unavailable.',
  503: 'Service temporarily unavailable.',
  504: 'Service temporarily unavailable.'
};

const ERROR_CODES = {
  400: 'BAD_REQUEST',
  401: 'UNAUTHORIZED',
  403: 'FORBIDDEN',
  404: 'NOT_FOUND',
  405: 'METHOD_NOT_ALLOWED',
  409: 'CONFLICT',
  413: 'PAYLOAD_TOO_LARGE',
  415: 'UNSUPPORTED_MEDIA_TYPE',
  422: 'VALIDATION_ERROR',
  429: 'TOO_MANY_REQUESTS',
  500: 'INTERNAL_SERVER_ERROR',
  502: 'BAD_GATEWAY',
  503: 'SERVICE_UNAVAILABLE',
  504: 'GATEWAY_TIMEOUT'
};

const SENSITIVE_PATTERN =
  /\b(?:password|passwd|password_hash|secret|session(?:id)?|connect\.sid|cookie|authorization|private[\s_-]*key|certificate|bearer|sqlstate|mysql|database|db_password|db_user)\b|-----BEGIN [A-Z ]+-----|(?:\/[\w.-]+){2,}\.(?:crt|key|pem)|\bER_[A-Z0-9_]+\b/i;

const SQL_PATTERN =
  /\b(?:SELECT\b[\s\S]*\bFROM|INSERT\b[\s\S]*\bINTO|UPDATE\b[\s\S]*\bSET|DELETE\b[\s\S]*\bFROM|DROP\s+(?:TABLE|DATABASE)|ALTER\s+TABLE|CREATE\s+(?:TABLE|DATABASE)|SQL\s+syntax|unknown\s+column|duplicate\s+entry)\b/i;

function normaliseStatus(error) {
  const candidate = Number(error && (error.statusCode || error.status));

  if (Number.isInteger(candidate) && candidate >= 400 && candidate <= 599) {
    return candidate;
  }

  return 500;
}

function isDatabaseError(error) {
  if (!error || typeof error !== 'object') {
    return false;
  }

  return Boolean(
    error.sql ||
    error.sqlMessage ||
    error.sqlState ||
    (typeof error.code === 'string' && error.code.startsWith('ER_'))
  );
}

function isDuplicateDatabaseError(error) {
  return Boolean(
    error &&
      (error.code === 'ER_DUP_ENTRY' ||
        error.errno === 1062 ||
        error.code === 'ER_DUP_KEY')
  );
}

function containsSensitiveInformation(value) {
  if (typeof value !== 'string') {
    return false;
  }

  return SENSITIVE_PATTERN.test(value) || SQL_PATTERN.test(value);
}

function safeClientMessage(value, fallback) {
  if (typeof value !== 'string') {
    return fallback;
  }

  const message = value.replace(/[\u0000-\u001F\u007F]+/g, ' ').trim();

  if (
    !message ||
    message.length > 240 ||
    containsSensitiveInformation(message)
  ) {
    return fallback;
  }

  return message;
}

function errorCodeForStatus(status) {
  return ERROR_CODES[status] || (status >= 500 ? 'SERVER_ERROR' : 'REQUEST_ERROR');
}

function logServerError(error, status, code) {
  if (status < 500) {
    return;
  }

  const entry = {
    status,
    code,
    name:
      error && typeof error.name === 'string'
        ? safeClientMessage(error.name, 'Error')
        : 'Error'
  };

  if (process.env.NODE_ENV !== 'production') {
    const diagnostic =
      error && typeof error.message === 'string'
        ? error.message.replace(/[\u0000-\u001F\u007F]+/g, ' ').trim()
        : '';

    entry.message =
      diagnostic && !containsSensitiveInformation(diagnostic)
        ? diagnostic.slice(0, 240)
        : '[redacted]';
  }

  console.error('[api-error]', entry);
}

function notFound(req, res) {
  return res.status(404).json({
    error: 'Route not found.',
    code: 'NOT_FOUND'
  });
}

function errorHandler(error, req, res, next) {
  if (res.headersSent) {
    return next(error);
  }

  let status = normaliseStatus(error);
  let message;
  let code;

  if (
    error &&
    (error.type === 'entity.parse.failed' ||
      (error instanceof SyntaxError && Object.prototype.hasOwnProperty.call(error, 'body')))
  ) {
    status = 400;
    message = 'Invalid JSON request body.';
    code = 'INVALID_JSON';
  } else if (error && error.type === 'entity.too.large') {
    status = 413;
    message = DEFAULT_MESSAGES[413];
    code = 'PAYLOAD_TOO_LARGE';
  } else if (isDuplicateDatabaseError(error)) {
    status = 409;
    message = 'A record with those details already exists.';
    code = 'CONFLICT';
  } else if (isDatabaseError(error)) {
    status = 500;
    message = DEFAULT_MESSAGES[500];
    code = 'DATABASE_ERROR';
  } else if (status >= 500) {
    message = DEFAULT_MESSAGES[status] || DEFAULT_MESSAGES[500];
    code = errorCodeForStatus(status);
  } else {
    const fallback = DEFAULT_MESSAGES[status] || 'The request could not be completed.';
    message = safeClientMessage(error && error.message, fallback);
    code = errorCodeForStatus(status);
  }

  logServerError(error, status, code);

  return res.status(status).json({
    error: message,
    code
  });
}

module.exports = {
  notFound,
  errorHandler
};