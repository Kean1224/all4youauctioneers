const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const PENDING_USERS_FILE = path.join(__dirname, '../../data/pending-registrations.json');
const USERS_FILE = path.join(__dirname, '../../data/users.json');

function savePendingUser(userData) {
  let pendingUsers = [];
  if (fs.existsSync(PENDING_USERS_FILE)) {
    pendingUsers = JSON.parse(fs.readFileSync(PENDING_USERS_FILE, 'utf-8'));
  }
  
  // Remove any existing pending registration for this email
  pendingUsers = pendingUsers.filter(u => u.email !== userData.email);
  
  // Add new pending user
  const verificationToken = crypto.randomBytes(32).toString('hex');
  const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  
  const pendingUser = {
    ...userData,
    verificationToken,
    expiresAt,
    createdAt: new Date().toISOString()
  };
  
  pendingUsers.push(pendingUser);
  fs.writeFileSync(PENDING_USERS_FILE, JSON.stringify(pendingUsers, null, 2));
  
  return verificationToken;
}

function getPendingUserByToken(token) {
  if (!fs.existsSync(PENDING_USERS_FILE)) return null;
  const pendingUsers = JSON.parse(fs.readFileSync(PENDING_USERS_FILE, 'utf-8'));
  const user = pendingUsers.find(u => u.verificationToken === token);
  
  if (!user) return null;
  if (Date.now() > user.expiresAt) {
    // Token expired, remove it
    removePendingUser(token);
    return null;
  }
  
  return user;
}

function removePendingUser(token) {
  if (!fs.existsSync(PENDING_USERS_FILE)) return false;
  let pendingUsers = JSON.parse(fs.readFileSync(PENDING_USERS_FILE, 'utf-8'));
  const initialLength = pendingUsers.length;
  pendingUsers = pendingUsers.filter(u => u.verificationToken !== token);
  
  if (pendingUsers.length < initialLength) {
    fs.writeFileSync(PENDING_USERS_FILE, JSON.stringify(pendingUsers, null, 2));
    return true;
  }
  return false;
}

function createVerifiedUser(pendingUser) {
  // Read existing users
  let users = [];
  if (fs.existsSync(USERS_FILE)) {
    users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  }
  
  // Check if user already exists (edge case protection)
  if (users.find(u => u.email === pendingUser.email)) {
    throw new Error('User already exists');
  }
  
  // Create the actual user
  const newUser = {
    email: pendingUser.email,
    password: pendingUser.password, // Already hashed
    name: pendingUser.name,
    username: pendingUser.username,
    cell: pendingUser.cell || '',
    ficaApproved: false,
    suspended: false,
    registeredAt: new Date().toISOString(),
    emailVerified: true,
    emailVerifiedAt: new Date().toISOString(),
    watchlist: [],
    idDocument: pendingUser.idDocument,
    proofOfAddress: pendingUser.proofOfAddress,
    bankStatement: pendingUser.bankStatement
  };
  
  users.push(newUser);
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  
  return newUser;
}

function cleanupExpiredPendingUsers() {
  if (!fs.existsSync(PENDING_USERS_FILE)) return;
  let pendingUsers = JSON.parse(fs.readFileSync(PENDING_USERS_FILE, 'utf-8'));
  const now = Date.now();
  const validUsers = pendingUsers.filter(u => u.expiresAt > now);
  
  if (validUsers.length !== pendingUsers.length) {
    fs.writeFileSync(PENDING_USERS_FILE, JSON.stringify(validUsers, null, 2));
    console.log(`Cleaned up ${pendingUsers.length - validUsers.length} expired pending registrations`);
  }
}

// Clean up expired tokens on module load
cleanupExpiredPendingUsers();

// Set up periodic cleanup (every hour)
setInterval(cleanupExpiredPendingUsers, 60 * 60 * 1000);

module.exports = {
  savePendingUser,
  getPendingUserByToken,
  removePendingUser,
  createVerifiedUser,
  cleanupExpiredPendingUsers
};
