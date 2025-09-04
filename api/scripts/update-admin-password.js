const bcrypt = require('bcryptjs');
const dbManager = require('../database/connection');

async function updateAdminPassword() {
  try {
    console.log('🔐 Updating admin password...');
    
    // Initialize database connection
    await dbManager.initialize();
    
    const adminEmail = 'admin@all4youauctions.co.za';
    const newPassword = 'Tristan@89';
    
    console.log(`📧 Admin Email: ${adminEmail}`);
    console.log(`🔑 New Password: ${newPassword}`);
    
    // Hash the new password with bcrypt (same as in migrations)
    const hashedPassword = await bcrypt.hash(newPassword, 12);
    console.log(`🔐 Password hashed successfully`);
    
    // Update the admin user password
    const result = await dbManager.query(`
      UPDATE users 
      SET password_hash = $1, updated_at = NOW()
      WHERE email = $2 AND role = $3
      RETURNING id, email, name, role
    `, [hashedPassword, adminEmail, 'admin']);
    
    if (result.rows.length > 0) {
      const admin = result.rows[0];
      console.log('✅ Admin password updated successfully!');
      console.log(`👤 Admin User:`, {
        id: admin.id,
        email: admin.email,
        name: admin.name,
        role: admin.role
      });
      
      // Test the password
      console.log('🧪 Testing password...');
      const testResult = await bcrypt.compare(newPassword, hashedPassword);
      console.log(`🔍 Password test result: ${testResult ? '✅ VALID' : '❌ INVALID'}`);
      
    } else {
      console.error('❌ No admin user found to update');
      
      // Check if admin user exists
      const checkResult = await dbManager.query(
        'SELECT id, email, role FROM users WHERE email = $1',
        [adminEmail]
      );
      
      if (checkResult.rows.length > 0) {
        console.log('📋 Found user:', checkResult.rows[0]);
      } else {
        console.log('❌ No user found with email:', adminEmail);
      }
    }
    
    console.log('✅ Script completed');
    process.exit(0);
    
  } catch (error) {
    console.error('❌ Error updating admin password:', error);
    process.exit(1);
  }
}

updateAdminPassword();