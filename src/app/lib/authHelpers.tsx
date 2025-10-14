/**
 * Authentication Helper - Google OAuth Detection
 * Reusable utility to detect Google OAuth users vs credentials users
 */

/**
 * Check if a password string is a valid bcrypt hash
 * Bcrypt hashes always start with $2a$, $2b$, or $2y$ and are 60 characters long
 *
 * Google OAuth users have non-bcrypt passwords (random strings)
 * Credentials users have bcrypt hashed passwords
 *
 * @param password - The password string to check
 * @returns true if the password is a bcrypt hash (credentials user), false if not (Google OAuth user)
 */
export function isBcryptHash(password: string): boolean {
  return /^\$2[ayb]\$.{56}$/.test(password);
}

/**
 * Check if a user is a Google OAuth user (password is not a bcrypt hash)
 *
 * @param password - The password string to check
 * @returns true if the user is a Google OAuth user, false otherwise
 */
export function isGoogleOAuthUser(password: string): boolean {
  return !isBcryptHash(password);
}

/**
 * Generate a secure random password for OAuth users
 * This password cannot be guessed and prevents authentication bypass
 *
 * @returns A cryptographically secure random string (64 characters hex)
 */
export function generateSecureRandomPassword(): string {
  const crypto = require('crypto');
  return crypto.randomBytes(32).toString('hex');
}
