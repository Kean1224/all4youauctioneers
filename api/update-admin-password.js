require('dotenv').config();
const bcrypt = require('bcryptjs');
const dbManager = require('./database/connection');

async function updateAdminPassword() {
  try {
    await dbManager.initialize();
    console.log('🔄 Updating admin password...');

    const newPassword = process.env.ADMIN_PASSWORD || 'SecureAdminPass2025!';
    const hashedPassword = await bcrypt.hash(newPassword, 12);

    const result = await dbManager.query(
      'UPDATE users SET password_hash = $1 WHERE role = $2 AND email = $3',
      [hashedPassword, 'admin', 'admin@all4youauctions.co.za']
    );

    if (result.rowCount > 0) {
      console.log('✅ Admin password updated successfully');
    } else {
      console.log('❌ No admin user found to update');
    }

  } catch (error) {
    console.error('❌ Failed to update admin password:', error);
  } finally {
    process.exit(0);
  }
}

updateAdminPassword();