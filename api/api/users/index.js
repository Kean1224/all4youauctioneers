const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../../middleware/auth');
const verifyAdmin = require('../auth/verify-admin');
const router = express.Router();

const usersPath = path.join(__dirname, '../../data/users.json');
const uploadDir = path.join(__dirname, '../../uploads/fica');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer with PDF support
const storage = multer.diskStorage({
  destination: uploadDir,
  filename: (req, file, cb) => {
    // Use UUID for secure filename generation
    const { v4: uuidv4 } = require('uuid');
    
    // Validate and sanitize extension
    const ext = path.extname(file.originalname).toLowerCase();
    const allowedExtensions = ['.jpg', '.jpeg', '.png', '.pdf', '.gif'];
    
    if (!allowedExtensions.includes(ext)) {
      return cb(new Error('Invalid file type'), null);
    }
    
    const prefix = file.fieldname === 'idDocument' ? 'id' : 'proof';
    const secureFilename = `${prefix}-${uuidv4()}${ext}`;
    cb(null, secureFilename);
  }
});

// File filter to accept images and PDFs
const fileFilter = (req, file, cb) => {
  // Accept image files and PDFs
  if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
    cb(null, true);
  } else {
    cb(new Error('Only image files and PDFs are allowed!'), false);
  }
};

const upload = multer({ 
  storage,
  fileFilter,
  limits: {
    fileSize: 10 * 1024 * 1024 // 10MB limit
  }
});

// Helpers
function readUsers() {
  if (!fs.existsSync(usersPath)) return [];
  return JSON.parse(fs.readFileSync(usersPath, 'utf-8'));
}
function writeUsers(data) {
  fs.writeFileSync(usersPath, JSON.stringify(data, null, 2), 'utf-8');
}

// Production: No demo users auto-created

// ✅ POST: FICA re-upload (user can re-upload FICA docs if rejected or updating)
router.post('/fica-reupload/:email', upload.fields([
  { name: 'idDocument', maxCount: 1 },
  { name: 'proofOfAddress', maxCount: 1 },
  { name: 'bankStatement', maxCount: 1 }
]), (req, res) => {
  const users = readUsers();
  const email = decodeURIComponent(req.params.email);
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: 'User not found' });

  // Overwrite FICA docs if provided
  if (req.files.idDocument) {
    user.idDocument = req.files.idDocument[0].filename;
  }
  if (req.files.proofOfAddress) {
    user.proofOfAddress = req.files.proofOfAddress[0].filename;
  }
  if (req.files.bankStatement) {
    user.bankStatement = req.files.bankStatement[0].filename;
  }
  
  // Reset approval status and clear rejection reason
  user.ficaApproved = false;
  delete user.rejectionReason;
  delete user.rejectedAt;
  user.resubmittedAt = new Date().toISOString();
  
  writeUsers(users);
  res.json({ message: 'FICA documents re-uploaded. Pending admin review.', user });
});

// ✅ GET pending registrations (admin only)
router.get('/pending', verifyAdmin, (req, res) => {
  const PENDING_USERS_FILE = path.join(__dirname, '../../data/pending-registrations.json');
  
  try {
    if (!fs.existsSync(PENDING_USERS_FILE)) {
      return res.json([]);
    }
    
    const pendingUsers = JSON.parse(fs.readFileSync(PENDING_USERS_FILE, 'utf-8'));
    
    // Remove sensitive data before sending to frontend
    const safePendingUsers = pendingUsers.map(user => ({
      email: user.email,
      name: user.name,
      username: user.username,
      cell: user.cell,
      createdAt: user.createdAt,
      expiresAt: user.expiresAt,
      idDocument: user.idDocument,
      proofOfAddress: user.proofOfAddress
    }));
    
    res.json(safePendingUsers);
  } catch (error) {
    console.error('Error reading pending users:', error);
    res.status(500).json({ error: 'Failed to read pending users' });
  }
});

// ✅ GET all users
router.get('/', (req, res) => {
  const users = readUsers();
  
  // Load deposit data and merge it with users
  const depositsPath = path.join(__dirname, '../deposits/../../data/auctionDeposits.json');
  let deposits = [];
  if (fs.existsSync(depositsPath)) {
    deposits = JSON.parse(fs.readFileSync(depositsPath, 'utf-8'));
  }
  
  // Add deposit information to each user
  const usersWithDeposits = users.map(user => ({
    ...user,
    deposits: deposits.filter(d => d.email === user.email).map(d => ({
      auctionId: d.auctionId,
      status: d.status === 'approved' ? 'paid' : d.status === 'pending' ? 'pending' : d.status,
      returned: d.status === 'returned'
    }))
  }));
  
  res.json(usersWithDeposits);
});

// ✅ GET current user profile (authenticated user's own profile)
router.get('/profile', authenticateToken, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.email === req.user.email);
  if (!user) return res.status(404).json({ error: 'User profile not found' });
  
  // Return safe profile data without sensitive info
  const { password, ...safeUser } = user;
  res.json(safeUser);
});

// ✅ GET current user FICA status
router.get('/fica-status', authenticateToken, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.email === req.user.email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  
  res.json({
    ficaApproved: user.ficaApproved || false,
    ficaStatus: user.ficaApproved ? 'approved' : 'pending',
    rejectionReason: user.rejectionReason || null,
    rejectedAt: user.rejectedAt || null,
    resubmittedAt: user.resubmittedAt || null
  });
});

// ✅ GET single user by email
router.get('/:email', (req, res) => {
  const users = readUsers();
  const email = decodeURIComponent(req.params.email);
  const user = users.find(u => u.email === email);
  if (!user) return res.status(404).json({ error: 'User not found' });
  res.json(user);
});

// ✅ POST register (with FICA uploads)
router.post('/register', upload.fields([
  { name: 'idDocument', maxCount: 1 },
  { name: 'proofOfAddress', maxCount: 1 }
]), async (req, res) => {
  const { email, password, name, phone, idNumber, address, city, postalCode } = req.body;

  // Check for required text fields
  if (!email || !password || !name) {
    return res.status(400).json({ error: 'Missing required fields: email, password, or name.' });
  }

  // Check for required file uploads
  if (!req.files || !req.files.idDocument || !req.files.proofOfAddress) {
    return res.status(400).json({ error: 'Missing required documents: ID document and proof of address are required.' });
  }

  const users = readUsers();
  if (users.some(u => u.email === email)) {
    return res.status(409).json({ error: 'Email already exists' });
  }

  try {
    // Hash the password with bcrypt
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    const newUser = {
      email,
      password: hashedPassword,
      name,
      phone: phone || '',
      idNumber: idNumber || '',
      address: address || '',
      city: city || '',
      postalCode: postalCode || '',
      ficaApproved: false,
      suspended: false,
      registeredAt: new Date().toISOString(),
      idDocument: req.files.idDocument[0].filename,
      proofOfAddress: req.files.proofOfAddress[0].filename,
      watchlist: []
    };

    users.push(newUser);
    writeUsers(users);
    
    // Send admin notification email about new registration
    try {
      await sendMail({
        to: 'Admin@all4youauctions.co.za',
        subject: '🔔 New User Registration - FICA Approval Required',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
            <h2 style="color: #f59e0b;">🔔 New User Registration</h2>
            <p>A new user has registered and requires FICA document approval.</p>
            
            <div style="background: #fef3c7; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h3>User Details:</h3>
              <p><strong>Name:</strong> ${name}</p>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Phone:</strong> ${phone || 'Not provided'}</p>
              <p><strong>ID Number:</strong> ${idNumber || 'Not provided'}</p>
              <p><strong>Address:</strong> ${address || 'Not provided'}, ${city || ''} ${postalCode || ''}</p>
              <p><strong>Registration Date:</strong> ${new Date().toLocaleDateString()}</p>
            </div>
            
            <div style="background: #fee2e2; padding: 15px; border-radius: 8px; margin: 15px 0;">
              <h4 style="color: #dc2626;">📋 FICA Documents Uploaded:</h4>
              <p>✅ ID Document: ${req.files.idDocument[0].filename}</p>
              <p>✅ Proof of Address: ${req.files.proofOfAddress[0].filename}</p>
            </div>
            
            <div style="text-align: center; margin: 20px 0;">
              <a href="${process.env.FRONTEND_URL || 'https://www.all4youauctions.co.za'}/admin/users" 
                 style="background: #059669; color: white; padding: 12px 24px; text-decoration: none; border-radius: 8px; font-weight: bold;">
                👤 Review User in Admin Panel
              </a>
            </div>
            
            <p><strong>Action Required:</strong> Please review and approve/reject the FICA documents in the admin panel.</p>
            
            <p>Best regards,<br><strong>ALL4YOU AUCTIONS System</strong></p>
          </div>
        `,
        text: `
New User Registration - FICA Approval Required

User Details:
Name: ${name}
Email: ${email}
Phone: ${phone || 'Not provided'}
ID Number: ${idNumber || 'Not provided'}
Address: ${address || 'Not provided'}, ${city || ''} ${postalCode || ''}
Registration Date: ${new Date().toLocaleDateString()}

FICA Documents Uploaded:
- ID Document: ${req.files.idDocument[0].filename}
- Proof of Address: ${req.files.proofOfAddress[0].filename}

Action Required: Please review and approve/reject the FICA documents in the admin panel.
Admin Panel: ${process.env.FRONTEND_URL || 'https://www.all4youauctions.co.za'}/admin/users

- ALL4YOU AUCTIONS System
        `
      });
      console.log(`✅ Admin notification sent for new user registration: ${email}`);
    } catch (emailError) {
      console.error('Failed to send admin notification email:', emailError);
      // Don't fail the registration if email fails
    }
    
    // Return user data without password hash
    const { password: _, ...userWithoutPassword } = newUser;
    res.status(201).json({ message: 'User registered', user: userWithoutPassword });
  } catch (error) {
    console.error('Error hashing password during registration:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ✅ PUT: Approve FICA
const { sendMail } = require('../../utils/mailer');

// ✅ POST: Admin endpoint to manually add missing users (for production fixes)
router.post('/admin/add-user', async (req, res) => {
  try {
    const { email, name, adminSecret } = req.body;
    
    // Admin secret check using environment variable
    const ADMIN_SECRET = process.env.ADMIN_SECRET;
    if (!ADMIN_SECRET) {
      console.error('🚨 CRITICAL: ADMIN_SECRET environment variable not set!');
      return res.status(500).json({ error: 'Server configuration error' });
    }
    if (adminSecret !== ADMIN_SECRET) {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const users = readUsers();
    
    // Validate input
    if (!email || !name || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email or name' });
    }

    // Check if user already exists
    if (users.some(u => u.email === email)) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Generate secure temporary password
    const bcrypt = require('bcryptjs');
    const tempPassword = require('crypto').randomBytes(12).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Add the missing user with secure values
    const newUser = {
      email,
      password: hashedPassword,
      name,
      phone: '',
      idNumber: '',
      address: '',
      city: '',
      postalCode: '',
      ficaApproved: false,
      suspended: false,
      registeredAt: new Date().toISOString(),
      watchlist: [],
      deposits: [],
      idDocument: 'admin_created_pending.pdf',
      proofOfAddress: 'admin_created_pending.pdf',
      tempPassword: tempPassword, // Send to admin for user notification
      requirePasswordChange: true
    };

    users.push(newUser);
    writeUsers(users);
    
    console.log(`✅ Admin manually added user: ${email}`);
    res.status(201).json({ 
      message: 'User added successfully', 
      user: { email: newUser.email, name: newUser.name }
    });
  } catch (error) {
    console.error('Error adding user:', error);
    res.status(500).json({ error: 'Failed to add user' });
  }
});

router.put('/fica/:email', async (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.email === req.params.email);
  if (!user) return res.status(404).json({ error: 'User not found' });

  user.ficaApproved = true;
  writeUsers(users);

  // Send FICA approval email
  try {
    await sendMail({
      to: user.email,
      subject: 'FICA Approved - All4You Auctions',
      text: `Dear ${user.name || user.email},\n\nYour FICA documents have been approved. You can now participate fully in auctions.\n\nThank you!`,
      html: `<p>Dear ${user.name || user.email},</p><p>Your FICA documents have been <b>approved</b>. You can now participate fully in auctions.</p><p>Thank you!</p>`
    });
  } catch (e) {
    // Log but don't block approval
    console.error('Failed to send FICA approval email:', e);
  }

  res.json({ message: 'FICA approved', user });
});

// ✅ PUT: Reject FICA with reason
router.put('/reject/:email', async (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.email === req.params.email);
  if (!user) return res.status(404).json({ error: 'User not found' });

  const { reason } = req.body;
  if (!reason) return res.status(400).json({ error: 'Rejection reason required' });

  user.ficaApproved = false;
  user.rejectionReason = reason;
  user.rejectedAt = new Date().toISOString();
  writeUsers(users);

  // Send FICA rejection email
  try {
    await sendMail({
      to: user.email,
      subject: 'FICA Documents Need Review - All4You Auctions',
      text: `Dear ${user.name || user.email},\n\nYour FICA documents have been reviewed and need to be updated.\n\nReason: ${reason}\n\nPlease log in to your account and re-upload the required documents.\n\nThank you!`,
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #d97706;">FICA Documents Review Required</h2>
          <p>Dear ${user.name || user.email},</p>
          <p>Your FICA documents have been reviewed and need to be updated.</p>
          <div style="background-color: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px; margin: 20px 0;">
            <h4 style="margin: 0 0 8px 0; color: #92400e;">Reason for Review:</h4>
            <p style="margin: 0; color: #92400e;">${reason}</p>
          </div>
          <p>Please log in to your account and re-upload the required documents. Once updated, our team will review them again.</p>
          <p>If you have any questions, please don't hesitate to contact us.</p>
          <p>Thank you for your understanding!</p>
          <p>Best regards,<br>All4You Auctions Team</p>
        </div>
      `
    });
  } catch (e) {
    console.error('Failed to send FICA rejection email:', e);
  }

  res.json({ message: 'FICA documents rejected', user, reason });
});


// ✅ PUT: Suspend user (admin only)
router.put('/suspend/:email', verifyAdmin, (req, res) => {
  console.log('Suspend endpoint called for email:', req.params.email);
  console.log('Request body:', req.body);
  
  const users = readUsers();
  const user = users.find(u => u.email === req.params.email);
  if (!user) {
    console.log('User not found:', req.params.email);
    return res.status(404).json({ error: 'User not found' });
  }

  // Set suspended to the value provided in the request body
  if (typeof req.body.suspended === 'boolean') {
    user.suspended = req.body.suspended;
    writeUsers(users);
    console.log('User suspend status updated:', user.suspended);
    res.json({ message: `User ${user.suspended ? 'suspended' : 'unsuspended'}`, user });
  } else {
    console.log('Invalid suspended value:', req.body.suspended);
    res.status(400).json({ error: 'Missing or invalid suspended value' });
  }
});

// ✅ PUT: Update user (admin only)
router.put('/:email', verifyAdmin, (req, res) => {
  const users = readUsers();
  const user = users.find(u => u.email === req.params.email);
  if (!user) return res.status(404).json({ error: 'User not found' });

  Object.assign(user, req.body);
  writeUsers(users);
  res.json({ message: 'User updated', user });
});

// ✅ PUT: Toggle item in user's watchlist (user only, not admin)
router.put('/:email/watchlist', (req, res) => {
  const { lotId } = req.body;
  if (!lotId) return res.status(400).json({ error: 'Missing lotId' });

  const users = readUsers();
  const user = users.find(u => u.email === req.params.email);
  if (!user) return res.status(404).json({ error: 'User not found' });

  if (!user.watchlist) user.watchlist = [];

  if (user.watchlist.includes(lotId)) {
    user.watchlist = user.watchlist.filter(id => id !== lotId);
  } else {
    user.watchlist.push(lotId);
  }

  writeUsers(users);
  res.json({ message: 'Watchlist updated', watchlist: user.watchlist });
});

// ✅ POST: Manually verify email (admin only) 
router.post('/:email/verify-email', verifyAdmin, (req, res) => {
  const { createVerifiedUser } = require('../auth/email-verification');
  const PENDING_USERS_FILE = path.join(__dirname, '../../data/pending-registrations.json');
  
  try {
    // Read pending users
    if (!fs.existsSync(PENDING_USERS_FILE)) {
      return res.status(404).json({ error: 'No pending registrations found' });
    }
    
    const pendingUsers = JSON.parse(fs.readFileSync(PENDING_USERS_FILE, 'utf-8'));
    const pendingUser = pendingUsers.find(u => u.email === req.params.email);
    
    if (!pendingUser) {
      return res.status(404).json({ error: 'Pending registration not found' });
    }
    
    // Create verified user
    const newUser = createVerifiedUser(pendingUser);
    
    // Remove from pending users
    const updatedPending = pendingUsers.filter(u => u.email !== req.params.email);
    fs.writeFileSync(PENDING_USERS_FILE, JSON.stringify(updatedPending, null, 2));
    
    console.log(`✅ Admin manually verified email for: ${req.params.email}`);
    res.json({ message: 'Email verified successfully', user: newUser });
    
  } catch (error) {
    console.error('Manual email verification error:', error);
    res.status(500).json({ error: error.message });
  }
});

// ✅ DELETE user by email (admin only)
router.delete('/:email', verifyAdmin, (req, res) => {
  const users = readUsers();
  const email = decodeURIComponent(req.params.email);
  const idx = users.findIndex(u => u.email === email);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  
  const [deleted] = users.splice(idx, 1);
  
  // Clean up user's FICA documents if they exist
  const documentsToDelete = [];
  if (deleted.idDocument) documentsToDelete.push(deleted.idDocument);
  if (deleted.proofOfAddress) documentsToDelete.push(deleted.proofOfAddress);
  if (deleted.bankStatement) documentsToDelete.push(deleted.bankStatement);
  
  documentsToDelete.forEach(filename => {
    const filePath = path.join(uploadDir, filename);
    try {
      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        console.log(`✅ Deleted FICA document: ${filename}`);
      }
    } catch (error) {
      console.log(`⚠️  Could not delete file ${filename}:`, error.message);
    }
  });
  
  writeUsers(users);
  console.log(`✅ User ${email} deleted successfully${documentsToDelete.length > 0 ? ` with ${documentsToDelete.length} documents` : ''}`);
  
  res.json({ 
    message: 'User deleted successfully', 
    user: deleted,
    documentsDeleted: documentsToDelete.length 
  });
});

module.exports = router;
