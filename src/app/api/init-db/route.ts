import { initializeDatabase } from '@/lib/db';
import { NextResponse } from 'next/server';
import { logger } from '@/lib/logger';
import { requireRole } from '@/lib/auth';

/**
 * GET /api/init-db
 * Initialize the database schema (create tables if they don't exist)
 * Safe to call multiple times.
 */
export async function GET() {
  const auth = await requireRole('admin');
  if ('response' in auth) return auth.response;
  const start = Date.now();
  logger.info('API', 'GET /api/init-db');
  try {
    await initializeDatabase();
    logger.info('DB', 'Database schema initialized');
    logger.api('GET', '/api/init-db', 200, Date.now() - start);
    return NextResponse.json({ success: true, message: 'Database initialized' });
  } catch (error) {
    // Log the real cause server-side; never leak the exception message to the
    // client (H4 / M4 — avoid disclosing schema/driver internals).
    logger.error('API', 'GET /api/init-db — initialization failed', { error: error instanceof Error ? error.message : String(error) });
    logger.api('GET', '/api/init-db', 500, Date.now() - start);
    return NextResponse.json(
      { error: 'Failed to initialize database' },
      { status: 500 }
    );
  }
}
