const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const USERS_FILE = path.join(__dirname, '../../data/users.json');
const TOKENS_FILE = path.join(__dirname, '../../data/reset-tokens.json');

function getUserByEmail(email) {
  if (!fs.existsSync(USERS_FILE)) return null;
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  return users.find(u => u.email === email);
}

function setUserPassword(email, hashedPassword) {
  if (!fs.existsSync(USERS_FILE)) return false;
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  const idx = users.findIndex(u => u.email === email);
  if (idx === -1) return false;
  users[idx].password = hashedPassword;
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2));
  return true;
}

function saveResetToken(email, token, expiresAt) {
  let tokens = [];
  if (fs.existsSync(TOKENS_FILE)) {
    tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
  }
  tokens = tokens.filter(t => t.email !== email); // Remove old tokens for this user
  tokens.push({ email, token, expiresAt });
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
}

function getEmailByToken(token) {
  if (!fs.existsSync(TOKENS_FILE)) return null;
  const tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
  const entry = tokens.find(t => t.token === token && Date.now() < t.expiresAt);
  return entry ? entry.email : null;
}

function deleteToken(token) {
  if (!fs.existsSync(TOKENS_FILE)) return;
  let tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
  tokens = tokens.filter(t => t.token !== token);
  fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
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
