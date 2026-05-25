# Database Connection & Caching Troubleshooting Guide

This guide helps you diagnose and resolve common database issues related to connection pooling, transaction isolation, and caching.

## Common Issues

### 1. Connection Pooling - Stale Data

**Symptom:** Your application shows data that was deleted or modified in the database.

**Cause:** Pooled connections may cache query results or hold onto old connection states.

**Solutions:**

#### A. Use Unpooled Connections for Critical Reads

The application already uses unpooled connections for most read operations. The `getUnpooledConnection()` function in `src/lib/db.ts` provides direct access to the primary database:

```typescript
import { getUnpooledConnection } from '@/lib/db';

const sql = getUnpooledConnection();
const result = await sql`SELECT * FROM users WHERE id = ${userId}`;
```

#### B. Restart Your Application

The simplest solution is to restart your application to refresh all connections:

```bash
# Stop the dev server (Ctrl+C)
# Then restart
npm run dev
```

#### C. Use Fresh Connections

For critical operations, use the `getFreshConnection()` utility:

```typescript
import { getFreshConnection } from '@/lib/db-utils';

const sql = getFreshConnection();
const result = await sql`SELECT * FROM users WHERE id = ${userId}`;
```

### 2. Transaction Isolation

**Symptom:** Changes made in one part of your application aren't visible in another part.

**Cause:** Uncommitted transactions or transaction isolation levels.

**Solutions:**

#### A. Ensure Transactions Are Committed

Always commit or rollback transactions explicitly:

```typescript
import { withTransaction } from '@/lib/db-utils';

await withTransaction(async (sql) => {
  await sql`INSERT INTO users (name, email, phone, role) VALUES (${name}, ${email}, ${phone}, 'customer')`;
  await sql`INSERT INTO user_addresses (user_id, street, city, phone, type) VALUES (${userId}, ${street}, ${city}, ${phone}, 'home')`;
  // Transaction is automatically committed
});
```

#### B. Check for Uncommitted Transactions

Use the verification script to check for uncommitted transactions:

```bash
node scripts/verify-db-state.mjs --check-transactions
```

Or programmatically:

```typescript
import { checkUncommittedTransactions } from '@/lib/db-utils';

const uncommitted = await checkUncommittedTransactions();
if (uncommitted.length > 0) {
  console.log('Found uncommitted transactions:', uncommitted);
}
```

### 3. Application-Level Caching

**Symptom:** Your application shows cached data even after database updates.

**Cause:** In-memory caching without proper invalidation.

**Solutions:**

#### A. Use the SimpleCache with TTL

```typescript
import { SimpleCache } from '@/lib/db-utils';

const userCache = new SimpleCache<User>(30000); // 30 second TTL

// Set cache
userCache.set(`user:${userId}`, userData);

// Get from cache
const cachedUser = userCache.get(`user:${userId}`);

// Clear specific key after mutation
userCache.delete(`user:${userId}`);

// Clear all cache
userCache.clear();
```

#### B. Clear Cache After Mutations

```typescript
import { globalCache } from '@/lib/db-utils';

// After deleting a user
await sql`DELETE FROM users WHERE id = ${userId}`;
globalCache.delete(`user:${userId}`);
globalCache.delete('users:all');
```

### 4. Multiple Database Connections

**Symptom:** Different parts of your application see different data.

**Cause:** Some connections point to read replicas or different computes.

**Solutions:**

#### A. Verify Connection URLs

Check your environment variables:

```bash
# .env.local
DATABASE_URL=postgresql://...@ep-xxx-pooler.neon.tech/neondb
```

Ensure all parts of your application use the same DATABASE_URL.

#### B. Compare Pooled vs Unpooled Results

```typescript
import { comparePooledVsUnpooled } from '@/lib/db-utils';

const comparison = await comparePooledVsUnpooled(async (sql) => {
  return await sql`SELECT * FROM users WHERE id = ${userId}`;
});

if (!comparison.match) {
  console.log('Mismatch detected!');
  console.log('Pooled:', comparison.pooled);
  console.log('Unpooled:', comparison.unpooled);
}
```

## Verification Tools

### 1. Verify Database State Script

This script helps you verify if a record actually exists in the database:

```bash
# Check if a specific record exists
node scripts/verify-db-state.mjs users <user-id>
node scripts/verify-db-state.mjs orders <order-id>

# Run all checks
node scripts/verify-db-state.mjs --check-all

# Test connection freshness
node scripts/verify-db-state.mjs --test-freshness

# Check for uncommitted transactions
node scripts/verify-db-state.mjs --check-transactions

# Check connection pool statistics
node scripts/verify-db-state.mjs --check-pool
```

### 2. Programmatic Verification

```typescript
import { verifyRecordExists, getConnectionPoolStats } from '@/lib/db-utils';

// Verify a record exists
const exists = await verifyRecordExists('users', userId);
console.log(`User ${userId} exists:`, exists);

// Get connection pool statistics
const stats = await getConnectionPoolStats();
console.log('Connection pool stats:', stats);
```

## Best Practices

### 1. Use Unpooled Connections for Writes

Always use unpooled connections for write operations to ensure consistency:

```typescript
import { getUnpooledConnection } from '@/lib/db';

const sql = getUnpooledConnection();
await sql`DELETE FROM users WHERE id = ${userId}`;
```

### 2. Use Unpooled Connections for Critical Reads

For reads that must be fresh (e.g., after a write), use unpooled connections:

```typescript
// After creating a user
await sql`INSERT INTO users ...`;

// Verify with unpooled connection
const sqlUnpooled = getUnpooledConnection();
const user = await sqlUnpooled`SELECT * FROM users WHERE id = ${userId}`;
```

### 3. Implement Cache Invalidation

Always invalidate cache after mutations:

```typescript
import { globalCache } from '@/lib/db-utils';

async function deleteUser(userId: string) {
  const sql = getUnpooledConnection();
  await sql`DELETE FROM users WHERE id = ${userId}`;
  
  // Invalidate cache
  globalCache.delete(`user:${userId}`);
  globalCache.delete('users:all');
}
```

### 4. Use Transactions for Multi-Step Operations

```typescript
import { withTransaction } from '@/lib/db-utils';

await withTransaction(async (sql) => {
  // All operations in this block are part of the same transaction
  await sql`INSERT INTO users ...`;
  await sql`INSERT INTO user_addresses ...`;
  // Automatically committed if successful, rolled back on error
});
```

### 5. Monitor Connection Pool

Regularly check connection pool health:

```typescript
import { getConnectionPoolStats } from '@/lib/db-utils';

const stats = await getConnectionPoolStats();
if (stats && stats.idle_in_transaction > 0) {
  console.warn('Warning: Idle transactions detected!');
}
```

## Quick Troubleshooting Checklist

When you encounter data inconsistency issues:

- [ ] **Verify the record was actually deleted** - Use `node scripts/verify-db-state.mjs <table> <id>`
- [ ] **Check for connection pooling issues** - Use `node scripts/verify-db-state.mjs --check-all`
- [ ] **Restart your application** - Stop and restart the dev server
- [ ] **Check for uncommitted transactions** - Use `node scripts/verify-db-state.mjs --check-transactions`
- [ ] **Clear application caches** - Use `globalCache.clear()`
- [ ] **Verify you're using unpooled connections** - Check your code uses `getUnpooledConnection()`
- [ ] **Check environment variables** - Ensure DATABASE_URL is correct

## Advanced Troubleshooting

### Terminate Idle Connections

⚠️ **Use with caution** - Only for troubleshooting:

```typescript
import { terminateIdleConnections } from '@/lib/db-utils';

// Terminate connections idle for more than 5 minutes
const terminated = await terminateIdleConnections(300);
console.log(`Terminated ${terminated} idle connections`);
```

### Clear Prepared Statements

```typescript
import { clearPreparedStatements } from '@/lib/db-utils';

await clearPreparedStatements();
```

## Getting Help

If you're still experiencing issues after trying these solutions:

1. Run the full diagnostic: `node scripts/verify-db-state.mjs --check-all`
2. Check the application logs for errors
3. Verify your Neon database status in the Neon console
4. Check if you're hitting connection limits

## Related Files

- `src/lib/db.ts` - Main database client and CRUD operations
- `src/lib/db-utils.ts` - Database utility functions
- `scripts/verify-db-state.mjs` - Database state verification script
- `.env.local` - Environment variables (DATABASE_URL)
