const jwt = require('jsonwebtoken');
const db = require('../database/connection');

const JWT_SECRET = process.env.JWT_SECRET;

if (!JWT_SECRET) {
  console.error('🚨 CRITICAL: JWT_SECRET environment variable not set!');
  throw new Error('JWT_SECRET environment variable is required');
}

// Get user by email for role queries
const getUserByEmail = async (email) => {
  try {
    const query = 'SELECT id, email FROM users WHERE email = $1';
    const result = await db.query(query, [email]);
    return result.rows[0] || null;
  } catch (error) {
    console.error('Error fetching user by email:', error);
    return null;
  }
};

// Get user permissions from database
const getUserPermissions = async (userId) => {
  try {
    const query = `
      SELECT DISTINCT p.name as permission, p.resource, p.action
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1 AND ur.is_active = true
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching user permissions:', error);
    return [];
  }
};

// Get user roles from database
const getUserRoles = async (userId) => {
  try {
    const query = `
      SELECT r.name, r.display_name, r.is_system_role
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1 AND ur.is_active = true
    `;
    const result = await db.query(query, [userId]);
    return result.rows;
  } catch (error) {
    console.error('Error fetching user roles:', error);
    return [];
  }
};

// Check if user has specific permission
const hasPermission = async (userId, resource, action) => {
  try {
    const query = `
      SELECT 1
      FROM users u
      JOIN user_roles ur ON u.id = ur.user_id
      JOIN roles r ON ur.role_id = r.id
      JOIN role_permissions rp ON r.id = rp.role_id
      JOIN permissions p ON rp.permission_id = p.id
      WHERE u.id = $1 
        AND p.resource = $2 
        AND p.action = $3 
        AND ur.is_active = true
      LIMIT 1
    `;
    const result = await db.query(query, [userId, resource, action]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking permission:', error);
    return false;
  }
};

// Check if user has any of the specified roles
const hasRole = async (userId, roles) => {
  try {
    const roleArray = Array.isArray(roles) ? roles : [roles];
    const query = `
      SELECT 1
      FROM user_roles ur
      JOIN roles r ON ur.role_id = r.id
      WHERE ur.user_id = $1 
        AND r.name = ANY($2)
        AND ur.is_active = true
      LIMIT 1
    `;
    const result = await db.query(query, [userId, roleArray]);
    return result.rows.length > 0;
  } catch (error) {
    console.error('Error checking role:', error);
    return false;
  }
};

// Middleware to verify JWT and extract user info with enhanced support
const authenticateToken = async (req, res, next) => {
  const token = req.cookies?.jwt || req.headers.authorization?.replace('Bearer ', '');
  
  if (!token) {
    return res.status(401).json({ error: 'Authentication token required' });
  }

  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    
    // Get user ID from database if not in token
    if (!decoded.userId && decoded.email) {
      const user = await getUserByEmail(decoded.email);
      if (user) {
        decoded.userId = user.id;
      }
    }
    
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({ error: 'Invalid or expired token' });
  }
};

// Middleware to check if user has required permission
const requirePermission = (resource, action) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const hasAccess = await hasPermission(req.user.userId, resource, action);
      
      if (!hasAccess) {
        const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
        console.log(`🚫 RBAC: Permission denied for user ${req.user.email} - Required: ${resource}:${action} - IP: ${clientIP}`);
        return res.status(403).json({ 
          error: 'Insufficient permissions',
          required: `${resource}:${action}`
        });
      }

      next();
    } catch (error) {
      console.error('Permission check error:', error);
      res.status(500).json({ error: 'Permission verification failed' });
    }
  };
};

// Middleware to check if user has required role
const requireRole = (roles) => {
  return async (req, res, next) => {
    try {
      if (!req.user || !req.user.userId) {
        return res.status(401).json({ error: 'User not authenticated' });
      }

      const hasRequiredRole = await hasRole(req.user.userId, roles);
      
      if (!hasRequiredRole) {
        const clientIP = req.headers['x-forwarded-for'] || req.connection.remoteAddress || req.ip;
        const roleList = Array.isArray(roles) ? roles.join(', ') : roles;
        console.log(`🚫 RBAC: Role denied for user ${req.user.email} - Required: ${roleList} - IP: ${clientIP}`);
        return res.status(403).json({ 
          error: 'Insufficient role privileges',
          required_roles: Array.isArray(roles) ? roles : [roles]
        });
      }

      next();
    } catch (error) {
      console.error('Role check error:', error);
      res.status(500).json({ error: 'Role verification failed' });
    }
  };
};

// Admin middleware (backwards compatibility)
const requireAdmin = requireRole('admin');

// Middleware to add user permissions to request object
const attachPermissions = async (req, res, next) => {
  try {
    if (req.user && req.user.userId) {
      req.user.permissions = await getUserPermissions(req.user.userId);
      req.user.roles = await getUserRoles(req.user.userId);
    }
    next();
  } catch (error) {
    console.error('Error attaching permissions:', error);
    next(); // Continue without permissions rather than fail
  }
};

// Utility function to check multiple permissions (OR logic)
const hasAnyPermission = async (userId, permissionChecks) => {
  for (const check of permissionChecks) {
    if (await hasPermission(userId, check.resource, check.action)) {
      return true;
    }
  }
  return false;
};

// Utility function to check multiple permissions (AND logic)
const hasAllPermissions = async (userId, permissionChecks) => {
  for (const check of permissionChecks) {
    if (!(await hasPermission(userId, check.resource, check.action))) {
      return false;
    }
  }
  return true;
};

// Resource ownership check
const canAccessOwnResource = (resourceUserIdField = 'user_id') => {
  return (req, res, next) => {
    const resourceUserId = req.body[resourceUserIdField] || req.params[resourceUserIdField];
    
    if (req.user.userId === parseInt(resourceUserId)) {
      return next();
    }
    
    return res.status(403).json({ 
      error: 'Access denied: Can only access your own resources' 
    });
  };
};

module.exports = {
  // Core functions
  getUserByEmail,
  getUserPermissions,
  getUserRoles,
  hasPermission,
  hasRole,
  hasAnyPermission,
  hasAllPermissions,
  
  // Middleware functions
  authenticateToken,
  requirePermission,
  requireRole,
  requireAdmin,
  attachPermissions,
  canAccessOwnResource,
  
  // Utility constants
  PERMISSIONS: {
    USERS: {
      CREATE: 'users:create',
      READ: 'users:read',
      UPDATE: 'users:update',
      DELETE: 'users:delete',
      LIST: 'users:list'
    },
    AUCTIONS: {
      CREATE: 'auctions:create',
      READ: 'auctions:read',
      UPDATE: 'auctions:update',
      DELETE: 'auctions:delete',
      LIST: 'auctions:list',
      PUBLISH: 'auctions:publish'
    },
    LOTS: {
      CREATE: 'lots:create',
      READ: 'lots:read',
      UPDATE: 'lots:update',
      DELETE: 'lots:delete',
      LIST: 'lots:list'
    },
    BIDS: {
      CREATE: 'bids:create',
      READ: 'bids:read',
      UPDATE: 'bids:update',
      DELETE: 'bids:delete',
      LIST: 'bids:list'
    },
    INVOICES: {
      CREATE: 'invoices:create',
      READ: 'invoices:read',
      UPDATE: 'invoices:update',
      DELETE: 'invoices:delete',
      LIST: 'invoices:list',
      SEND: 'invoices:send'
    },
    REPORTS: {
      CREATE: 'reports:create',
      READ: 'reports:read',
      EXPORT: 'reports:export'
    },
    ROLES: {
      CREATE: 'roles:create',
      READ: 'roles:read',
      UPDATE: 'roles:update',
      DELETE: 'roles:delete',
      ASSIGN: 'roles:assign'
    },
    SYSTEM: {
      SETTINGS: 'system:settings',
      BACKUP: 'system:backup',
      MAINTENANCE: 'system:maintenance'
    }
  },
  
  ROLES: {
    ADMIN: 'admin',
    AUCTIONEER: 'auctioneer',
    MODERATOR: 'moderator',
    SELLER: 'seller',
    BIDDER: 'bidder',
    VIEWER: 'viewer'
  }
};