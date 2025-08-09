const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const { v4: uuidv4 } = require('uuid');
const authenticateToken = require('../../middleware/auth');
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
    const email = req.body.email.replace(/[^a-zA-Z0-9]/g, '_'); // sanitize
    const ext = path.extname(file.originalname);
    const prefix = file.fieldname === 'idDocument' ? 'id' : 'proof';
    cb(null, `${email}-${prefix}${ext}`);
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

// Ensure demo user exists
function ensureDemoUser() {
  const users = readUsers();
  const demoExists = users.some(u => u.email === 'demo@example.com');

  if (!demoExists) {
    const demoUser = {
      email: 'demo@example.com',
      password: 'demo123',
      name: 'Demo User',
      ficaApproved: true,
      suspended: false,
      registeredAt: new Date().toISOString(),
      idDocument: 'demo_id.pdf',
      proofOfAddress: 'demo_proof.pdf',
      watchlist: []
    };
    users.push(demoUser);
    writeUsers(users);
    console.log('✅ Demo user added.');
  }
}
ensureDemoUser();

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

// ✅ GET single user
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
]), (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name || !req.files.idDocument || !req.files.proofOfAddress) {
    return res.status(400).json({ error: 'Missing required fields or documents.' });
  }

  const users = readUsers();
  if (users.some(u => u.email === email)) {
    return res.status(409).json({ error: 'Email already exists' });
  }

  const newUser = {
    email,
    password,
    name,
    ficaApproved: false,
    suspended: false,
    registeredAt: new Date().toISOString(),
    idDocument: req.files.idDocument[0].filename,
    proofOfAddress: req.files.proofOfAddress[0].filename
  };

  users.push(newUser);
  writeUsers(users);
  res.status(201).json({ message: 'User registered', user: newUser });
});

// ✅ PUT: Approve FICA
const { sendMail } = require('../../utils/mailer');

// ✅ POST: Admin endpoint to manually add missing users (for production fixes)
router.post('/admin/add-user', (req, res) => {
  try {
    const { email, name, adminSecret } = req.body;
    
    // Simple admin secret check (you should use proper admin auth in production)
    if (adminSecret !== 'all4you-admin-2025') {
      return res.status(403).json({ error: 'Unauthorized' });
    }

    const users = readUsers();
    
    // Check if user already exists
    if (users.some(u => u.email === email)) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Add the missing user with default values
    const newUser = {
      email,
      password: '$2b$10$placeholder.hash.for.manual.user', // Placeholder hash
      name,
      ficaApproved: false,
      suspended: false,
      registeredAt: new Date().toISOString(),
      watchlist: [],
      deposits: [],
      idDocument: 'manually_added.pdf', // Placeholder
      proofOfAddress: 'manually_added.pdf' // Placeholder
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

const verifyAdmin = require('../auth/verify-admin');

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

// ✅ DELETE user by email (admin only)
router.delete('/:email', verifyAdmin, (req, res) => {
  const users = readUsers();
  const email = decodeURIComponent(req.params.email);
  const idx = users.findIndex(u => u.email === email);
  if (idx === -1) return res.status(404).json({ error: 'User not found' });
  const [deleted] = users.splice(idx, 1);
  writeUsers(users);
  res.json({ message: 'User deleted', user: deleted });
});

module.exports = router;
