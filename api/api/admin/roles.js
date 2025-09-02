const express = require('express');
const db = require('../../database/connection');
const { requirePermission, authenticateToken, PERMISSIONS } = require('../../middleware/rbac');
const router = express.Router();

// Apply authentication to all role management routes
router.use(authenticateToken);

// GET /api/admin/roles - List all roles
router.get('/', requirePermission('roles', 'read'), async (req, res) => {
  try {
    const query = `
      SELECT r.id, r.name, r.display_name, r.description, r.is_system_role, r.created_at,
             COUNT(ur.user_id) as user_count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = true
      GROUP BY r.id, r.name, r.display_name, r.description, r.is_system_role, r.created_at
      ORDER BY r.is_system_role DESC, r.name ASC
    `;
    
    const result = await db.query(query);
    
    res.json({
      roles: result.rows,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('Error fetching roles:', error);
    res.status(500).json({ error: 'Failed to fetch roles' });
  }
});

// GET /api/admin/roles/:id - Get specific role with permissions
router.get('/:id', requirePermission('roles', 'read'), async (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    
    if (isNaN(roleId)) {
      return res.status(400).json({ error: 'Invalid role ID' });
    }
    
    // Get role details
    const roleQuery = `
      SELECT r.id, r.name, r.display_name, r.description, r.is_system_role, r.created_at,
             COUNT(ur.user_id) as user_count
      FROM roles r
      LEFT JOIN user_roles ur ON r.id = ur.role_id AND ur.is_active = true
      WHERE r.id = $1
      GROUP BY r.id, r.name, r.display_name, r.description, r.is_system_role, r.created_at
    `;
    
    const roleResult = await db.query(roleQuery, [roleId]);
    
    if (roleResult.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    // Get role permissions
    const permissionsQuery = `
      SELECT p.id, p.name, p.resource, p.action, p.description
      FROM permissions p
      JOIN role_permissions rp ON p.id = rp.permission_id
      WHERE rp.role_id = $1
      ORDER BY p.resource, p.action
    `;
    
    const permissionsResult = await db.query(permissionsQuery, [roleId]);
    
    const role = {
      ...roleResult.rows[0],
      permissions: permissionsResult.rows
    };
    
    res.json({ role });
    
  } catch (error) {
    console.error('Error fetching role:', error);
    res.status(500).json({ error: 'Failed to fetch role details' });
  }
});

// POST /api/admin/roles - Create new role
router.post('/', requirePermission('roles', 'create'), async (req, res) => {
  try {
    const { name, display_name, description, permissions } = req.body;
    
    if (!name || !display_name) {
      return res.status(400).json({ error: 'Role name and display name are required' });
    }
    
    // Check if role name already exists
    const existingRole = await db.query('SELECT id FROM roles WHERE name = $1', [name]);
    if (existingRole.rows.length > 0) {
      return res.status(400).json({ error: 'Role name already exists' });
    }
    
    // Start transaction
    await db.query('BEGIN');
    
    try {
      // Create role
      const roleQuery = `
        INSERT INTO roles (name, display_name, description, is_system_role)
        VALUES ($1, $2, $3, false)
        RETURNING id, name, display_name, description, is_system_role, created_at
      `;
      
      const roleResult = await db.query(roleQuery, [name, display_name, description || null]);
      const newRole = roleResult.rows[0];
      
      // Add permissions if provided
      if (permissions && Array.isArray(permissions) && permissions.length > 0) {
        for (const permissionId of permissions) {
          await db.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
            [newRole.id, permissionId]
          );
        }
      }
      
      await db.query('COMMIT');
      
      console.log(`✅ Role created: ${name} by user ${req.user.email}`);
      
      res.status(201).json({
        message: 'Role created successfully',
        role: newRole
      });
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error creating role:', error);
    
    if (error.code === '23505') {
      res.status(400).json({ error: 'Role name must be unique' });
    } else {
      res.status(500).json({ error: 'Failed to create role' });
    }
  }
});

// PUT /api/admin/roles/:id - Update role
router.put('/:id', requirePermission('roles', 'update'), async (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    const { display_name, description, permissions } = req.body;
    
    if (isNaN(roleId)) {
      return res.status(400).json({ error: 'Invalid role ID' });
    }
    
    // Check if role exists and if it's a system role
    const existingRole = await db.query('SELECT * FROM roles WHERE id = $1', [roleId]);
    
    if (existingRole.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    if (existingRole.rows[0].is_system_role) {
      return res.status(400).json({ error: 'Cannot modify system roles' });
    }
    
    // Start transaction
    await db.query('BEGIN');
    
    try {
      // Update role details
      const updateQuery = `
        UPDATE roles 
        SET display_name = $1, description = $2, updated_at = CURRENT_TIMESTAMP
        WHERE id = $3
        RETURNING id, name, display_name, description, is_system_role, created_at, updated_at
      `;
      
      const result = await db.query(updateQuery, [display_name, description, roleId]);
      const updatedRole = result.rows[0];
      
      // Update permissions if provided
      if (permissions && Array.isArray(permissions)) {
        // Remove existing permissions
        await db.query('DELETE FROM role_permissions WHERE role_id = $1', [roleId]);
        
        // Add new permissions
        for (const permissionId of permissions) {
          await db.query(
            'INSERT INTO role_permissions (role_id, permission_id) VALUES ($1, $2)',
            [roleId, permissionId]
          );
        }
      }
      
      await db.query('COMMIT');
      
      console.log(`✅ Role updated: ${updatedRole.name} by user ${req.user.email}`);
      
      res.json({
        message: 'Role updated successfully',
        role: updatedRole
      });
      
    } catch (error) {
      await db.query('ROLLBACK');
      throw error;
    }
    
  } catch (error) {
    console.error('Error updating role:', error);
    res.status(500).json({ error: 'Failed to update role' });
  }
});

// DELETE /api/admin/roles/:id - Delete role
router.delete('/:id', requirePermission('roles', 'delete'), async (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    
    if (isNaN(roleId)) {
      return res.status(400).json({ error: 'Invalid role ID' });
    }
    
    // Check if role exists and if it's a system role
    const existingRole = await db.query('SELECT * FROM roles WHERE id = $1', [roleId]);
    
    if (existingRole.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    if (existingRole.rows[0].is_system_role) {
      return res.status(400).json({ error: 'Cannot delete system roles' });
    }
    
    // Check if role is assigned to any users
    const userCount = await db.query(
      'SELECT COUNT(*) as count FROM user_roles WHERE role_id = $1 AND is_active = true',
      [roleId]
    );
    
    if (parseInt(userCount.rows[0].count) > 0) {
      return res.status(400).json({ 
        error: `Cannot delete role: ${userCount.rows[0].count} users are assigned to this role` 
      });
    }
    
    // Delete role (cascades will handle permissions)
    await db.query('DELETE FROM roles WHERE id = $1', [roleId]);
    
    console.log(`🗑️ Role deleted: ${existingRole.rows[0].name} by user ${req.user.email}`);
    
    res.json({ message: 'Role deleted successfully' });
    
  } catch (error) {
    console.error('Error deleting role:', error);
    res.status(500).json({ error: 'Failed to delete role' });
  }
});

// GET /api/admin/roles/:id/users - Get users assigned to role
router.get('/:id/users', requirePermission('roles', 'read'), async (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    
    if (isNaN(roleId)) {
      return res.status(400).json({ error: 'Invalid role ID' });
    }
    
    const query = `
      SELECT u.id, u.email, u.name, ur.assigned_at, ur.is_active
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      WHERE ur.role_id = $1
      ORDER BY ur.assigned_at DESC
    `;
    
    const result = await db.query(query, [roleId]);
    
    res.json({
      users: result.rows,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('Error fetching role users:', error);
    res.status(500).json({ error: 'Failed to fetch role users' });
  }
});

// POST /api/admin/roles/:id/assign - Assign role to user
router.post('/:id/assign', requirePermission('roles', 'assign'), async (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    const { userId } = req.body;
    
    if (isNaN(roleId) || !userId) {
      return res.status(400).json({ error: 'Role ID and User ID are required' });
    }
    
    // Check if role and user exist
    const roleExists = await db.query('SELECT name FROM roles WHERE id = $1', [roleId]);
    const userExists = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
    
    if (roleExists.rows.length === 0) {
      return res.status(404).json({ error: 'Role not found' });
    }
    
    if (userExists.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    
    // Check if assignment already exists
    const existing = await db.query(
      'SELECT * FROM user_roles WHERE user_id = $1 AND role_id = $2',
      [userId, roleId]
    );
    
    if (existing.rows.length > 0) {
      if (existing.rows[0].is_active) {
        return res.status(400).json({ error: 'User is already assigned to this role' });
      } else {
        // Reactivate the assignment
        await db.query(
          'UPDATE user_roles SET is_active = true, assigned_at = CURRENT_TIMESTAMP WHERE user_id = $1 AND role_id = $2',
          [userId, roleId]
        );
      }
    } else {
      // Create new assignment
      await db.query(
        'INSERT INTO user_roles (user_id, role_id, is_active, assigned_at) VALUES ($1, $2, true, CURRENT_TIMESTAMP)',
        [userId, roleId]
      );
    }
    
    console.log(`✅ Role assigned: ${roleExists.rows[0].name} to ${userExists.rows[0].email} by ${req.user.email}`);
    
    res.json({ 
      message: `Role ${roleExists.rows[0].name} assigned to user successfully` 
    });
    
  } catch (error) {
    console.error('Error assigning role:', error);
    res.status(500).json({ error: 'Failed to assign role' });
  }
});

// DELETE /api/admin/roles/:id/revoke - Revoke role from user
router.delete('/:id/revoke', requirePermission('roles', 'assign'), async (req, res) => {
  try {
    const roleId = parseInt(req.params.id);
    const { userId } = req.body;
    
    if (isNaN(roleId) || !userId) {
      return res.status(400).json({ error: 'Role ID and User ID are required' });
    }
    
    // Get role and user info for logging
    const roleInfo = await db.query('SELECT name FROM roles WHERE id = $1', [roleId]);
    const userInfo = await db.query('SELECT email FROM users WHERE id = $1', [userId]);
    
    if (roleInfo.rows.length === 0 || userInfo.rows.length === 0) {
      return res.status(404).json({ error: 'Role or user not found' });
    }
    
    // Check if assignment exists
    const existing = await db.query(
      'SELECT * FROM user_roles WHERE user_id = $1 AND role_id = $2 AND is_active = true',
      [userId, roleId]
    );
    
    if (existing.rows.length === 0) {
      return res.status(400).json({ error: 'User is not assigned to this role' });
    }
    
    // Deactivate the assignment (soft delete)
    await db.query(
      'UPDATE user_roles SET is_active = false WHERE user_id = $1 AND role_id = $2',
      [userId, roleId]
    );
    
    console.log(`🚫 Role revoked: ${roleInfo.rows[0].name} from ${userInfo.rows[0].email} by ${req.user.email}`);
    
    res.json({ 
      message: `Role ${roleInfo.rows[0].name} revoked from user successfully` 
    });
    
  } catch (error) {
    console.error('Error revoking role:', error);
    res.status(500).json({ error: 'Failed to revoke role' });
  }
});

// GET /api/admin/roles/permissions - List all available permissions
router.get('/permissions/all', requirePermission('roles', 'read'), async (req, res) => {
  try {
    const query = `
      SELECT id, name, resource, action, description, created_at
      FROM permissions
      ORDER BY resource, action
    `;
    
    const result = await db.query(query);
    
    // Group by resource for better organization
    const grouped = result.rows.reduce((acc, permission) => {
      if (!acc[permission.resource]) {
        acc[permission.resource] = [];
      }
      acc[permission.resource].push(permission);
      return acc;
    }, {});
    
    res.json({
      permissions: result.rows,
      grouped,
      total: result.rows.length
    });
    
  } catch (error) {
    console.error('Error fetching permissions:', error);
    res.status(500).json({ error: 'Failed to fetch permissions' });
  }
});

module.exports = router;