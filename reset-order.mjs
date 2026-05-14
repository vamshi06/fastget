import { neon } from '@neondatabase/serverless';

const databaseUrl = process.env.fastget_DATABASE_URL || process.env.DATABASE_URL;
const sql = neon(databaseUrl);

console.log('Resetting order to eta_assigned for testing...');

const result = await sql`
  UPDATE orders 
  SET status = 'eta_assigned', eta = '3:00 PM'
  WHERE update_token = 'wil0jdekvceeni4l'
  RETURNING id, status, eta
`;
console.log('Update result:', result[0]);

console.log('\n✓ Reset complete');
