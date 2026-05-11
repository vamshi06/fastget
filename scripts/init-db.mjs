#!/usr/bin/env node
import { initializeDatabase } from './src/lib/db.ts';

console.log('=== Neon Database Initialization Test ===\n');

try {
  console.log('Connecting to Neon...');
  console.log(`Database URL: ${process.env.fastget_DATABASE_URL?.substring(0, 50)}...`);
  console.log('');
  
  console.log('Initializing database schema...');
  await initializeDatabase();
  
  console.log('✅ Database initialized successfully!');
  console.log('✅ Schema created');
  console.log('✅ Indexes created');
  process.exit(0);
} catch (error) {
  console.error('❌ Failed to initialize database:', error);
  process.exit(1);
}
