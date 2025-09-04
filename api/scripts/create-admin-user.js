require('dotenv').config();
const bcrypt = require('bcryptjs');
const dbManager = require('../database/connection');

async function createAdminUser() {
  try {
    console.log('🔧 Creating admin user...');
    
    // Initialize database connection
    await dbManager.initialize();
    
    // Admin credentials
    const adminEmail = 'admin@all4you.com';
    const adminPassword = 'Admin123!'; // You can change this
    const adminName = 'System Administrator';
    
    // Hash the password
    const hashedPassword = await bcrypt.hash(adminPassword, 12);
    
    // Check if admin already exists
    const existingAdmin = await dbManager.query(
      'SELECT email FROM users WHERE email = $1',
      [adminEmail]
    );
    
    if (existingAdmin.rows.length > 0) {
      console.log('⚠️  Admin user already exists, updating role and password...');
      
      // Update existing user to admin
      await dbManager.query(
        `UPDATE users 
         SET password_hash = $1, role = $2, name = $3, fica_approved = true, email_verified = true, updated_at = CURRENT_TIMESTAMP
         WHERE email = $4`,
        [hashedPassword, 'admin', adminName, adminEmail]
      );
      
      console.log('✅ Admin user updated successfully!');
    } else {
      // Create new admin user
      await dbManager.query(
        `INSERT INTO users (email, password_hash, name, role, fica_approved, email_verified, created_at, updated_at) 
         VALUES ($1, $2, $3, $4, true, true, CURRENT_TIMESTAMP, CURRENT_TIMESTAMP)`,
        [adminEmail, hashedPassword, adminName, 'admin']
      );
      
      console.log('✅ Admin user created successfully!');
    }
    
    console.log('\n🔑 Admin Login Credentials:');
    console.log(`Email: ${adminEmail}`);
    console.log(`Password: ${adminPassword}`);
    console.log('\n📝 Please change the password after first login for security!');
    console.log('🌐 Admin login URL: https://www.all4youauctions.co.za/admin/login');
    
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error creating admin user:', error);
    process.exit(1);
  }
}

createAdminUser();