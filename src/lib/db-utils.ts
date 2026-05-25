/**
 * Database Utility Functions
 * 
 * Helpers for managing connection pooling, caching, and transaction issues
 * 
 * @module lib/db-utils
 */

import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.DATABASE_URL || process.env.fastget_DATABASE_URL;

/**
 * Force a fresh database connection by creating a new client instance.
 * Use this when you suspect connection pooling is causing stale data issues.
 * 
 * @returns A fresh SQL client instance
 */
export function getFreshConnection() {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  // Always use unpooled (direct primary) for fresh connections
  const unpooledUrl = databaseUrl.replace('-pooler', '');
  
  // Create a new client instance each time to bypass any caching
  return neon(unpooledUrl);
}

/**
 * Verify a record exists in the database using a fresh connection.
 * This bypasses any application-level or connection-level caching.
 * 
 * @param table - The table name
 * @param id - The record ID
 * @returns true if the record exists, false otherwise
 */
export async function verifyRecordExists(table: string, id: string): Promise<boolean> {
  const sql = getFreshConnection();
  
  try {
    // Validate table name to prevent SQL injection
    const validTables = ['users', 'orders', 'products', 'categories', 'user_addresses', 'product_variants', 'wishlists'];
    if (!validTables.includes(table)) {
      throw new Error(`Invalid table name: ${table}`);
    }
    
    // Use template literal with validated table name
    const result = await sql([`SELECT 1 FROM ${table} WHERE id = `, ` LIMIT 1`] as any, id);
    return result.length > 0;
  } catch (error) {
    console.error(`Error verifying record in ${table}:`, error);
    return false;
  }
}

/**
 * Execute a query with explicit transaction control.
 * Ensures the transaction is properly committed.
 * 
 * @param callback - Function that receives a SQL client and performs operations
 * @returns The result of the callback
 */
export async function withTransaction<T>(
  callback: (sql: any) => Promise<T>
): Promise<T> {
  const sql = getFreshConnection();
  
  try {
    // Begin transaction
    await sql`BEGIN`;
    
    // Execute callback
    const result = await callback(sql);
    
    // Commit transaction
    await sql`COMMIT`;
    
    return result;
  } catch (error) {
    // Rollback on error
    try {
      await sql`ROLLBACK`;
    } catch (rollbackError) {
      console.error('Error rolling back transaction:', rollbackError);
    }
    throw error;
  }
}

/**
 * Check if there are any uncommitted transactions in the database.
 * Useful for debugging transaction isolation issues.
 * 
 * @returns Array of uncommitted transaction info
 */
export async function checkUncommittedTransactions() {
  const sql = getFreshConnection();
  
  try {
    const result = await sql`
      SELECT 
        pid,
        usename,
        application_name,
        state,
        query_start,
        state_change,
        query
      FROM pg_stat_activity
      WHERE state IN ('idle in transaction', 'active')
        AND datname = current_database()
      ORDER BY query_start
    `;
    
    return result;
  } catch (error) {
    console.error('Error checking uncommitted transactions:', error);
    return [];
  }
}

/**
 * Get connection pool statistics.
 * Helps identify connection pooling issues.
 * 
 * @returns Connection pool statistics
 */
export async function getConnectionPoolStats() {
  const sql = getFreshConnection();
  
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total_connections,
        COUNT(*) FILTER (WHERE state = 'active') as active,
        COUNT(*) FILTER (WHERE state = 'idle') as idle,
        COUNT(*) FILTER (WHERE state = 'idle in transaction') as idle_in_transaction
      FROM pg_stat_activity
      WHERE datname = current_database()
    `;
    
    return result[0];
  } catch (error) {
    console.error('Error getting connection pool stats:', error);
    return null;
  }
}

/**
 * Compare results between pooled and unpooled connections.
 * Useful for detecting stale connection issues.
 * 
 * @param query - The query to execute
 * @returns Object with pooled and unpooled results
 */
export async function comparePooledVsUnpooled<T>(
  query: (sql: any) => Promise<T>
) {
  if (!databaseUrl) {
    throw new Error('DATABASE_URL environment variable is required');
  }
  
  const pooledSql = neon(databaseUrl);
  const unpooledSql = neon(databaseUrl.replace('-pooler', ''));
  
  const [pooledResult, unpooledResult] = await Promise.all([
    query(pooledSql),
    query(unpooledSql)
  ]);
  
  return {
    pooled: pooledResult,
    unpooled: unpooledResult,
    match: JSON.stringify(pooledResult) === JSON.stringify(unpooledResult)
  };
}

/**
 * Clear any server-side prepared statements.
 * Can help resolve some connection pooling issues.
 */
export async function clearPreparedStatements() {
  const sql = getFreshConnection();
  
  try {
    await sql`DEALLOCATE ALL`;
    console.log('✓ Cleared prepared statements');
  } catch (error) {
    console.error('Error clearing prepared statements:', error);
  }
}

/**
 * Terminate idle connections to force connection refresh.
 * Use with caution - only for troubleshooting.
 * 
 * @param maxIdleSeconds - Maximum idle time before terminating (default: 300)
 */
export async function terminateIdleConnections(maxIdleSeconds: number = 300) {
  const sql = getFreshConnection();
  
  try {
    const result = await sql`
      SELECT pg_terminate_backend(pid)
      FROM pg_stat_activity
      WHERE datname = current_database()
        AND state = 'idle'
        AND state_change < NOW() - INTERVAL '${maxIdleSeconds} seconds'
        AND pid != pg_backend_pid()
    `;
    
    console.log(`✓ Terminated ${result.length} idle connection(s)`);
    return result.length;
  } catch (error) {
    console.error('Error terminating idle connections:', error);
    return 0;
  }
}

/**
 * Simple in-memory cache with TTL support.
 * Use this for application-level caching with automatic expiration.
 */
export class SimpleCache<T> {
  private cache = new Map<string, { value: T; expires: number }>();
  
  constructor(private defaultTTL: number = 60000) {} // Default 60 seconds
  
  set(key: string, value: T, ttl?: number): void {
    const expires = Date.now() + (ttl || this.defaultTTL);
    this.cache.set(key, { value, expires });
  }
  
  get(key: string): T | null {
    const item = this.cache.get(key);
    
    if (!item) {
      return null;
    }
    
    if (Date.now() > item.expires) {
      this.cache.delete(key);
      return null;
    }
    
    return item.value;
  }
  
  delete(key: string): void {
    this.cache.delete(key);
  }
  
  clear(): void {
    this.cache.clear();
  }
  
  size(): number {
    // Clean expired entries first
    const now = Date.now();
    Array.from(this.cache.entries()).forEach(([key, item]) => {
      if (now > item.expires) {
        this.cache.delete(key);
      }
    });
    return this.cache.size;
  }
}

// Export a global cache instance for convenience
export const globalCache = new SimpleCache();

/**
 * Decorator to clear cache when a mutation occurs.
 * Use this to ensure cache is invalidated after database writes.
 */
export function clearCacheOnMutation(cacheKeys: string[]) {
  return function (
    target: any,
    propertyKey: string,
    descriptor: PropertyDescriptor
  ) {
    const originalMethod = descriptor.value;
    
    descriptor.value = async function (...args: any[]) {
      const result = await originalMethod.apply(this, args);
      
      // Clear specified cache keys after successful mutation
      cacheKeys.forEach(key => globalCache.delete(key));
      
      return result;
    };
    
    return descriptor;
  };
}
