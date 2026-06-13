/**
 * One-time script to create an admin user.
 *
 * Usage:
 *   npx tsx scripts/create-admin.ts <email> <phone> <password>
 *
 * Example:
 *   npx tsx scripts/create-admin.ts admin@fastget.in 9876543210 MySecret123
 */

import { readFileSync } from 'fs';
import { resolve } from 'path';
import { neon } from '@neondatabase/serverless';
import bcrypt from 'bcryptjs';

// Load .env.local so the script works without setting env vars manually
try {
  const envPath = resolve(process.cwd(), '.env.local');
  const lines = readFileSync(envPath, 'utf-8').split('\n');
  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) continue;
    const eq = trimmed.indexOf('=');
    if (eq === -1) continue;
    const key = trimmed.slice(0, eq).trim();
    const val = trimmed.slice(eq + 1).trim().replace(/^["']|["']$/g, '');
    if (!(key in process.env)) process.env[key] = val;
  }
} catch {
  // .env.local not found — rely on env vars already being set
}

const [,, email, phone, password] = process.argv;

if (!email || !phone || !password) {
  console.error('Usage: npx tsx scripts/create-admin.ts <email> <phone> <password>');
  process.exit(1);
}

const databaseUrl = process.env.DATABASE_URL || process.env.fastget_DATABASE_URL;
if (!databaseUrl) {
  console.error('Error: DATABASE_URL environment variable is not set.');
  process.exit(1);
}

const sql = neon(databaseUrl);

async function main() {
  const existing = await sql`SELECT id, role FROM users WHERE LOWER(email) = LOWER(${email}) LIMIT 1`;

  if (existing.length > 0) {
    const row = existing[0] as { id: string; role: string };
    if (row.role === 'admin') {
      console.log(`User ${email} already exists with role=admin. No changes made.`);
      return;
    }
    // Upgrade existing user to admin
    await sql`UPDATE users SET role = 'admin', updated_at = NOW() WHERE id = ${row.id}`;
    console.log(`Updated existing user ${email} to role=admin.`);
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  const result = await sql`
    INSERT INTO users (name, email, phone, role, password_hash)
    VALUES ('Admin', ${email.toLowerCase().trim()}, ${phone.trim()}, 'admin', ${passwordHash})
    RETURNING id, email, role
  `;

  const user = result[0] as { id: string; email: string; role: string };
  console.log(`Admin user created:`);
  console.log(`  id:    ${user.id}`);
  console.log(`  email: ${user.email}`);
  console.log(`  role:  ${user.role}`);
}

main().catch(err => {
  console.error('Failed:', err.message);
  process.exit(1);
});
