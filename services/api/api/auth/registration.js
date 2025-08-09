const verifyAdmin = require('./verify-admin');
const express = require('express');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');

const router = express.Router();

// Ensure directories exist
const ficaDir = path.join(__dirname, '../../uploads/fica');
if (!fs.existsSync(ficaDir)) {
  fs.mkdirSync(ficaDir, { recursive: true });
}

// Configure multer for FICA document uploads
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, ficaDir);
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    const extension = path.extname(file.originalname);
    cb(null, `${file.fieldname}-${uniqueSuffix}${extension}`);
        }
      });

// File filter for security
const fileFilter = function (req, file, cb) {
  const allowedTypes = ['image/jpeg', 'image/png', 'application/pdf'];
  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error('Invalid file type. Only JPG, PNG, and PDF files are allowed.'), false);
  }
};

const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 5 * 1024 * 1024 }
});

// File paths
const USERS_FILE = path.join(__dirname, '../../data/users.json');
const PENDING_USERS_FILE = path.join(__dirname, '../../data/pending-registrations.json');

// Initialize files if they don't exist
if (!fs.existsSync(USERS_FILE)) {
  fs.writeFileSync(USERS_FILE, '[]', 'utf-8');
}
if (!fs.existsSync(PENDING_USERS_FILE)) {
  fs.writeFileSync(PENDING_USERS_FILE, '[]', 'utf-8');
}

// Email service
let sendMail = null;
try {
  sendMail = require('../../utils/mailer').sendMail;
} catch (e) {
  console.log('⚠️  Email service not available for registration');
}

// JWT configuration
const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = process.env.JWT_EXPIRES_IN;

// Helper functions
function readUsers() {
  try {
    return JSON.parse(fs.readFileSync(USERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writeUsers(users) {
  fs.writeFileSync(USERS_FILE, JSON.stringify(users, null, 2), 'utf-8');
}

function readPendingUsers() {
  try {
    return JSON.parse(fs.readFileSync(PENDING_USERS_FILE, 'utf-8'));
  } catch {
    return [];
  }
}

function writePendingUsers(pendingUsers) {
  fs.writeFileSync(PENDING_USERS_FILE, JSON.stringify(pendingUsers, null, 2), 'utf-8');
}

function savePendingUser(userData) {
  const pendingUsers = readPendingUsers();
  const verificationToken = uuidv4();
  const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
  
  const pendingUser = {
    ...userData,
    verificationToken,
    expiresAt,
    createdAt: new Date().toISOString()
  };
  
  // Remove any existing pending registration for this email
  const filtered = pendingUsers.filter(u => u.email !== userData.email);
  filtered.push(pendingUser);
  
  writePendingUsers(filtered);
  return verificationToken;
}

function getPendingUserByToken(token) {
  const pendingUsers = readPendingUsers();
  const user = pendingUsers.find(u => u.verificationToken === token);
  
  if (!user) return null;
  
  // Check if token has expired
  if (Date.now() > user.expiresAt) {
    // Remove expired token
    removePendingUser(token);
    return null;
  }
  
  return user;
}

function removePendingUser(token) {
  const pendingUsers = readPendingUsers();
  const filtered = pendingUsers.filter(u => u.verificationToken !== token);
  writePendingUsers(filtered);
}

function createVerifiedUser(pendingUser) {
  const users = readUsers();
  
  const newUser = {
    id: uuidv4(),
    email: pendingUser.email,
    password: pendingUser.password,
    name: pendingUser.name,
    cell: pendingUser.cell || '',
    idDocument: pendingUser.idDocument,
    proofOfAddress: pendingUser.proofOfAddress,
    ficaApproved: false, // Admin must approve
    isActive: false, // Admin must activate
    role: 'user',
    createdAt: new Date().toISOString(),
    emailVerified: true,
    emailVerifiedAt: new Date().toISOString()
  };
  
  users.push(newUser);
  writeUsers(users);
  
  return newUser;
}

// POST /api/auth/register
router.post('/register', upload.fields([
  { name: 'proofOfAddress', maxCount: 1 },
  { name: 'idCopy', maxCount: 1 }
]), async (req, res) => {
  try {
    const { name, email, cell, password } = req.body;

    // Input validation
    if (!name || !email || !cell || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      return res.status(400).json({ error: 'Invalid email format.' });
    }

    // Password validation
    if (password.length < 8) {
      return res.status(400).json({ error: 'Password must be at least 8 characters long.' });
    }

    // Check for existing users
    const users = readUsers();
    if (users.find(u => u.email === email)) {
      return res.status(409).json({ error: 'Email already registered.' });
    }

    // Check for required files
    if (!req.files || !req.files['proofOfAddress'] || !req.files['idCopy']) {
      return res.status(400).json({ error: 'Both proof of address and ID document are required.' });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);

    // Get uploaded file information
    const proofOfAddress = req.files['proofOfAddress'][0];
    const idCopy = req.files['idCopy'][0];
    // Check for empty file buffers/content
    if (!proofOfAddress || !proofOfAddress.size || proofOfAddress.size === 0) {
      return res.status(400).json({ error: 'Proof of address file is empty or invalid.' });
    }
    if (!idCopy || !idCopy.size || idCopy.size === 0) {
      return res.status(400).json({ error: 'ID document file is empty or invalid.' });
    }

    // Create pending user data
    const pendingUserData = {
      email,
      password: hashedPassword,
      name: name.trim(),
      cell: cell.trim(),
      idDocument: idCopy.filename,
      proofOfAddress: proofOfAddress.filename
    };

    // Save pending user and get verification token
    const verificationToken = savePendingUser(pendingUserData);

    // Send verification email
    if (sendMail) {
      const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email?token=${verificationToken}`;
      try {
        await sendMail({
          to: email,
          subject: 'Verify Your Email - All4You Auctions',
          text: `Welcome to All4You Auctions! Please verify your email by clicking this link: ${verificationUrl}`,
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
              <div style="text-align: center; margin-bottom: 30px;">
                <h1 style="color: #d97706; margin: 0;">All4You Auctions</h1>
                <p style="color: #666; margin: 5px 0;">South Africa's Premier Online Auction Platform</p>
              </div>
              <div style="background: #f8f9fa; padding: 30px; border-radius: 10px; border-left: 4px solid #d97706;">
                <h2 style="color: #333; margin-top: 0;">Welcome ${name}!</h2>
                <p style="color: #666; line-height: 1.6;">Thank you for registering with All4You Auctions. We're excited to have you join our community of bidders and sellers.</p>
                <p style="color: #666; line-height: 1.6;">To complete your registration and start participating in auctions, please verify your email address by clicking the button below:</p>
                <div style="text-align: center; margin: 30px 0;">
                  <a href="${verificationUrl}" style="background-color: #d97706; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; font-size: 16px; display: inline-block;">✅ Verify My Email Address</a>
                </div>
                <div style="background: #fff3cd; border: 1px solid #ffeaa7; border-radius: 6px; padding: 15px; margin: 20px 0;">
                  <p style="margin: 0; color: #856404; font-size: 14px;"><strong>⏰ Important:</strong> This verification link will expire in 24 hours for security reasons.</p>
                </div>
                <div style="margin-top: 30px; padding-top: 20px; border-top: 1px solid #ddd;">
                  <h3 style="color: #333; margin-bottom: 10px;">What happens next?</h3>
                  <ol style="color: #666; line-height: 1.6;">
                    <li>Click the verification link above</li>
                    <li>Your account will be reviewed by our admin team</li>
                    <li>Your FICA documents will be verified</li>
                    <li>Once approved, you can start bidding on auctions!</li>
                  </ol>
                  <p>If you didn't create this account, please ignore this email.</p>
                  <p>For support, contact us at admin@all4youauctions.co.za</p>
                  <p style="margin-top: 20px;"><strong>All4You Auctions</strong><br>South Africa's Trusted Auction Platform</p>
                </div>
              </div>
            </div>
          `,
        });
        // Always log the verification link for local testing
        console.log(`✅ Verification email sent to ${email}`);
        console.log(`🔗 [LOCAL TESTING] Verification link: ${verificationUrl}`);
      } catch (emailError) {
        console.error('Failed to send verification email:', emailError);
        // Clean up files and pending user if email fails
        try {
          fs.unlinkSync(proofOfAddress.path);
          fs.unlinkSync(idCopy.path);
        } catch {}
        removePendingUser(verificationToken);
        return res.status(500).json({ error: 'Failed to send verification email. Please try again.' });
      }
    }
    // Registration route ends here
    res.json({
      status: 'success',
      message: 'Registration successful! Please check your email to verify your account.',
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
    const pendingUser = getPendingUserByToken(token);
    if (!pendingUser) {
      return res.status(400).json({ error: 'Invalid or expired verification token.' });
    }
    // Create the verified user
    const newUser = createVerifiedUser(pendingUser);
    // Remove from pending users
    removePendingUser(token);
    // Send welcome email to admin for FICA review
    if (sendMail) {
      try {
        await sendMail({
          to: 'admin@all4youauctions.co.za',
          subject: 'New User Registration - FICA Review Required',
          html: `
            <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
              <h2 style="color: #d97706;">New User Registration</h2>
              <p>A new user has completed email verification and requires FICA document review:</p>
              <ul>
                <li><strong>Name:</strong> ${newUser.name}</li>
                <li><strong>Email:</strong> ${newUser.email}</li>
                <li><strong>Cell:</strong> ${newUser.cell}</li>
                <li><strong>Registration Date:</strong> ${new Date(newUser.createdAt).toLocaleString()}</li>
              </ul>
              <p>Please review their FICA documents in the admin panel.</p>
            </div>
          `
        });
      } catch (emailError) {
        console.error('Failed to send admin notification:', emailError);
      }
    }
    // Issue JWT for immediate login
    const jwtToken = jwt.sign(
      {
        email: newUser.email,
        name: newUser.name,
        role: 'user',
        id: newUser.id
      },
      JWT_SECRET,
      { expiresIn: JWT_EXPIRES_IN }
    );
    res.json({
      status: 'success',
      message: 'Email verified successfully! Your account is now active, but FICA approval is still pending.',
      token: jwtToken,
      user: {
        email: newUser.email,
        name: newUser.name,
        role: 'user',
        ficaApproved: newUser.ficaApproved,
        isActive: newUser.isActive
      }
    });
  } catch (error) {
    console.error('Email verification error:', error);
    res.status(500).json({ error: 'Verification failed. Please try again.' });
  }
});

// POST /api/auth/resend-verification
router.post('/resend-verification', async (req, res) => {
  const { email } = req.body;
  
  if (!email) {
    return res.status(400).json({ error: 'Email required.' });
  }
  
  try {
    // Check if user is already verified
    const users = readUsers();
    if (users.find(u => u.email === email)) {
      return res.status(400).json({ error: 'Email already verified.' });
    }
    
    // Find pending user
    const pendingUsers = readPendingUsers();
    const pendingUser = pendingUsers.find(u => u.email === email);
    
    if (!pendingUser) {
      return res.status(404).json({ error: 'No pending registration found for this email.' });
    }
    
    // Create new verification token
    const newToken = uuidv4();
    const expiresAt = Date.now() + (24 * 60 * 60 * 1000); // 24 hours
    
    // Update pending user with new token
    pendingUser.verificationToken = newToken;
    pendingUser.expiresAt = expiresAt;
    
    const filtered = pendingUsers.filter(u => u.email !== email);
    filtered.push(pendingUser);
    writePendingUsers(filtered);
    
    // Send new verification email
    if (sendMail) {
      const verificationUrl = `${process.env.NEXT_PUBLIC_BASE_URL}/verify-email?token=${newToken}`;
      
      await sendMail({
        to: email,
        subject: 'Resent: Verify Your Email - All4You Auctions',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #d97706;">Email Verification Resent</h2>
            <p>Hi ${pendingUser.name},</p>
            <p>Here's your new verification link for All4You Auctions:</p>
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background-color: #d97706; color: white; padding: 12px 24px; text-decoration: none; border-radius: 5px; font-weight: bold;">
                Verify Email Address
              </a>
            </div>
            <p><strong>This link will expire in 24 hours.</strong></p>
          </div>
        `
      });
    }
    
    res.json({ 
      status: 'success', 
      message: 'Verification email sent successfully.' 
    });
    
  } catch (error) {
    console.error('Resend verification error:', error);
    res.status(500).json({ error: 'Failed to resend verification email.' });
  }
});

module.exports = router;
