const { Pool } = require('pg');

// Use your exact connection string from Render
const connectionString = 'postgresql://auctions_ksil_user:PbuC9Ogfa8Pbb1dnQ41GPcaoyygiLWpx@dpg-d2mn7fbe5dus73cp2ljg-a.oregon-postgres.render.com/auctions_ksil';

console.log('🔄 Testing connection...');

const pool = new Pool({
  connectionString: connectionString,
  ssl: { rejectUnauthorized: false },
  connectionTimeoutMillis: 30000, // 30 seconds timeout
});

async function test() {
  try {
    const client = await pool.connect();
    console.log('✅ CONNECTION SUCCESS!');
    
    const result = await client.query('SELECT version()');
    console.log('✅ PostgreSQL Version:', result.rows[0].version.substring(0, 50) + '...');
    
    client.release();
    console.log('✅ Your database is working perfectly!');
    
  } catch (error) {
    console.log('\n❌ CONNECTION FAILED');
    console.log('Error type:', error.code || error.name);
    console.log('Error message:', error.message);
    
    if (error.message.includes('timeout')) {
      console.log('\n💡 SOLUTION: Your database might be sleeping or starting up');
      console.log('   - Go to your Render dashboard');
      console.log('   - Check if your PostgreSQL database status is "Available"');
      console.log('   - If it\'s "Deploying", wait a few minutes');
    }
    
    if (error.message.includes('authentication')) {
      console.log('\n💡 SOLUTION: Check your database credentials in Render dashboard');
    }
    
    if (error.message.includes('terminated')) {
      console.log('\n💡 SOLUTION: Your database might not be accepting external connections');
      console.log('   - Check Render dashboard settings');
      console.log('   - Make sure external connections are enabled');
    }
  }
  
  await pool.end();
}

test();