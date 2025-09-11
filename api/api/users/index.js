const express = require('express');
const fs = require('fs');
const path = require('path');
const multer = require('multer');
const bcrypt = require('bcryptjs');
const { v4: uuidv4 } = require('uuid');
const { authenticateToken } = require('../../middleware/auth');
const verifyAdmin = require('../auth/verify-admin');
const dbModels = require('../../database/models');
const cloudinaryService = require('../../services/cloudinaryService');
const router = express.Router();

// Legacy JSON path for backup/migration only
const usersPath = path.join(__dirname, '../../data/users.json');
const uploadDir = path.join(__dirname, '../../uploads/fica');

// Ensure upload directory exists
if (!fs.existsSync(uploadDir)) {
  fs.mkdirSync(uploadDir, { recursive: true });
}

// Configure multer for memory storage (files will be stored in PostgreSQL)
const storage = multer.memoryStorage();

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

// JSON file operations removed - all user data now handled via PostgreSQL database

// Production: No demo users auto-created

// ✅ POST: FICA re-upload (user can re-upload FICA docs if rejected or updating)
router.post('/fica-reupload/:email', upload.fields([
  { name: 'idDocument', maxCount: 1 },
  { name: 'proofOfAddress', maxCount: 1 },
  { name: 'bankStatement', maxCount: 1 }
]), async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const user = await dbModels.getUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Build update data for FICA documents
    const updateData = {
      ficaApproved: false,
      rejection_reason: null // Clear rejection reason
    };

    // Upload files to Cloudinary and get URLs
    if (req.files.idDocument) {
      const file = req.files.idDocument[0];
      console.log('📄 Uploading ID document to Cloudinary...');
      
      const uploadResult = await cloudinaryService.uploadFicaDocument(file.buffer, {
        originalname: file.originalname,
        mimetype: file.mimetype,
        userEmail: email
      });
      
      const ficaDoc = await dbModels.storeFicaDocument({
        user_email: email,
        file_url: uploadResult.url,
        original_filename: file.originalname,
        file_size: uploadResult.size,
        mime_type: file.mimetype
      });
      updateData.idDocument = ficaDoc.file_url;
      console.log('✅ ID document uploaded:', uploadResult.url);
    }
    if (req.files.proofOfAddress) {
      const file = req.files.proofOfAddress[0];
      console.log('📄 Uploading proof of address to Cloudinary...');
      
      const uploadResult = await cloudinaryService.uploadFicaDocument(file.buffer, {
        originalname: file.originalname,
        mimetype: file.mimetype,
        userEmail: email
      });
      
      const ficaDoc = await dbModels.storeFicaDocument({
        user_email: email,
        file_url: uploadResult.url,
        original_filename: file.originalname,
        file_size: uploadResult.size,
        mime_type: file.mimetype
      });
      updateData.proofOfAddress = ficaDoc.file_url;
      console.log('✅ Proof of address uploaded:', uploadResult.url);
    }
    if (req.files.bankStatement) {
      const file = req.files.bankStatement[0];
      console.log('📄 Uploading bank statement to Cloudinary...');
      
      const uploadResult = await cloudinaryService.uploadFicaDocument(file.buffer, {
        originalname: file.originalname,
        mimetype: file.mimetype,
        userEmail: email
      });
      
      const ficaDoc = await dbModels.storeFicaDocument({
        user_email: email,
        file_url: uploadResult.url,
        original_filename: file.originalname,
        file_size: uploadResult.size,
        mime_type: file.mimetype
      });
      updateData.bankStatement = ficaDoc.file_url;
      console.log('✅ Bank statement uploaded:', uploadResult.url);
    }

    // Update user in database
    const updatedUser = await dbModels.updateUser(email, updateData);
    
    // Transform response to match expected format
    const userResponse = {
      email: updatedUser.email,
      name: updatedUser.name,
      phone: updatedUser.phone,
      address: updatedUser.address,
      city: updatedUser.city,
      postalCode: updatedUser.postal_code,
      ficaApproved: updatedUser.fica_approved,
      emailVerified: updatedUser.email_verified,
      suspended: updatedUser.suspended,
      rejectionReason: updatedUser.rejection_reason,
      registeredAt: updatedUser.created_at,
      resubmittedAt: new Date().toISOString(),
      idDocument: updateData.idDocument || null,
      proofOfAddress: updateData.proofOfAddress || null,
      bankStatement: updateData.bankStatement || null
    };
    
    res.json({ message: 'FICA documents re-uploaded. Pending admin review.', user: userResponse });
  } catch (error) {
    console.error('Error during FICA reupload:', error);
    res.status(500).json({ error: 'Failed to reupload FICA documents' });
  }
});

// ✅ GET pending registrations (admin only) - MIGRATED TO POSTGRESQL
router.get('/pending', verifyAdmin, async (req, res) => {
  try {
    // Get unverified users from database (pending email verification)
    const pendingUsers = await dbModels.getPendingUsers();
    
    // Remove sensitive data before sending to frontend
    const safePendingUsers = pendingUsers.map(user => ({
      email: user.email,
      name: user.name,
      phone: user.phone,
      createdAt: user.created_at,
      emailVerified: user.email_verified,
      ficaApproved: user.fica_approved,
      idDocument: user.idDocument ? 'Uploaded' : 'Not uploaded',
      proofOfAddress: user.proofOfAddress ? 'Uploaded' : 'Not uploaded'
    }));
    
    res.json(safePendingUsers);
  } catch (error) {
    console.error('Error reading pending users:', error);
    res.status(500).json({ error: 'Failed to read pending users' });
  }
});

// ✅ GET all users
router.get('/', async (req, res) => {
  try {
    // Get users from database instead of JSON file
    const users = await dbModels.getAllUsers();
    
    // Get deposit data from database and merge it with users
    const deposits = await dbModels.getAllDeposits();
    
    // Add deposit information to each user
    const usersWithDeposits = users.map(user => ({
      ...user,
      deposits: deposits.filter(d => d.user_email === user.email).map(d => ({
        auctionId: d.auction_id,
        status: d.status === 'approved' ? 'paid' : d.status === 'pending' ? 'pending' : d.status,
        returned: d.status === 'returned'
      }))
    }));
    
    res.json(usersWithDeposits);
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// ✅ GET current user profile (authenticated user's own profile)
router.get('/profile', authenticateToken, async (req, res) => {
  try {
    const user = await dbModels.getUserWithExtendedData(req.user.email);
    if (!user) return res.status(404).json({ error: 'User profile not found' });
    
    // Return safe profile data without sensitive info
    const { password_hash: _, ...safeUser } = user;
    
    // Transform to match expected format
    const profileData = {
      email: user.email,
      name: user.name,
      phone: user.phone,
      address: user.address,
      city: user.city,
      postalCode: user.postal_code,
      ficaApproved: user.fica_approved,
      emailVerified: user.email_verified,
      suspended: user.suspended,
      registeredAt: user.created_at,
      idDocument: user.idDocument,
      proofOfAddress: user.proofOfAddress,
      bankStatement: user.bankStatement,
      watchlist: user.watchlist
    };
    
    res.json(profileData);
  } catch (error) {
    console.error('Error fetching user profile:', error);
    res.status(500).json({ error: 'Failed to fetch user profile' });
  }
});

// ✅ GET current user FICA status
router.get('/fica-status', authenticateToken, async (req, res) => {
  try {
    const user = await dbModels.getUserByEmail(req.user.email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    res.json({
      ficaApproved: user.fica_approved || false,
      ficaStatus: user.fica_approved ? 'approved' : 'pending',
      rejectionReason: user.rejection_reason || null,
      rejectedAt: user.rejectedAt || null, // This field needs to be added to DB if needed
      resubmittedAt: user.resubmittedAt || null // This field needs to be added to DB if needed
    });
  } catch (error) {
    console.error('Error fetching FICA status:', error);
    res.status(500).json({ error: 'Failed to fetch FICA status' });
  }
});

// ✅ GET single user by email
router.get('/:email', async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    const user = await dbModels.getUserWithExtendedData(email);
    if (!user) return res.status(404).json({ error: 'User not found' });
    
    // Transform to match expected format
    const userData = {
      email: user.email,
      name: user.name,
      phone: user.phone,
      address: user.address,
      city: user.city,
      postalCode: user.postal_code,
      ficaApproved: user.fica_approved,
      emailVerified: user.email_verified,
      suspended: user.suspended,
      suspensionReason: user.suspension_reason,
      rejectionReason: user.rejection_reason,
      registeredAt: user.created_at,
      idDocument: user.idDocument,
      proofOfAddress: user.proofOfAddress,
      bankStatement: user.bankStatement,
      watchlist: user.watchlist
    };
    
    res.json(userData);
  } catch (error) {
    console.error('Error fetching user:', error);
    res.status(500).json({ error: 'Failed to fetch user' });
  }
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

  // Check if user already exists in database
  try {
    const existingUser = await dbModels.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'Email already exists' });
    }
  } catch (error) {
    console.error('Error checking existing user:', error);
    return res.status(500).json({ error: 'Registration failed. Please try again.' });
  }

  try {
    // Hash the password with bcrypt
    const saltRounds = 12;
    const hashedPassword = await bcrypt.hash(password, saltRounds);

    // Store FICA documents in PostgreSQL
    const idDocFile = req.files.idDocument[0];
    const proofOfAddressFile = req.files.proofOfAddress[0];
    
    const idDocData = await dbModels.storeFicaDocument({
      user_email: email,
      file_url: `data:${idDocFile.mimetype};base64,${idDocFile.buffer.toString('base64')}`,
      original_filename: idDocFile.originalname,
      file_size: idDocFile.size,
      mime_type: idDocFile.mimetype
    });
    
    const proofDocData = await dbModels.storeFicaDocument({
      user_email: email,
      file_url: `data:${proofOfAddressFile.mimetype};base64,${proofOfAddressFile.buffer.toString('base64')}`,
      original_filename: proofOfAddressFile.originalname,
      file_size: proofOfAddressFile.size,
      mime_type: proofOfAddressFile.mimetype
    });

    const newUserData = {
      email,
      password_hash: hashedPassword,
      name,
      phone: phone || '',
      idNumber: idNumber || '',
      address: address || '',
      city: city || '',
      postalCode: postalCode || '',
      ficaApproved: false,
      suspended: false
    };

    // Create user in database instead of JSON file
    const createdUser = await dbModels.createUser(newUserData);
    
    // Send email verification to the user
    try {
      const jwt = require('jsonwebtoken');
      const JWT_SECRET = process.env.JWT_SECRET;
      
      if (!JWT_SECRET) {
        throw new Error('JWT_SECRET environment variable is required');
      }
      
      // Generate verification token
      const verificationToken = jwt.sign({ email }, JWT_SECRET, { expiresIn: '24h' });
      const verificationUrl = `${process.env.FRONTEND_URL || 'https://www.all4youauctions.co.za'}/verify-email?token=${verificationToken}`;
      
      // Send verification email to user
      await sendMail({
        to: email,
        subject: '✅ Verify Your Email - All4You Auctions',
        html: `
          <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
            <div style="text-align: center; margin-bottom: 30px;">
              <h1 style="color: #059669; margin: 0;">All4You Auctions</h1>
              <p style="color: #6b7280; margin: 5px 0;">South Africa's Premier Auction House</p>
            </div>
            
            <h2 style="color: #374151;">Welcome ${name}!</h2>
            <p style="color: #6b7280; line-height: 1.6;">
              Thank you for registering with All4You Auctions. To complete your registration and start participating in auctions, please verify your email address by clicking the button below:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${verificationUrl}" 
                 style="background: #059669; color: white; padding: 15px 30px; text-decoration: none; border-radius: 8px; font-weight: bold; display: inline-block;">
                ✅ Verify Email Address
              </a>
            </div>
            
            <p style="color: #6b7280; font-size: 14px;">
              This verification link will expire in 24 hours. If you didn't request this, please ignore this email.
            </p>
            
            <div style="background: #f3f4f6; padding: 15px; border-radius: 8px; margin: 20px 0;">
              <h4>Next Steps:</h4>
              <ol style="color: #6b7280; margin: 0; padding-left: 20px;">
                <li>Verify your email address (click button above)</li>
                <li>Wait for FICA document approval from our team</li>
                <li>Start bidding on amazing auction items!</li>
              </ol>
            </div>
            
            <p>Best regards,<br><strong>All4You Auctions Team</strong></p>
          </div>
        `,
        text: `Welcome ${name}! Please verify your email by visiting: ${verificationUrl}`
      });
      
      console.log(`✅ Verification email sent to: ${email}`);
    } catch (emailError) {
      console.error('Failed to send verification email:', emailError);
      // Don't fail registration if email fails
    }
    
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
    
    // Transform database user to match expected frontend format
    const userResponse = {
      email: createdUser.email,
      name: createdUser.name,
      phone: createdUser.phone,
      idNumber: newUserData.idNumber, // This field isn't stored in DB yet
      address: createdUser.address,
      city: createdUser.city,
      postalCode: createdUser.postal_code,
      ficaApproved: createdUser.fica_approved,
      suspended: createdUser.suspended,
      registeredAt: createdUser.created_at,
      idDocument: newUserData.idDocument,
      proofOfAddress: newUserData.proofOfAddress,
      watchlist: []
    };
    
    res.status(201).json({ message: 'User registered', user: userResponse });
  } catch (error) {
    console.error('Error during user registration:', error);
    res.status(500).json({ error: 'Registration failed. Please try again.' });
  }
});

// ✅ PUT: Approve FICA
const { sendMail } = require('../../utils/mailer');

// ✅ POST: Admin endpoint to manually add missing users (for production fixes)
router.post('/admin/add-user', verifyAdmin, async (req, res) => {
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

    // Validate input
    if (!email || !name || !email.includes('@')) {
      return res.status(400).json({ error: 'Invalid email or name' });
    }

    // Check if user already exists in database
    const existingUser = await dbModels.getUserByEmail(email);
    if (existingUser) {
      return res.status(409).json({ error: 'User already exists' });
    }

    // Generate secure temporary password
    const bcrypt = require('bcryptjs');
    const tempPassword = require('crypto').randomBytes(12).toString('hex');
    const hashedPassword = await bcrypt.hash(tempPassword, 12);

    // Add the missing user with secure values
    const newUserData = {
      email,
      password_hash: hashedPassword,
      name,
      phone: '',
      address: '',
      city: '',
      postalCode: '',
      ficaApproved: false,
      suspended: false,
      watchlist: [],
      idDocument: 'admin_created_pending.pdf',
      proofOfAddress: 'admin_created_pending.pdf',
    };

    const createdUser = await dbModels.createUser(newUserData);
    
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

router.put('/fica/:email', verifyAdmin, async (req, res) => {
  try {
    const email = req.params.email;
    const user = await dbModels.getUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    // Update user's FICA approval in database
    const updatedUser = await dbModels.updateFicaApproval(email, true);

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

    // Transform response to match expected format
    const userResponse = {
      email: updatedUser.email,
      name: updatedUser.name,
      phone: updatedUser.phone,
      address: updatedUser.address,
      city: updatedUser.city,
      postalCode: updatedUser.postal_code,
      ficaApproved: updatedUser.fica_approved,
      emailVerified: updatedUser.email_verified,
      suspended: updatedUser.suspended,
      suspensionReason: updatedUser.suspension_reason,
      rejectionReason: updatedUser.rejection_reason,
      registeredAt: updatedUser.created_at
    };

    res.json({ message: 'FICA approved', user: userResponse });
  } catch (error) {
    console.error('Error approving FICA:', error);
    res.status(500).json({ error: 'Failed to approve FICA' });
  }
});

// ✅ PUT: Reject FICA with reason
router.put('/reject/:email', verifyAdmin, async (req, res) => {
  try {
    const email = req.params.email;
    const user = await dbModels.getUserByEmail(email);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const { reason } = req.body;
    if (!reason) return res.status(400).json({ error: 'Rejection reason required' });

    // Update user's FICA rejection in database
    const updatedUser = await dbModels.updateFicaApproval(email, false, reason);

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

    // Transform response to match expected format
    const userResponse = {
      email: updatedUser.email,
      name: updatedUser.name,
      phone: updatedUser.phone,
      address: updatedUser.address,
      city: updatedUser.city,
      postalCode: updatedUser.postal_code,
      ficaApproved: updatedUser.fica_approved,
      emailVerified: updatedUser.email_verified,
      suspended: updatedUser.suspended,
      suspensionReason: updatedUser.suspension_reason,
      rejectionReason: updatedUser.rejection_reason,
      registeredAt: updatedUser.created_at,
      rejectedAt: new Date().toISOString()
    };

    res.json({ message: 'FICA documents rejected', user: userResponse, reason });
  } catch (error) {
    console.error('Error rejecting FICA:', error);
    res.status(500).json({ error: 'Failed to reject FICA' });
  }
});


// ✅ PUT: Suspend user (admin only)
router.put('/suspend/:email', verifyAdmin, async (req, res) => {
  console.log('Suspend endpoint called for email:', req.params.email);
  console.log('Request body:', req.body);
  
  try {
    const email = req.params.email;
    const user = await dbModels.getUserByEmail(email);
    if (!user) {
      console.log('User not found:', email);
      return res.status(404).json({ error: 'User not found' });
    }

    // Set suspended to the value provided in the request body
    if (typeof req.body.suspended === 'boolean') {
      const updatedUser = await dbModels.updateUserSuspension(
        email, 
        req.body.suspended, 
        req.body.reason || null
      );
      
      console.log('User suspend status updated:', updatedUser.suspended);
      
      // Transform response to match expected format
      const userResponse = {
        email: updatedUser.email,
        name: updatedUser.name,
        phone: updatedUser.phone,
        address: updatedUser.address,
        city: updatedUser.city,
        postalCode: updatedUser.postal_code,
        ficaApproved: updatedUser.fica_approved,
        emailVerified: updatedUser.email_verified,
        suspended: updatedUser.suspended,
        suspensionReason: updatedUser.suspension_reason,
        rejectionReason: updatedUser.rejection_reason,
        registeredAt: updatedUser.created_at
      };
      
      res.json({ message: `User ${updatedUser.suspended ? 'suspended' : 'unsuspended'}`, user: userResponse });
    } else {
      console.log('Invalid suspended value:', req.body.suspended);
      res.status(400).json({ error: 'Missing or invalid suspended value' });
    }
  } catch (error) {
    console.error('Error updating user suspension:', error);
    res.status(500).json({ error: 'Failed to update user suspension' });
  }
});

// ✅ PUT: Update user (admin only) - MIGRATED TO POSTGRESQL
router.put('/:email', verifyAdmin, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    
    // Get user from database
    const user = await dbModels.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    // Update user in database
    const updatedUser = await dbModels.updateUser(email, req.body);
    
    console.log(`[ADMIN] Updated user ${email}:`, Object.keys(req.body));
    res.json({ message: 'User updated', user: updatedUser });
    
  } catch (error) {
    console.error('Error updating user:', error);
    res.status(500).json({ error: 'Failed to update user' });
  }
});

// ✅ PUT: Toggle item in user's watchlist (user only, not admin) - MIGRATED TO POSTGRESQL
router.put('/:email/watchlist', authenticateToken, async (req, res) => {
  try {
    const { lotId } = req.body;
    if (!lotId) return res.status(400).json({ error: 'Missing lotId' });

    const email = decodeURIComponent(req.params.email);
    
    // Get user with extended data (including watchlist)
    const user = await dbModels.getUserWithExtendedData(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    let watchlist = user.watchlist || [];

    if (watchlist.includes(lotId)) {
      watchlist = watchlist.filter(id => id !== lotId);
    } else {
      watchlist.push(lotId);
    }

    // Update watchlist in database
    await dbModels.updateUserWatchlist(email, watchlist);
    
    res.json({ message: 'Watchlist updated', watchlist });
    
  } catch (error) {
    console.error('Error updating watchlist:', error);
    res.status(500).json({ error: 'Failed to update watchlist' });
  }
});

// ✅ POST: Manually verify email (admin only) - MIGRATED TO POSTGRESQL
router.post('/:email/verify-email', verifyAdmin, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    
    // Find user in database
    const user = await dbModels.getUserByEmail(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    if (user.email_verified) {
      return res.status(400).json({ error: 'Email already verified' });
    }
    
    // Mark email as verified in database
    const updatedUser = await dbModels.updateUser(email, {
      email_verified: true,
      verified_at: new Date().toISOString()
    });
    
    console.log(`✅ Admin manually verified email for: ${email}`);
    
    // Transform response to match expected format
    const userResponse = {
      email: updatedUser.email,
      name: updatedUser.name,
      phone: updatedUser.phone,
      address: updatedUser.address,
      city: updatedUser.city,
      postalCode: updatedUser.postal_code,
      ficaApproved: updatedUser.fica_approved,
      emailVerified: updatedUser.email_verified,
      suspended: updatedUser.suspended,
      registeredAt: updatedUser.created_at
    };
    
    res.json({ message: 'Email verified successfully', user: userResponse });
    
  } catch (error) {
    console.error('Manual email verification error:', error);
    res.status(500).json({ error: 'Failed to verify email' });
  }
});

// ✅ DELETE user by email (admin only) - MIGRATED TO POSTGRESQL
router.delete('/:email', verifyAdmin, async (req, res) => {
  try {
    const email = decodeURIComponent(req.params.email);
    
    // Get user data first (including FICA documents)
    const user = await dbModels.getUserWithExtendedData(email);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Clean up user's FICA documents if they exist
    const documentsToDelete = [];
    if (user.idDocument) documentsToDelete.push(user.idDocument);
    if (user.proofOfAddress) documentsToDelete.push(user.proofOfAddress);
    if (user.bankStatement) documentsToDelete.push(user.bankStatement);
    
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
    
    // Delete user from database
    const deletedUser = await dbModels.deleteUser(email);
    
    console.log(`✅ User ${email} deleted from database${documentsToDelete.length > 0 ? ` with ${documentsToDelete.length} documents` : ''}`);
    
    res.json({ 
      message: 'User deleted successfully', 
      user: deletedUser,
      documentsDeleted: documentsToDelete.length 
    });
    
  } catch (error) {
    console.error('Error deleting user:', error);
    res.status(500).json({ error: 'Failed to delete user' });
  }
});

module.exports = router;
