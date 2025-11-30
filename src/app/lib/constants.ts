// HTTP Status Codes
export const HTTP_STATUS = {
  SUCCESS: 200,
  CREATED: 201,
  NO_CONTENT: 204,
  BAD_REQUEST: 400,
  UNAUTHORIZED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  CONFLICT: 409,
  INTERNAL_SERVER_ERROR: 500,
  SERVICE_UNAVAILABLE: 503,
} as const;

// Role Types
export const ROLES = {
  ADMIN: 'admin',
  EMPLOYER: 'employer',
  EMPLOYEE: 'employee',
} as const;

// Log Levels
export const LOG_LEVELS = {
  ERROR: 'ERROR',
  WARN: 'WARN',
  INFO: 'INFO',
  DEBUG: 'DEBUG',
} as const;

// API Response Structure
export const API_RESPONSE = {
  DEFAULT_SUCCESS_MESSAGE: 'Request processed successfully',
  DEFAULT_ERROR_MESSAGE: 'An unexpected error occurred',
  DEFAULT_BAD_REQUEST_MESSAGE: 'Invalid request parameters',
  DEFAULT_UNAUTHORIZED_MESSAGE: 'Unauthorized access',
  DEFAULT_FORBIDDEN_MESSAGE: 'Access forbidden',
  DEFAULT_NOT_FOUND_MESSAGE: 'Resource not found',
} as const;

// Database Constants
export const DATABASE = {
  CONNECTION_RETRIES: 5,
  CONNECTION_RETRY_DELAY: 5000, // 5 seconds
  CONNECTION_TIMEOUT: 10000, // 10 seconds
} as const;

// Pagination
export const PAGINATION = {
  DEFAULT_PAGE: 1,
  DEFAULT_LIMIT: 10,
  MAX_LIMIT: 100,
} as const;

// Authentication
export const AUTH = {
  SESSION_EXPIRY: 24 * 60 * 60 * 1000, // 24 hours in milliseconds
  TOKEN_EXPIRY: 7 * 24 * 60 * 60 * 1000, // 7 days in milliseconds
  REFRESH_TOKEN_EXPIRY: 30 * 24 * 60 * 60 * 1000, // 30 days in milliseconds
} as const;

// Validation Error Messages
export const VALIDATION_MESSAGES = {
  INVALID_EMAIL: 'Invalid email format',
  REQUIRED_FIELD: 'This field is required',
  MIN_LENGTH: 'Value is too short',
  MAX_LENGTH: 'Value is too long',
  INVALID_FORMAT: 'Invalid format',
} as const;