require('dotenv').config();
const { Pool } = require('pg');

console.log('Testing Render PostgreSQL Connection...');
console.log('DATABASE_URL exists:', !!process.env.DATABASE_URL);
console.log('DB_HOST:', process.env.DB_HOST);
console.log('DB_NAME:', process.env.DB_NAME);

const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  ssl: {
    rejectUnauthorized: false
  }
});

async function testConnection() {
  try {
    console.log('\n🔄 Connecting to database...');
    const client = await pool.connect();
    
    console.log('✅ Connected successfully!');
    
    // Test query
    const result = await client.query('SELECT NOW() as current_time, version() as version');
    console.log('✅ Query successful:');
    console.log('   Time:', result.rows[0].current_time);
    console.log('   Version:', result.rows[0].version);
    
    // Check if tables exist
    const tables = await client.query(`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public'
      ORDER BY table_name
    `);
    
    console.log('📊 Existing tables:', tables.rows.length);
    tables.rows.forEach(row => {
      console.log('   -', row.table_name);
    });
    
    client.release();
    console.log('✅ Connection test complete!');
    
  } catch (error) {
    console.error('❌ Connection failed:', error.message);
    console.error('Error details:', error);
  } finally {
    await pool.end();
  }
}

testConnection();