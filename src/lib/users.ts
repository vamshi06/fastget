import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
import { randomBytes } from 'crypto';
import { User, UserAddress, AddressType, UserRole } from '@/types';
import { logger } from '@/lib/logger';

/**
 * User management CRUD operations
 * Handles authentication, user profiles, and address management
 */

// Bcrypt work factor (higher = slower but more secure, 10-12 recommended)
const BCRYPT_ROUNDS = 12;

const databaseUrl = process.env.DATABASE_URL || process.env.fastget_DATABASE_URL;

function getClient() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  return neon(databaseUrl);
}

function getUnpooledClient() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  const unpooledUrl = databaseUrl.replace('-pooler', '');
  return neon(unpooledUrl);
}

/**
 * Database interface for raw user row
 */
export interface DbUser {
  id: string;
  name: string;
  email: string;
  password_hash: string | null;
  phone: string;
  role: UserRole;
  preferred_address_id: string | null;
  last_order_at: Date | null;
  created_at: Date;
  updated_at: Date;
  // Email verification fields (added in migration 009)
  email_verified: boolean;
  email_verified_at: Date | null;
  verification_token: string | null;
  verification_token_expiry: Date | null;
  reset_password_token: string | null;
  reset_password_token_expiry: Date | null;
  resend_verification_at: Date | null;
}

/**
 * Database interface for raw address row
 */
export interface DbUserAddress {
  id: string;
  user_id: string;
  type: AddressType;
  street: string;
  landmark: string | null;
  city: string;
  phone: string;
  is_primary: boolean;
  created_at: Date;
}

// ============================================================================
// Password Hashing Utilities
// ============================================================================

/**
 * Hash a plaintext password using bcrypt.
 * @param plaintext - The raw password to hash
 * @returns Hashed password string
 */
export async function hashPassword(plaintext: string): Promise<string> {
  try {
    return await bcrypt.hash(plaintext, BCRYPT_ROUNDS);
  } catch (error) {
    logger.error('Users', 'bcrypt hash failed', { error: error instanceof Error ? error.message : String(error) });
    throw new Error('Password hashing failed');
  }
}

/**
 * Verify a plaintext password against a bcrypt hash.
 * @param plaintext - The raw password to verify
 * @param hash - The bcrypt hash to compare against
 * @returns true if password matches, false otherwise
 */
export async function verifyPassword(plaintext: string, hash: string): Promise<boolean> {
  try {
    return await bcrypt.compare(plaintext, hash);
  } catch (error) {
    logger.error('Users', 'bcrypt verify failed', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Create a new user account.
 * Optionally with a primary address.
 */
export async function createUser(
  email: string,
  phone: string,
  role: UserRole = 'customer',
  plainPassword?: string,
  name?: string,
  emailVerified: boolean = true,
): Promise<User | null> {
  const sql = getClient();
  try {
    let passwordHash = null;
    if (plainPassword) {
      passwordHash = await hashPassword(plainPassword);
    }

    const result = await sql`
      INSERT INTO users (name, email, phone, role, password_hash, email_verified)
      VALUES (${name || 'User'}, ${email}, ${phone}, ${role}, ${passwordHash || null}, ${emailVerified})
      RETURNING *
    `;

    if (result.length === 0) return null;
    return dbUserToUser(result[0] as DbUser);
  } catch (error) {
    logger.error('Users', 'Failed to create user', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Get user by email (case-insensitive).
 */
export async function getUserByEmail(email: string): Promise<User | null> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT * FROM users
      WHERE LOWER(email) = LOWER(${email})
      LIMIT 1
    `;

    if (result.length === 0) return null;
    return dbUserToUser(result[0] as DbUser);
  } catch (error) {
    logger.error('Users', 'Failed to get user by email', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Get user by ID.
 */
export async function getUserById(userId: string): Promise<User | null> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT * FROM users WHERE id = ${userId} LIMIT 1
    `;

    if (result.length === 0) return null;
    return dbUserToUser(result[0] as DbUser);
  } catch (error) {
    logger.error('Users', 'Failed to get user by ID', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Update user password hash.
 * Accepts plaintext password and hashes it before storing.
 */
export async function updateUserPassword(
  userId: string,
  plainPassword: string
): Promise<boolean> {
  const sql = getClient();
  try {
    const passwordHash = await hashPassword(plainPassword);

    const result = await sql`
      UPDATE users
      SET password_hash = ${passwordHash}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}
      RETURNING id
    `;

    return result.length > 0;
  } catch (error) {
    logger.error('Users', 'Failed to update user password', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Get user by phone number (last 10 digits, strips country code).
 */
export async function getUserByPhone(phone: string): Promise<User | null> {
  const sql = getUnpooledClient();
  try {
    const digits = phone.replace(/\D/g, '').slice(-10);
    const result = await sql`
      SELECT * FROM users
      WHERE RIGHT(REGEXP_REPLACE(phone, '[^0-9]', '', 'g'), 10) = ${digits}
      LIMIT 1
    `;
    if (result.length === 0) return null;
    return dbUserToUser(result[0] as DbUser);
  } catch (error) {
    logger.error('Users', 'Failed to get user by phone', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Authenticate a user with phone number and password.
 */
export async function authenticateUserByPhone(
  phone: string,
  plainPassword: string
): Promise<User | null> {
  try {
    const user = await getUserByPhone(phone);
    if (!user || !user.passwordHash) return null;
    const isValid = await verifyPassword(plainPassword, user.passwordHash);
    if (!isValid) return null;
    return user;
  } catch (error) {
    logger.error('Users', 'Failed to authenticate user by phone', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Authenticate a user with email and password.
 * Returns user object if credentials are valid, null otherwise.
 */
export async function authenticateUser(
  email: string,
  plainPassword: string
): Promise<User | null> {
  try {
    // Get user by email
    const user = await getUserByEmail(email);

    if (!user || !user.passwordHash) {
      // User not found or no password set
      return null;
    }

    // Verify password
    const isValid = await verifyPassword(plainPassword, user.passwordHash);

    if (!isValid) {
      return null;
    }

    return user;
  } catch (error) {
    logger.error('Users', 'Failed to authenticate user', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Update user's preferred address.
 */
export async function updatePreferredAddress(
  userId: string,
  addressId: string
): Promise<boolean> {
  const sql = getClient();
  try {
    const result = await sql`
      UPDATE users
      SET preferred_address_id = ${addressId}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}
      RETURNING id
    `;

    return result.length > 0;
  } catch (error) {
    logger.error('Users', 'Failed to update preferred address', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Update user's last order timestamp.
 */
export async function updateLastOrderTime(userId: string): Promise<boolean> {
  const sql = getClient();
  try {
    const result = await sql`
      UPDATE users
      SET last_order_at = CURRENT_TIMESTAMP, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}
      RETURNING id
    `;

    return result.length > 0;
  } catch (error) {
    logger.error('Users', 'Failed to update last order time', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Create a new address for a user.
 */
export async function createUserAddress(
  userId: string,
  type: AddressType,
  street: string,
  city: string,
  phone: string,
  landmark?: string,
  isPrimary: boolean = false
): Promise<UserAddress | null> {
  const sql = getClient();
  try {
    // If setting as primary, unset other primaries for this user
    if (isPrimary) {
      await sql`
        UPDATE user_addresses
        SET is_primary = false
        WHERE user_id = ${userId}
      `;
    }

    const result = await sql`
      INSERT INTO user_addresses (user_id, type, street, landmark, city, phone, is_primary)
      VALUES (${userId}, ${type}, ${street}, ${landmark || null}, ${city}, ${phone}, ${isPrimary})
      RETURNING *
    `;

    if (result.length === 0) return null;
    return dbAddressToUserAddress(result[0] as DbUserAddress);
  } catch (error) {
    logger.error('Users', 'Failed to create user address', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Get all addresses for a user.
 */
export async function getUserAddresses(userId: string): Promise<UserAddress[]> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT * FROM user_addresses
      WHERE user_id = ${userId}
      ORDER BY is_primary DESC, created_at DESC
    `;

    return (result as DbUserAddress[]).map(dbAddressToUserAddress);
  } catch (error) {
    logger.error('Users', 'Failed to get user addresses', { error: error instanceof Error ? error.message : String(error) });
    return [];
  }
}

/**
 * Get primary address for a user.
 */
export async function getPrimaryAddress(userId: string): Promise<UserAddress | null> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT * FROM user_addresses
      WHERE user_id = ${userId} AND is_primary = true
      LIMIT 1
    `;

    if (result.length === 0) return null;
    return dbAddressToUserAddress(result[0] as DbUserAddress);
  } catch (error) {
    logger.error('Users', 'Failed to get primary address', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Update a user's address.
 */
export async function updateUserAddress(
  addressId: string,
  userId: string,
  updates: {
    type?: AddressType;
    street?: string;
    landmark?: string;
    city?: string;
    phone?: string;
  }
): Promise<UserAddress | null> {
  const sql = getClient();
  try {
    const result = await sql`
      UPDATE user_addresses
      SET 
        type = COALESCE(${updates.type}, type),
        street = COALESCE(${updates.street}, street),
        landmark = COALESCE(${updates.landmark}, landmark),
        city = COALESCE(${updates.city}, city),
        phone = COALESCE(${updates.phone}, phone)
      WHERE id = ${addressId} AND user_id = ${userId}
      RETURNING *
    `;

    if (result.length === 0) return null;
    return dbAddressToUserAddress(result[0] as DbUserAddress);
  } catch (error) {
    logger.error('Users', 'Failed to update user address', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Delete a user's address.
 */
export async function deleteUserAddress(addressId: string, userId: string): Promise<boolean> {
  const sql = getClient();
  try {
    const result = await sql`
      DELETE FROM user_addresses
      WHERE id = ${addressId} AND user_id = ${userId}
      RETURNING id
    `;

    return result.length > 0;
  } catch (error) {
    logger.error('Users', 'Failed to delete user address', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Delete a user account and all associated data.
 *
 * Runs as a single transaction (L2): addresses and wishlists are removed
 * explicitly (and also cascade via their ON DELETE CASCADE FKs), while orders
 * keep their history with user_id set NULL (ON DELETE SET NULL). The user
 * DELETE's RETURNING tells us authoritatively whether the account existed, so
 * the old setTimeout + unpooled re-read verification hack is gone.
 */
export async function deleteUser(userId: string): Promise<boolean> {
  const sql = getClient();
  try {
    const results = await sql.transaction([
      sql`DELETE FROM wishlists WHERE user_id = ${userId}`,
      sql`DELETE FROM user_addresses WHERE user_id = ${userId}`,
      sql`DELETE FROM users WHERE id = ${userId} RETURNING id`,
    ]);
    const userRows = results[results.length - 1] as { id: string }[];
    return userRows.length > 0;
  } catch (error) {
    logger.error('Users', 'Failed to delete user', { userId, error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Convert database user row to User interface.
 */
function dbUserToUser(dbUser: DbUser): User {
  return {
    id: dbUser.id,
    name: dbUser.name,
    email: dbUser.email,
    passwordHash: dbUser.password_hash || undefined,
    phone: dbUser.phone,
    role: dbUser.role,
    preferredAddressId: dbUser.preferred_address_id || undefined,
    lastOrderAt: dbUser.last_order_at
      ? dbUser.last_order_at instanceof Date
        ? dbUser.last_order_at.toISOString()
        : String(dbUser.last_order_at)
      : undefined,
    createdAt:
      dbUser.created_at instanceof Date
        ? dbUser.created_at.toISOString()
        : String(dbUser.created_at),
    updatedAt:
      dbUser.updated_at instanceof Date
        ? dbUser.updated_at.toISOString()
        : String(dbUser.updated_at),
    // email_verified defaults to true when column doesn't exist yet (migration safety)
    emailVerified: dbUser.email_verified ?? true,
    emailVerifiedAt: dbUser.email_verified_at
      ? dbUser.email_verified_at instanceof Date
        ? dbUser.email_verified_at.toISOString()
        : String(dbUser.email_verified_at)
      : undefined,
  };
}

// ============================================================================
// Email Verification Utilities
// ============================================================================

function generateSecureToken(): string {
  return randomBytes(32).toString('hex');
}

function generateOtp(): string {
  return (100000 + (randomBytes(3).readUIntBE(0, 3) % 900000)).toString();
}

/**
 * Get a raw DB user row including sensitive token fields (for auth operations only).
 */
async function getRawDbUser(userId: string): Promise<DbUser | null> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`SELECT * FROM users WHERE id = ${userId} LIMIT 1`;
    if (result.length === 0) return null;
    return result[0] as DbUser;
  } catch (error) {
    logger.error('Users', 'Failed to get raw DB user', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Store a new verification token for a user (replaces any existing token).
 * Expiry is 24 hours from now.
 */
export async function setVerificationToken(
  userId: string,
): Promise<string | null> {
  const sql = getClient();
  try {
    const token = generateSecureToken();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const result = await sql`
      UPDATE users
      SET verification_token = ${token},
          verification_token_expiry = ${expiry.toISOString()},
          resend_verification_at = NOW(),
          updated_at = NOW()
      WHERE id = ${userId}
      RETURNING id
    `;
    if (result.length === 0) {
      logger.error('Users', 'setVerificationToken — UPDATE matched 0 rows', { userId });
      return null;
    }
    return token;
  } catch (error) {
    logger.error('Users', 'Failed to set verification token', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Generate and store a 6-digit OTP for email verification.
 * Expiry is 10 minutes from now.
 */
export async function setVerificationOtp(userId: string): Promise<string | null> {
  const sql = getClient();
  try {
    const otp = generateOtp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const result = await sql`
      UPDATE users
      SET verification_token = ${otp},
          verification_token_expiry = ${expiry.toISOString()},
          resend_verification_at = NOW(),
          updated_at = NOW()
      WHERE id = ${userId}
      RETURNING id
    `;
    if (result.length === 0) {
      logger.error('Users', 'setVerificationOtp — UPDATE matched 0 rows', { userId });
      return null;
    }
    return otp;
  } catch (error) {
    logger.error('Users', 'Failed to set verification OTP', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Verify a user's email by matching OTP against their email address.
 * Clears the OTP after successful verification.
 */
export async function verifyUserEmailByOtp(email: string, otp: string): Promise<User | null> {
  const sql = getClient();
  try {
    const result = await sql`
      UPDATE users
      SET email_verified = true,
          email_verified_at = NOW(),
          verification_token = NULL,
          verification_token_expiry = NULL,
          updated_at = NOW()
      WHERE LOWER(email) = LOWER(${email})
        AND verification_token = ${otp}
        AND verification_token_expiry > NOW()
      RETURNING *
    `;
    if (result.length === 0) return null;
    return dbUserToUser(result[0] as DbUser);
  } catch (error) {
    logger.error('Users', 'Failed to verify user email by OTP', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Look up a user by their verification token and verify the token is not expired.
 * Returns the User if valid, null otherwise.
 */
export async function getUserByVerificationToken(token: string): Promise<User | null> {
  const sql = getUnpooledClient();
  try {
    const result = await sql`
      SELECT * FROM users
      WHERE verification_token = ${token}
        AND verification_token_expiry > NOW()
      LIMIT 1
    `;
    if (result.length === 0) return null;
    return dbUserToUser(result[0] as DbUser);
  } catch (error) {
    logger.error('Users', 'Failed to get user by verification token', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Mark a user's email as verified and clear the verification token.
 */
export async function verifyUserEmail(token: string): Promise<User | null> {
  const sql = getClient();
  try {
    const result = await sql`
      UPDATE users
      SET email_verified = true,
          email_verified_at = NOW(),
          verification_token = NULL,
          verification_token_expiry = NULL,
          updated_at = NOW()
      WHERE verification_token = ${token}
        AND verification_token_expiry > NOW()
      RETURNING *
    `;
    if (result.length === 0) return null;
    return dbUserToUser(result[0] as DbUser);
  } catch (error) {
    logger.error('Users', 'Failed to verify user email', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Check if resend is rate-limited (1 resend per 60 seconds).
 */
export async function canResendVerification(userId: string): Promise<boolean> {
  const raw = await getRawDbUser(userId);
  if (!raw) return false;
  if (!raw.resend_verification_at) return true;
  const last = raw.resend_verification_at instanceof Date
    ? raw.resend_verification_at.getTime()
    : new Date(String(raw.resend_verification_at)).getTime();
  return Date.now() - last > 60_000;
}

/**
 * Get a user by email with full DB row (for auth ops that need emailVerified state).
 */
export async function getUserByEmailFull(email: string): Promise<User | null> {
  return getUserByEmail(email);
}

// ============================================================================
// Password Reset Utilities
// ============================================================================

/**
 * Generate and store a 6-digit OTP for password reset.
 * Expiry is 10 minutes from now.
 */
export async function setResetPasswordOtp(userId: string): Promise<string | null> {
  const sql = getClient();
  try {
    const otp = generateOtp();
    const expiry = new Date(Date.now() + 10 * 60 * 1000); // 10 minutes
    const result = await sql`
      UPDATE users
      SET reset_password_token = ${otp},
          reset_password_token_expiry = ${expiry.toISOString()},
          updated_at = NOW()
      WHERE id = ${userId}
      RETURNING id
    `;
    if (result.length === 0) {
      logger.error('Users', 'setResetPasswordOtp — UPDATE matched 0 rows', { userId });
      return null;
    }
    return otp;
  } catch (error) {
    logger.error('Users', 'Failed to set reset password OTP', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Verify a reset OTP by email + OTP, then exchange it for a proper reset token.
 * Returns the reset token on success, null if OTP is invalid/expired.
 */
export async function verifyResetOtp(email: string, otp: string): Promise<string | null> {
  const sql = getClient();
  try {
    // Check OTP is valid first
    const check = await sql`
      SELECT id FROM users
      WHERE LOWER(email) = LOWER(${email})
        AND reset_password_token = ${otp}
        AND reset_password_token_expiry > NOW()
      LIMIT 1
    `;
    if (check.length === 0) return null;

    // Exchange OTP for a proper reset token (24h) so the reset-password page works unchanged
    const token = generateSecureToken();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000);
    await sql`
      UPDATE users
      SET reset_password_token = ${token},
          reset_password_token_expiry = ${expiry.toISOString()},
          updated_at = NOW()
      WHERE id = ${check[0].id}
    `;
    return token;
  } catch (error) {
    logger.error('Users', 'Failed to verify reset OTP', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Generate and store a password reset token for a user.
 * Expiry is 1 hour from now.
 */
export async function setResetPasswordToken(userId: string): Promise<string | null> {
  const sql = getClient();
  try {
    const token = generateSecureToken();
    const expiry = new Date(Date.now() + 24 * 60 * 60 * 1000); // 24 hours
    const result = await sql`
      UPDATE users
      SET reset_password_token = ${token},
          reset_password_token_expiry = ${expiry.toISOString()},
          updated_at = NOW()
      WHERE id = ${userId}
      RETURNING id
    `;
    if (result.length === 0) {
      logger.error('Users', 'setResetPasswordToken — UPDATE matched 0 rows', { userId });
      return null;
    }
    logger.debug('Users', 'setResetPasswordToken — stored', { prefix: token.slice(0, 8), userId });
    return token;
  } catch (error) {
    logger.error('Users', 'Failed to set reset password token', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Look up a user by their password reset token, verifying it is not expired.
 */
export async function getUserByResetToken(token: string): Promise<User | null> {
  // Use the pooled client — same connection path as setResetPasswordToken writes.
  // The unpooled (direct) endpoint can lag behind the pooler for freshly committed rows.
  const sql = getClient();
  try {
    logger.debug('Users', 'getUserByResetToken — looking up token', { prefix: token.slice(0, 8) });
    const result = await sql`
      SELECT * FROM users
      WHERE reset_password_token = ${token}
        AND reset_password_token_expiry > NOW()
      LIMIT 1
    `;
    if (result.length === 0) {
      const anyMatch = await sql`
        SELECT reset_password_token_expiry
        FROM users
        WHERE reset_password_token = ${token}
        LIMIT 1
      `;
      if (anyMatch.length > 0) {
        logger.warn('Users', 'getUserByResetToken — token found but EXPIRED', {
          expiry: anyMatch[0].reset_password_token_expiry,
        });
      } else {
        logger.warn('Users', 'getUserByResetToken — token NOT FOUND in DB (never stored, already used, or overwritten)', {
          prefix: token.slice(0, 8),
        });
      }
      return null;
    }
    return dbUserToUser(result[0] as DbUser);
  } catch (error) {
    logger.error('Users', 'Failed to get user by reset token', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Reset a user's password using a valid reset token.
 * Clears the token after successful update.
 */
export async function resetUserPasswordByToken(
  token: string,
  newPassword: string,
): Promise<User | null> {
  const sql = getClient();
  try {
    const passwordHash = await hashPassword(newPassword);
    const result = await sql`
      UPDATE users
      SET password_hash = ${passwordHash},
          reset_password_token = NULL,
          reset_password_token_expiry = NULL,
          updated_at = NOW()
      WHERE reset_password_token = ${token}
        AND reset_password_token_expiry > NOW()
      RETURNING *
    `;
    if (result.length === 0) return null;
    return dbUserToUser(result[0] as DbUser);
  } catch (error) {
    logger.error('Users', 'Failed to reset user password', { error: error instanceof Error ? error.message : String(error) });
    return null;
  }
}

/**
 * Set one address as primary for a user (unsets all others).
 */
export async function setPrimaryAddress(userId: string, addressId: string): Promise<boolean> {
  const sql = getClient();
  try {
    await sql`UPDATE user_addresses SET is_primary = false WHERE user_id = ${userId}`;
    const result = await sql`
      UPDATE user_addresses
      SET is_primary = true
      WHERE id = ${addressId} AND user_id = ${userId}
      RETURNING id
    `;
    if (result.length === 0) return false;
    await sql`
      UPDATE users
      SET preferred_address_id = ${addressId}, updated_at = CURRENT_TIMESTAMP
      WHERE id = ${userId}
    `;
    return true;
  } catch (error) {
    logger.error('Users', 'Failed to set primary address', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Convert database address row to UserAddress interface.
 */
function dbAddressToUserAddress(dbAddr: DbUserAddress): UserAddress {
  return {
    id: dbAddr.id,
    userId: dbAddr.user_id,
    type: dbAddr.type,
    street: dbAddr.street,
    landmark: dbAddr.landmark || undefined,
    city: dbAddr.city,
    phone: dbAddr.phone,
    isPrimary: dbAddr.is_primary,
    createdAt:
      dbAddr.created_at instanceof Date
        ? dbAddr.created_at.toISOString()
        : String(dbAddr.created_at),
  };
}
