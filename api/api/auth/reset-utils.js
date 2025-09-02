const crypto = require('crypto');
const dbManager = require('../../database/connection');

async function getUserByEmail(email) {
  try {
    const result = await dbManager.query(
      'SELECT * FROM users WHERE email = $1', 
      [email]
    );
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error getting user by email:', error);
    return null;
  }
}

async function setUserPassword(email, hashedPassword) {
  try {
    const result = await dbManager.query(
      'UPDATE users SET password_hash = $1, updated_at = CURRENT_TIMESTAMP WHERE email = $2 RETURNING id',
      [hashedPassword, email]
    );
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error updating user password:', error);
    return false;
  }
}

async function saveResetToken(email, token, expiresAt) {
  try {
    // Remove any existing tokens for this user
    await dbManager.query(
      'DELETE FROM password_reset_tokens WHERE email = $1',
      [email]
    );
    
    // Insert new token
    await dbManager.query(
      'INSERT INTO password_reset_tokens (email, token, expires_at) VALUES ($1, $2, $3)',
      [email, token, new Date(expiresAt)]
    );
    
    return true;
  } catch (error) {
    console.error('Error saving reset token:', error);
    return false;
  }
}

async function getEmailByToken(token) {
  try {
    const result = await dbManager.query(
      'SELECT email FROM password_reset_tokens WHERE token = $1 AND expires_at > NOW() AND used_at IS NULL',
      [token]
    );
    return result.rows[0]?.email || null;
  } catch (error) {
    console.error('Error getting email by token:', error);
    return null;
  }
}

async function deleteToken(token) {
  try {
    // Mark token as used instead of deleting for audit trail
    await dbManager.query(
      'UPDATE password_reset_tokens SET used_at = CURRENT_TIMESTAMP WHERE token = $1',
      [token]
    );
    return true;
  } catch (error) {
    console.error('Error deleting/marking token as used:', error);
    return false;
  }
}

function generateToken() {
  return crypto.randomBytes(32).toString('hex');
}

module.exports = {
  getUserByEmail,
  setUserPassword,
  saveResetToken,
  getEmailByToken,
  deleteToken,
  generateToken
};
