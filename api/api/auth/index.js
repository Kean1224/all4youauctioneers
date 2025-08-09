

const express = require('express');
const router = express.Router();
const fs = require('fs');
const path = require('path');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const {
  getUserByEmail,
  setUserPassword,
  saveResetToken,
  getEmailByToken,
  deleteToken,
  generateToken
} = require('./reset-utils');
const {
  savePendingUser,
  getPendingUserByToken,
  removePendingUser,
  createVerifiedUser
} = require('./email-verification');
let sendMail = null;
try {
  sendMail = require('../../utils/mailer').sendMail;
} catch {}
// POST /api/auth/forgot-password
router.post('/forgot-password', async (req, res) => {
  const { email } = req.body;
  if (!email) return res.status(400).json({ error: 'Email required' });
  const user = getUserByEmail(email);
  if (!user) return res.json({ success: true }); // Don't reveal if email exists
  const token = generateToken();
  const expiresAt = Date.now() + 1000 * 60 * 60; // 1 hour
  saveResetToken(email, token, expiresAt);
  if (sendMail) {
    const resetUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/reset-password?token=${token}`;
    await sendMail({
      to: email,
      subject: 'Password Reset Request',
      text: `Reset your password: ${resetUrl}`,
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link is valid for 1 hour.</p>`
    });
  }
  res.json({ success: true });
});

// POST /api/auth/reset-password
router.post('/reset-password', async (req, res) => {
  const { token, password } = req.body;
  if (!token || !password) return res.status(400).json({ error: 'Token and password required' });
  const email = getEmailByToken(token);
  if (!email) return res.status(400).json({ error: 'Invalid or expired token' });
  const hashed = await bcrypt.hash(password, 10);
  setUserPassword(email, hashed);
  deleteToken(token);
  res.json({ success: true });
});
const multer = require('multer');

// Multer setup for FICA uploads
const ficaStorage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, path.join(__dirname, '../../uploads/fica'));
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const unique = Date.now() + '-' + Math.round(Math.random() * 1e9);
    cb(null, `${file.fieldname}-${unique}${ext}`);
  }
});
const uploadFica = multer({ storage: ficaStorage });

const USERS_FILE = path.join(__dirname, '../../data/users.json');
const JWT_SECRET = process.env.JWT_SECRET || 'supersecretkey';
const JWT_EXPIRES_IN = '7d';



// POST /api/auth/register (now with email verification)
router.post('/register', uploadFica.fields([
  { name: 'proofOfAddress', maxCount: 1 },
  { name: 'idDocument', maxCount: 1 },
  { name: 'bankStatement', maxCount: 1 }
]), async (req, res) => {
  console.log('Register request body:', req.body);
  console.log('Register request files:', req.files);
  const { email, password, firstName, lastName, phone, cell, idNumber, address, city, postalCode } = req.body;
  
  // Create name from firstName and lastName, fallback to name field
  const name = firstName && lastName ? `${firstName} ${lastName}` : req.body.name;
  const username = req.body.username || email.split('@')[0]; // Generate username from email if not provided
  
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Email, password, and name required.' });
  }
  
  // Check if email is already registered
  if (!fs.existsSync(USERS_FILE)) {
    fs.writeFileSync(USERS_FILE, '[]');
  }
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  if (users.find(u => u.email === email)) {
    return res.status(409).json({ error: 'Email already registered.' });
  }
  if (users.find(u => u.username === username)) {
    return res.status(409).json({ error: 'Username already taken.' });
  }
  
  try {
    // Hash password
    const hashed = await bcrypt.hash(password, 10);
    
    // Handle FICA files
    const proofOfAddress = req.files && req.files['proofOfAddress'] ? req.files['proofOfAddress'][0].filename : null;
    const idDocument = req.files && req.files['idDocument'] ? req.files['idDocument'][0].filename : null;
    const bankStatement = req.files && req.files['bankStatement'] ? req.files['bankStatement'][0].filename : null;
    
    // Create pending user data
    const pendingUserData = {
      email,
      password: hashed,
      name,
      username,
      cell: phone || cell || '',
      idNumber: idNumber || '',
      address: address || '',
      city: city || '',
      postalCode: postalCode || '',
      idDocument: idDocument,
      proofOfAddress: proofOfAddress,
      bankStatement: bankStatement
    };
    
    // Save pending user and get verification token
    const verificationToken = savePendingUser(pendingUserData);
    
    // Send verification email
    if (sendMail) {
      const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/verify-email?token=${verificationToken}`;
      
      try {
        await sendMail({
          to: email,
          subject: 'Verify Your Email - All4You Auctions',
          text: `Welcome to All4You Auctions! Please verify your email by clicking this link: ${verificationUrl}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #d97706;">Welcome to All4You Auctions!</h2>
              <p>Hi ${name},</p>
              <p>Thank you for registering with All4You Auctions. Please verify your email address to complete your registration.</p>
              <div style="text-align: center; margin: 30px 0;">
                <a href="${verificationUrl}" 
                   style="background-color: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                  Verify Email Address
                </a>
              </div>
              <p><strong>Important:</strong> This verification link will expire in 24 hours.</p>
              <p>If you didn't create this account, please ignore this email.</p>
              <p>Best regards,<br>All4You Auctions Team</p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Remove the pending user if email fails
        removePendingUser(verificationToken);
        return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
      }
    }
    
    res.json({ 
      status: 'verification_required', 
      message: 'Registration successful! Please check your email and click the verification link to complete your account setup.',
      email: email
    });
    
  } catch (error) {
    console.error('Registration error:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// POST /api/auth/verify-email
router.post('/verify-email', async (req, res) => {
  const { token } = req.body;
  
  if (!token) {
    return res.status(400).json({ error: 'Verification token required.' });
  }
  
  try {
    // Get pending user by token
    const pendingUser = getPendingUserByToken(token);
    
    if (!pendingUser) {
      return res.status(400).json({ error: 'Invalid or expired verification token.' });
    }
    
    // Create the verified user
    const newUser = createVerifiedUser(pendingUser);
    
    // Remove from pending users
    removePendingUser(token);
    
    // Issue JWT for immediate login
    const jwtToken = jwt.sign(
      { email: newUser.email, name: newUser.name, role: 'user' }, 
      JWT_SECRET, 
      { expiresIn: JWT_EXPIRES_IN }
    );
    
    res.json({
      status: 'success',
      message: 'Email verified successfully! Welcome to All4You Auctions.',
      token: jwtToken,
      user: {
        email: newUser.email,
        name: newUser.name,
        cell: newUser.cell || '',
        ficaApproved: newUser.ficaApproved || false
      }
    });
    
  } catch (error) {
    console.error('Email verification error:', error);
    if (error.message === 'User already exists') {
      return res.status(409).json({ error: 'Account already exists. Please login instead.' });
    }
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email required.' });
  }
  
  // Check if user already exists
  if (fs.existsSync(USERS_FILE)) {
    const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
    if (users.find(u => u.email === email)) {
      return res.status(409).json({ error: 'Email already verified. Please login instead.' });
    }
  }
  
  // Check if there's a pending registration
  const PENDING_USERS_FILE = path.join(__dirname, '../../data/pending-registrations.json');
  if (!fs.existsSync(PENDING_USERS_FILE)) {
    return res.status(404).json({ error: 'No pending registration found for this email.' });
  }
  
  const pendingUsers = JSON.parse(fs.readFileSync(PENDING_USERS_FILE, 'utf-8'));
  const pendingUser = pendingUsers.find(u => u.email === email);
  
  if (!pendingUser) {
    return res.status(404).json({ error: 'No pending registration found for this email.' });
  }
  
  try {
    // Generate new verification token
    const crypto = require('crypto');
    const newToken = crypto.randomBytes(32).toString('hex');
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    
    // Update the pending user with new token
    pendingUser.verificationToken = newToken;
    pendingUser.expiresAt = expiresAt;
    
    fs.writeFileSync(PENDING_USERS_FILE, JSON.stringify(pendingUsers, null, 2));
    
    // Send new verification email
    if (sendMail) {
      const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL || 'http://localhost:3000'}/verify-email?token=${newToken}`;
      
      await sendMail({
        to: email,
        subject: 'New Verification Link - All4You Auctions',
        text: `Your new verification link: ${verificationUrl}`,
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d97706;">Email Verification - All4You Auctions</h2>
            <p>Hi ${pendingUser.name},</p>
            <p>Here's your new verification link:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            <p><strong>Important:</strong> This verification link will expire in 24 hours.</p>
            <p>Best regards,<br>All4You Auctions Team</p>
          </div>
        `
      });
    }
    
    res.json({ 
      status: 'success', 
      message: 'New verification email sent. Please check your inbox.' 
    });
    
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email. Please try again.' });
  }
});

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: 'Email and password required.' });
  }
  if (!fs.existsSync(USERS_FILE)) {
    return res.status(500).json({ error: 'User data not found.' });
  }
  const users = JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  // Admin hardcoded user (updated with your credentials)
  if (email === 'Keanmartin75@gmail.com' && password === 'Tristan@89') {
    const token = jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({ role: 'admin', status: 'success', email, token });
  }
  const user = users.find(u => u.email === email);
  if (!user) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  if (user.suspended) {
    return res.status(403).json({ error: 'User is suspended.' });
  }
  const match = await bcrypt.compare(password, user.password);
  if (!match) {
    return res.status(401).json({ error: 'Invalid credentials.' });
  }
  const token = jwt.sign({ email: user.email, name: user.name, role: 'user' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
  res.json({
    role: 'user',
    email: user.email,
    name: user.name || '',
    cell: user.cell || '',
    ficaApproved: user.ficaApproved || false,
    status: 'success',
    token
  });
});

// POST /api/auth/admin-login - separate admin login endpoint
router.post('/admin-login', async (req, res) => {
  const { email, password } = req.body;
  console.log('Admin login attempt:', { email, password: password ? '***' : 'missing' });
  
  if (!email || !password) {
    console.log('Missing email or password');
    return res.status(400).json({ error: 'Email and password required.' });
  }
  
  // Admin credentials check
  if ((email === 'Keanmartin75@gmail.com' && password === 'Tristan@89') || 
      (email === 'admin@admin.com' && password === 'admin123') ||
      (email === 'admin@all4youauctions.co.za' && password === 'SecureAdminPass123!')) {
    console.log('Admin login successful for:', email);
    const token = jwt.sign({ email, role: 'admin' }, JWT_SECRET, { expiresIn: JWT_EXPIRES_IN });
    return res.json({ role: 'admin', status: 'success', email, token });
  }
  
  console.log('Invalid admin credentials for:', email);
  return res.status(401).json({ error: 'Invalid admin credentials.' });
});

// POST /api/auth/verify-admin - verify admin token
router.post('/verify-admin', (req, res) => {
  const verifyAdmin = require('./verify-admin');
  verifyAdmin(req, res, () => {
    // If we reach here, the verifyAdmin middleware has passed
    res.json({ 
      valid: true, 
      admin: req.admin,
      message: 'Admin token is valid',
      timestamp: new Date().toISOString()
    });
  });
});


// GET /api/auth/session - check login and admin status
router.get('/session', (req, res) => {
  let token = null;
  // Try to get token from Authorization header (Bearer) or cookie
  if (req.headers.authorization && req.headers.authorization.startsWith('Bearer ')) {
    token = req.headers.authorization.replace('Bearer ', '');
  } else if (req.cookies && req.cookies.token) {
    token = req.cookies.token;
  }
  if (!token) return res.json({ isLoggedIn: false });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    res.json({ isLoggedIn: true, email: payload.email, role: payload.role, isAdmin: payload.role === 'admin' });
  } catch {
    res.json({ isLoggedIn: false });
  }
});

module.exports = router;
