require('dotenv').config();
const bcrypt = require('bcryptjs');

// Direct database connection without our wrapper
const { Pool } = require('pg');

async function fixAdminLogin() {
  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl: process.env.NODE_ENV === 'production' ? { rejectUnauthorized: false } : false
  });

  try {
    console.log('🔐 FIXING ADMIN LOGIN...');
    console.log('🌍 Environment:', process.env.NODE_ENV);
    console.log('🗄️ Database URL exists:', !!process.env.DATABASE_URL);
    
    const adminEmail = 'admin@all4youauctions.co.za';
    const adminPassword = 'Tristan@89';
    
    console.log(`📧 Admin Email: ${adminEmail}`);
    console.log(`🔑 Admin Password: ${adminPassword}`);
    
    // Hash password with bcrypt
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    console.log('✅ Password hashed successfully');
    
    // First, delete any existing admin user to start fresh
    console.log('🗑️ Removing any existing admin users...');
    await pool.query('DELETE FROM users WHERE email = $1 OR role = $2', [adminEmail, 'admin']);
    
    // Create fresh admin user
    console.log('👤 Creating fresh admin user...');
    const result = await pool.query(`
      INSERT INTO users (email, password_hash, name, role, email_verified, fica_approved, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, email, name, role
    `, [
      adminEmail,
      hashedPassword,
      'System Administrator',
      'admin',
      true,
      true
    ]);
    
    if (result.rows.length > 0) {
      const admin = result.rows[0];
      console.log('✅ Admin user created successfully!');
      console.log('👤 Admin details:', {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      });
      
      // Test the password immediately
      console.log('🧪 Testing password hash...');
      const isValid = await bcrypt.compare(adminPassword, hashedPassword);
      console.log(`🔍 Password test: ${isValid ? '✅ VALID' : '❌ INVALID'}`);
      
      // Test login simulation
      console.log('🎭 Simulating login process...');
      const loginTest = await pool.query(
        'SELECT id, email, password_hash, name, role FROM users WHERE email = $1 AND role = $2',
        [adminEmail, 'admin']
      );
      
      if (loginTest.rows.length > 0) {
        const user = loginTest.rows[0];
        const loginValid = await bcrypt.compare(adminPassword, user.password_hash);
        console.log(`🔐 Login simulation: ${loginValid ? '✅ SUCCESS' : '❌ FAILED'}`);
        
        if (loginValid) {
          console.log('🎉 ADMIN LOGIN IS NOW WORKING!');
          console.log('🚀 You can now login with:');
          console.log(`   Email: ${adminEmail}`);
          console.log(`   Password: ${adminPassword}`);
        } else {
          console.log('❌ Login simulation failed - password mismatch');
        }
      } else {
        console.log('❌ Could not find admin user for login test');
      }
    } else {
      console.log('❌ Failed to create admin user');
    }
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.error('Stack:', error.stack);
  } finally {
    await pool.end();
    console.log('✅ Script completed');
  }
}

fixAdminLogin();