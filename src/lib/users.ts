import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';
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
  name?: string
): Promise<User | null> {
  const sql = getClient();
  try {
    let passwordHash = null;

    // Hash password if provided
    if (plainPassword) {
      passwordHash = await hashPassword(plainPassword);
    }

    const result = await sql`
      INSERT INTO users (name, email, phone, role, password_hash)
      VALUES (${name || 'User'}, ${email}, ${phone}, ${role}, ${passwordHash || null})
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
  updates: {
    type?: AddressType;
    street?: string;
    landmark?: string;
    city?: string;
    phone?: string;
    isPrimary?: boolean;
  }
): Promise<UserAddress | null> {
  const sql = getClient();
  try {
    // Build dynamic update query
    const setClauses = [];
    const params: any[] = [];

    if (updates.type) {
      setClauses.push(`type = $${params.length + 1}`);
      params.push(updates.type);
    }
    if (updates.street) {
      setClauses.push(`street = $${params.length + 1}`);
      params.push(updates.street);
    }
    if (updates.landmark !== undefined) {
      setClauses.push(`landmark = $${params.length + 1}`);
      params.push(updates.landmark || null);
    }
    if (updates.city) {
      setClauses.push(`city = $${params.length + 1}`);
      params.push(updates.city);
    }
    if (updates.phone) {
      setClauses.push(`phone = $${params.length + 1}`);
      params.push(updates.phone);
    }

    if (setClauses.length === 0) return null;

    // Using neon sql template, we can't use dynamic params easily, so let's use a simpler approach
    const result = await sql`
      UPDATE user_addresses
      SET 
        type = COALESCE(${updates.type}, type),
        street = COALESCE(${updates.street}, street),
        landmark = COALESCE(${updates.landmark}, landmark),
        city = COALESCE(${updates.city}, city),
        phone = COALESCE(${updates.phone}, phone)
      WHERE id = ${addressId}
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
export async function deleteUserAddress(addressId: string): Promise<boolean> {
  const sql = getClient();
  try {
    const result = await sql`
      DELETE FROM user_addresses
      WHERE id = ${addressId}
      RETURNING id
    `;

    return result.length > 0;
  } catch (error) {
    logger.error('Users', 'Failed to delete user address', { error: error instanceof Error ? error.message : String(error) });
    return false;
  }
}

/**
 * Delete a user account (and all associated data).
 * Uses unpooled connection to ensure fresh reads after deletion.
 */
export async function deleteUser(userId: string): Promise<boolean> {
  const sql = getClient();
  const sqlUnpooled = getUnpooledClient();
  
  try {
    // Delete all user data in cascade order (respecting foreign keys)
    // 1. Delete wishlists for this user's variants (not needed - cascade handles it)
    // 2. Delete addresses
    await sql`DELETE FROM user_addresses WHERE user_id = ${userId}`;
    
    // 3. Delete user
    const result = await sql`
      DELETE FROM users
      WHERE id = ${userId}
      RETURNING id
    `;

    if (result.length === 0) return false;

    // Force fresh read from unpooled connection to verify deletion
    // This bypasses connection pooling cache
    await new Promise(resolve => setTimeout(resolve, 100));
    
    const verify = await sqlUnpooled`
      SELECT id FROM users WHERE id = ${userId} LIMIT 1
    `;

    const deleted = verify.length === 0;
    
    if (!deleted) {
      logger.warn('Users', 'User deletion verification failed — record still exists after delete', { userId });
    }

    return deleted;
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
  };
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
