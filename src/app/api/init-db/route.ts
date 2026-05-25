import { initializeDatabase } from '@/lib/db';
import { NextResponse } from 'next/server';

/**
 * GET /api/init-db
 * Initialize the database schema (create tables if they don't exist)
 * Safe to call multiple times.
 */
export async function GET() {
  try {
    console.log('Initializing database schema...');
    await initializeDatabase();
    return NextResponse.json({ success: true, message: 'Database initialized' });
  } catch (error) {
    console.error('Database initialization failed:', error);
    return NextResponse.json(
      { 
        error: 'Failed to initialize database',
        details: error instanceof Error ? error.message : String(error)
      },
      { status: 500 }
    );
  }
}
