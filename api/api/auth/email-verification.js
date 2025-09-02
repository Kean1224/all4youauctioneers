const crypto = require('crypto');
const dbManager = require('../../database/connection');

async function savePendingUser(userData) {
  try {
    // Remove any existing pending registration for this email
    await dbManager.query(
      'DELETE FROM pending_users WHERE email = $1',
      [userData.email]
    );
    
    // Generate verification token and expiry
    const verificationToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = new Date(Date.now() + (24 * 60 * 60 * 1000)); // 24 hours
    
    // Insert new pending user
    const result = await dbManager.query(`
      INSERT INTO pending_users (
        email, password_hash, name, username, cell, id_number,
        address, city, postal_code, id_document, proof_of_address,
        verification_token, expires_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13)
      RETURNING *
    `, [
      userData.email,
      userData.password, // Already hashed
      userData.name,
      userData.username,
      userData.cell || '',
      userData.idNumber || '',
      userData.address || '',
      userData.city || '',
      userData.postalCode || '',
      userData.idDocument || null,
      userData.proofOfAddress || null,
      verificationToken,
      expiresAt
    ]);
    
    return verificationToken;
  } catch (error) {
    console.error('Error saving pending user:', error);
    throw error;
  }
}

async function getPendingUserByToken(token) {
  try {
    const result = await dbManager.query(
      'SELECT * FROM pending_users WHERE verification_token = $1 AND expires_at > NOW()',
      [token]
    );
    
    if (result.rows.length === 0) {
      // Token doesn't exist or has expired - clean up expired tokens
      await cleanupExpiredPendingUsers();
      return null;
    }
    
    return result.rows[0];
  } catch (error) {
    console.error('Error getting pending user by token:', error);
    return null;
  }
}

async function removePendingUser(token) {
  try {
    const result = await dbManager.query(
      'DELETE FROM pending_users WHERE verification_token = $1 RETURNING id',
      [token]
    );
    
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error removing pending user:', error);
    return false;
  }
}

async function createVerifiedUser(pendingUser) {
  try {
    // Check if user already exists (edge case protection)
    const existingUser = await dbManager.query(
      'SELECT id FROM users WHERE email = $1',
      [pendingUser.email]
    );
    
    if (existingUser.rows.length > 0) {
      throw new Error('User already exists');
    }
    
    // Create the actual user in the users table
    const result = await dbManager.query(`
      INSERT INTO users (
        email, password_hash, name, phone, address, city, postal_code,
        fica_approved, fica_file_url, email_verified, created_at, updated_at
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, NOW(), NOW())
      RETURNING *
    `, [
      pendingUser.email,
      pendingUser.password_hash, // From pending table
      pendingUser.name,
      pendingUser.cell,
      pendingUser.address,
      pendingUser.city,
      pendingUser.postal_code,
      false, // fica_approved
      null,  // fica_file_url
      true   // email_verified
    ]);
    
    // Store FICA documents if they exist
    if (pendingUser.id_document || pendingUser.proof_of_address) {
      if (pendingUser.id_document) {
        await dbManager.query(`
          INSERT INTO fica_documents (user_email, file_url, original_filename, status)
          VALUES ($1, $2, $3, $4)
        `, [pendingUser.email, pendingUser.id_document, 'id_document.pdf', 'pending']);
      }
      
      if (pendingUser.proof_of_address) {
        await dbManager.query(`
          INSERT INTO fica_documents (user_email, file_url, original_filename, status)
          VALUES ($1, $2, $3, $4)
        `, [pendingUser.email, pendingUser.proof_of_address, 'proof_of_address.pdf', 'pending']);
      }
    }
    
    // Remove from pending users
    await removePendingUser(pendingUser.verification_token);
    
    return result.rows[0];
  } catch (error) {
    console.error('Error creating verified user:', error);
    throw error;
  }
}

async function cleanupExpiredPendingUsers() {
  try {
    const result = await dbManager.query(
      'DELETE FROM pending_users WHERE expires_at <= NOW() RETURNING email'
    );
    
    if (result.rows.length > 0) {
      console.log(`🧹 Cleaned up ${result.rows.length} expired pending registrations`);
    }
    
    return result.rows.length;
  } catch (error) {
    console.error('Error cleaning up expired pending users:', error);
    return 0;
  }
}

// Clean up expired tokens on module load
setTimeout(cleanupExpiredPendingUsers, 5000); // Wait 5 seconds for DB to be ready

// Set up periodic cleanup (every hour)
setInterval(cleanupExpiredPendingUsers, 60 * 60 * 1000);

module.exports = {
  savePendingUser,
  getPendingUserByToken,
  removePendingUser,
  createVerifiedUser,
  cleanupExpiredPendingUsers
};
