import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.fastget_DATABASE_URL;

if (!databaseUrl) {
  console.error('❌ fastget_DATABASE_URL not set');
  process.exit(1);
}

console.log('=== Neon Database Connection Test ===\n');

try {
  const sql = neon(databaseUrl);
  
  console.log('✅ Neon client initialized');
  console.log('📡 Testing connection...\n');
  
  // Test simple query
  const result = await sql`SELECT NOW() as current_time, version() as pg_version`;
  console.log('✅ Connected successfully!');
  console.log('Current time:', result[0].current_time);
  console.log('PostgreSQL version:', result[0].pg_version.split(',')[0]);
  console.log('');
  
  // Check if orders table exists
  const tableCheck = await sql`
    SELECT EXISTS (
      SELECT FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name = 'orders'
    ) as table_exists
  `;
  
  if (tableCheck[0].table_exists) {
    console.log('✅ Orders table exists');
    
    // Check schema
    const columns = await sql`
      SELECT column_name, data_type, is_nullable
      FROM information_schema.columns
      WHERE table_name = 'orders'
      ORDER BY ordinal_position
    `;
    
    console.log('📋 Table columns:');
    columns.forEach(col => {
      console.log(`   - ${col.column_name} (${col.data_type}, nullable: ${col.is_nullable})`);
    });
    console.log('');
    
    // Check indexes
    const indexes = await sql`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename = 'orders'
    `;
    
    console.log('📑 Indexes:');
    indexes.forEach(idx => {
      console.log(`   - ${idx.indexname}`);
    });
  } else {
    console.log('⚠️  Orders table does not exist yet');
    console.log('Run initializeDatabase() to create it');
  }
  
  console.log('\n✅ All checks passed!');
  
} catch (error) {
  console.error('❌ Connection failed:', error);
  process.exit(1);
}
