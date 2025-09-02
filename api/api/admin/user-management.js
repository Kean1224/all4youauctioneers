const express = require('express');
const bcrypt = require('bcryptjs');
const { verifyAdmin } = require('../../middleware/auth');
const dbManager = require('../../database/connection');

const router = express.Router();

// GET /api/admin/users - List all users with roles
router.get('/users', verifyAdmin, async (req, res) => {
  try {
    const result = await dbManager.query(`
      SELECT id, email, name, role, email_verified, fica_approved, 
             suspended, created_at, updated_at
      FROM users 
      ORDER BY created_at DESC
    `);
    
    res.json({
      users: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching users:', error);
    res.status(500).json({ error: 'Failed to fetch users' });
  }
});

// POST /api/admin/users/:id/promote - Promote user to admin
router.post('/users/:id/promote', verifyAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const { role = 'admin' } = req.body;
    
    // Validate role
    if (!['admin', 'user'].includes(role)) {
      return res.status(400).json({ error: 'Invalid role. Must be "admin" or "user"' });
    }
    
    const result = await dbManager.query(
      'UPDATE users SET role = $1, updated_at = NOW() WHERE id = $2 RETURNING id, email, name, role',
      [role, id]
    );
    
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    const user = result.rows[0];
    
    // Security logging
    console.log(`[SECURITY] ${new Date().toISOString()}: USER_ROLE_CHANGED`, {
      adminUser: req.user.email,
      targetUser: user.email,
      newRole: role,
      userId: id
    });
    
    res.json({
      message: `User ${user.email} role updated to ${role}`,
      user: user
    });
    
  } catch (error) {
    console.error('Error updating user role:', error);
    res.status(500).json({ error: 'Failed to update user role' });
  }
});

// POST /api/admin/users/create-admin - Create new admin user
router.post('/users/create-admin', verifyAdmin, async (req, res) => {
  try {
    const { email, password, name } = req.body;
    
    if (!email || !password || !name) {
      return res.status(400).json({ 
        error: 'Email, password, and name are required' 
      });
    }
    
    // Check if user already exists
    const existingUser = await dbManager.query(
      'SELECT id FROM users WHERE email = $1',
      [email]
    );
    
    if (existingUser.rows.length > 0) {
      return res.status(400).json({ error: 'User with this email already exists' });
    }
    
    // Hash password
    const hashedPassword = await bcrypt.hash(password, 12);
    
    // Create admin user
    const result = await dbManager.query(`
      INSERT INTO users (email, password_hash, name, role, email_verified, fica_approved, created_at, updated_at)
      VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
      RETURNING id, email, name, role, created_at
    `, [email, hashedPassword, name, 'admin', true, true]);
    
    const newAdmin = result.rows[0];
    
    // Security logging
    console.log(`[SECURITY] ${new Date().toISOString()}: ADMIN_USER_CREATED`, {
      createdBy: req.user.email,
      newAdmin: newAdmin.email,
      adminId: newAdmin.id
    });
    
    res.status(201).json({
      message: 'Admin user created successfully',
      user: {
        id: newAdmin.id,
        email: newAdmin.email,
        name: newAdmin.name,
        role: newAdmin.role,
        created_at: newAdmin.created_at
      }
    });
    
  } catch (error) {
    console.error('Error creating admin user:', error);
    res.status(500).json({ error: 'Failed to create admin user' });
  }
});

// GET /api/admin/users/admins - List all admin users
router.get('/users/admins', verifyAdmin, async (req, res) => {
  try {
    const result = await dbManager.query(`
      SELECT id, email, name, role, email_verified, created_at, updated_at
      FROM users 
      WHERE role = 'admin'
      ORDER BY created_at DESC
    `);
    
    res.json({
      admins: result.rows,
      total: result.rows.length
    });
  } catch (error) {
    console.error('Error fetching admin users:', error);
    res.status(500).json({ error: 'Failed to fetch admin users' });
  }
});

module.exports = router;