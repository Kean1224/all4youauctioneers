const dbManager = require('./connection');

/**
 * Database Schema Migrations
 * Creates and maintains the PostgreSQL database structure
 */
class MigrationManager {
  constructor() {
    this.migrations = [
      {
        version: 1,
        name: 'create_users_table',
        up: `
          CREATE TABLE IF NOT EXISTS users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            phone VARCHAR(50),
            address TEXT,
            city VARCHAR(100),
            postal_code VARCHAR(20),
            fica_approved BOOLEAN DEFAULT FALSE,
            fica_file_url VARCHAR(500),
            fica_upload_date TIMESTAMP,
            verification_code VARCHAR(100),
            email_verified BOOLEAN DEFAULT FALSE,
            suspended BOOLEAN DEFAULT FALSE,
            suspension_reason TEXT,
            rejection_reason TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          CREATE INDEX IF NOT EXISTS idx_users_email ON users(email);
          CREATE INDEX IF NOT EXISTS idx_users_fica_approved ON users(fica_approved);
          CREATE INDEX IF NOT EXISTS idx_users_email_verified ON users(email_verified);
        `,
        down: 'DROP TABLE IF EXISTS users CASCADE;'
      },
      
      {
        version: 2,
        name: 'create_auctions_table',
        up: `
          CREATE TABLE IF NOT EXISTS auctions (
            id SERIAL PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            description TEXT,
            status VARCHAR(50) DEFAULT 'draft',
            start_time TIMESTAMP,
            end_time TIMESTAMP,
            created_by INTEGER REFERENCES users(id),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          CREATE INDEX IF NOT EXISTS idx_auctions_status ON auctions(status);
          CREATE INDEX IF NOT EXISTS idx_auctions_start_time ON auctions(start_time);
          CREATE INDEX IF NOT EXISTS idx_auctions_end_time ON auctions(end_time);
        `,
        down: 'DROP TABLE IF EXISTS auctions CASCADE;'
      },

      {
        version: 3,
        name: 'create_lots_table',
        up: `
          CREATE TABLE IF NOT EXISTS lots (
            id SERIAL PRIMARY KEY,
            auction_id INTEGER REFERENCES auctions(id) ON DELETE CASCADE,
            title VARCHAR(500) NOT NULL,
            description TEXT,
            starting_bid DECIMAL(10,2) DEFAULT 0,
            current_bid DECIMAL(10,2) DEFAULT 0,
            reserve_price DECIMAL(10,2),
            bid_increment DECIMAL(10,2) DEFAULT 10,
            status VARCHAR(50) DEFAULT 'active',
            category VARCHAR(100),
            condition VARCHAR(50),
            image_urls TEXT[], -- Array of image URLs
            seller_email VARCHAR(255),
            winner_email VARCHAR(255),
            hammer_price DECIMAL(10,2),
            hammer_time TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          CREATE INDEX IF NOT EXISTS idx_lots_auction_id ON lots(auction_id);
          CREATE INDEX IF NOT EXISTS idx_lots_status ON lots(status);
          CREATE INDEX IF NOT EXISTS idx_lots_seller_email ON lots(seller_email);
          CREATE INDEX IF NOT EXISTS idx_lots_category ON lots(category);
        `,
        down: 'DROP TABLE IF EXISTS lots CASCADE;'
      },

      {
        version: 4,
        name: 'create_bids_table',
        up: `
          CREATE TABLE IF NOT EXISTS bids (
            id SERIAL PRIMARY KEY,
            lot_id INTEGER REFERENCES lots(id) ON DELETE CASCADE,
            auction_id INTEGER REFERENCES auctions(id) ON DELETE CASCADE,
            bidder_email VARCHAR(255) NOT NULL,
            bid_amount DECIMAL(10,2) NOT NULL,
            is_auto_bid BOOLEAN DEFAULT FALSE,
            max_auto_bid DECIMAL(10,2),
            bid_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            ip_address INET,
            user_agent TEXT
          );
          
          CREATE INDEX IF NOT EXISTS idx_bids_lot_id ON bids(lot_id);
          CREATE INDEX IF NOT EXISTS idx_bids_auction_id ON bids(auction_id);
          CREATE INDEX IF NOT EXISTS idx_bids_bidder_email ON bids(bidder_email);
          CREATE INDEX IF NOT EXISTS idx_bids_bid_time ON bids(bid_time);
          CREATE INDEX IF NOT EXISTS idx_bids_amount ON bids(bid_amount);
        `,
        down: 'DROP TABLE IF EXISTS bids CASCADE;'
      },

      {
        version: 5,
        name: 'placeholder_for_old_invoices_table',
        up: `
          -- This migration has been replaced by version 20
          -- Keeping placeholder to maintain version sequence
          SELECT 1;
        `,
        down: 'SELECT 1;'
      },

      {
        version: 6,
        name: 'create_invoice_items_table',
        up: `
          CREATE TABLE IF NOT EXISTS invoice_items (
            id SERIAL PRIMARY KEY,
            invoice_id INTEGER REFERENCES invoices(id) ON DELETE CASCADE,
            lot_id INTEGER REFERENCES lots(id),
            item_description VARCHAR(500),
            quantity INTEGER DEFAULT 1,
            unit_price DECIMAL(10,2),
            total_price DECIMAL(10,2)
          );
          
          CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice_id ON invoice_items(invoice_id);
          CREATE INDEX IF NOT EXISTS idx_invoice_items_lot_id ON invoice_items(lot_id);
        `,
        down: 'DROP TABLE IF EXISTS invoice_items CASCADE;'
      },

      {
        version: 7,
        name: 'create_fica_documents_table',
        up: `
          CREATE TABLE IF NOT EXISTS fica_documents (
            id SERIAL PRIMARY KEY,
            user_email VARCHAR(255) NOT NULL,
            file_url VARCHAR(500) NOT NULL,
            original_filename VARCHAR(255),
            file_size BIGINT,
            mime_type VARCHAR(100),
            status VARCHAR(50) DEFAULT 'pending',
            uploaded_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP,
            reviewed_by VARCHAR(255),
            rejection_reason TEXT
          );
          
          CREATE INDEX IF NOT EXISTS idx_fica_user_email ON fica_documents(user_email);
          CREATE INDEX IF NOT EXISTS idx_fica_status ON fica_documents(status);
        `,
        down: 'DROP TABLE IF EXISTS fica_documents CASCADE;'
      },

      {
        version: 8,
        name: 'create_migrations_table',
        up: `
          CREATE TABLE IF NOT EXISTS migrations (
            id SERIAL PRIMARY KEY,
            version INTEGER UNIQUE NOT NULL,
            name VARCHAR(255) NOT NULL,
            executed_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `,
        down: 'DROP TABLE IF EXISTS migrations CASCADE;'
      },

      {
        version: 9,
        name: 'create_company_assets_table',
        up: `
          CREATE TABLE IF NOT EXISTS company_assets (
            id SERIAL PRIMARY KEY,
            asset_type VARCHAR(50) UNIQUE NOT NULL,
            file_url TEXT NOT NULL,
            original_filename VARCHAR(255),
            file_size INTEGER,
            mime_type VARCHAR(100),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          CREATE INDEX IF NOT EXISTS idx_company_assets_type ON company_assets(asset_type);
        `,
        down: 'DROP TABLE IF EXISTS company_assets CASCADE;'
      },

      {
        version: 10,
        name: 'add_image_urls_to_auctions',
        up: `
          ALTER TABLE auctions ADD COLUMN IF NOT EXISTS image_urls TEXT[];
          ALTER TABLE auctions ADD COLUMN IF NOT EXISTS location VARCHAR(255);
          ALTER TABLE auctions ADD COLUMN IF NOT EXISTS increment INTEGER DEFAULT 10;
          ALTER TABLE auctions ADD COLUMN IF NOT EXISTS deposit_required BOOLEAN DEFAULT FALSE;
          ALTER TABLE auctions ADD COLUMN IF NOT EXISTS deposit_amount DECIMAL(10,2) DEFAULT 0;
        `,
        down: `
          ALTER TABLE auctions DROP COLUMN IF EXISTS image_urls;
          ALTER TABLE auctions DROP COLUMN IF EXISTS location;
          ALTER TABLE auctions DROP COLUMN IF EXISTS increment;
          ALTER TABLE auctions DROP COLUMN IF EXISTS deposit_required;
          ALTER TABLE auctions DROP COLUMN IF EXISTS deposit_amount;
        `
      },

      {
        version: 11,
        name: 'add_auto_bids_and_lot_number_to_lots',
        up: `
          ALTER TABLE lots ADD COLUMN IF NOT EXISTS auto_bids JSONB DEFAULT '{}';
          ALTER TABLE lots ADD COLUMN IF NOT EXISTS lot_number INTEGER;
          ALTER TABLE lots ADD COLUMN IF NOT EXISTS end_time TIMESTAMP;
          
          -- Create index for auto_bids queries
          CREATE INDEX IF NOT EXISTS idx_lots_auto_bids ON lots USING GIN (auto_bids);
          CREATE INDEX IF NOT EXISTS idx_lots_lot_number ON lots(lot_number);
          CREATE INDEX IF NOT EXISTS idx_lots_end_time ON lots(end_time);
        `,
        down: `
          DROP INDEX IF EXISTS idx_lots_auto_bids;
          DROP INDEX IF EXISTS idx_lots_lot_number;
          DROP INDEX IF EXISTS idx_lots_end_time;
          ALTER TABLE lots DROP COLUMN IF EXISTS auto_bids;
          ALTER TABLE lots DROP COLUMN IF EXISTS lot_number;
          ALTER TABLE lots DROP COLUMN IF EXISTS end_time;
        `
      },
      
      {
        version: 12,
        name: 'add_views_and_watchers_to_lots',
        up: `
          ALTER TABLE lots ADD COLUMN IF NOT EXISTS views INTEGER DEFAULT 0;
          ALTER TABLE lots ADD COLUMN IF NOT EXISTS watchers INTEGER DEFAULT 0;
          ALTER TABLE lots ADD COLUMN IF NOT EXISTS bid_count INTEGER DEFAULT 0;
          
          -- Create indexes for better performance
          CREATE INDEX IF NOT EXISTS idx_lots_views ON lots(views);
          CREATE INDEX IF NOT EXISTS idx_lots_watchers ON lots(watchers);
          CREATE INDEX IF NOT EXISTS idx_lots_bid_count ON lots(bid_count);
        `,
        down: `
          DROP INDEX IF EXISTS idx_lots_views;
          DROP INDEX IF EXISTS idx_lots_watchers;
          DROP INDEX IF EXISTS idx_lots_bid_count;
          ALTER TABLE lots DROP COLUMN IF EXISTS views;
          ALTER TABLE lots DROP COLUMN IF EXISTS watchers;
          ALTER TABLE lots DROP COLUMN IF EXISTS bid_count;
        `
      },
      
      {
        version: 13,
        name: 'fix_fica_file_url_constraint',
        up: `
          -- Change file_url from VARCHAR(500) to TEXT to handle base64 data URLs
          ALTER TABLE fica_documents ALTER COLUMN file_url TYPE TEXT;
        `,
        down: `
          -- Revert back to VARCHAR(500) - note: this may fail if data is too long
          ALTER TABLE fica_documents ALTER COLUMN file_url TYPE VARCHAR(500);
        `
      },
      
      {
        version: 14,
        name: 'create_auction_deposits_table',
        up: `
          CREATE TABLE IF NOT EXISTS auction_deposits (
            id SERIAL PRIMARY KEY,
            user_email VARCHAR(255) NOT NULL,
            auction_id VARCHAR(255) NOT NULL,
            auction_title VARCHAR(500),
            amount DECIMAL(10, 2) NOT NULL,
            required_amount DECIMAL(10, 2) DEFAULT 0,
            payment_method VARCHAR(100),
            reference_number VARCHAR(255),
            notes TEXT,
            proof_file_data TEXT, -- Store base64 encoded file data
            proof_original_name VARCHAR(255),
            status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, returned
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            reviewed_at TIMESTAMP,
            reviewed_by VARCHAR(255),
            review_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Indexes for performance
          CREATE INDEX IF NOT EXISTS idx_deposits_user_email ON auction_deposits(user_email);
          CREATE INDEX IF NOT EXISTS idx_deposits_auction_id ON auction_deposits(auction_id);
          CREATE INDEX IF NOT EXISTS idx_deposits_status ON auction_deposits(status);
          CREATE INDEX IF NOT EXISTS idx_deposits_submitted_at ON auction_deposits(submitted_at);
          
          -- Foreign key constraint (soft - auction_id can be from JSON or PostgreSQL)
          -- No foreign key constraint on user_email since we're migrating gradually
        `,
        down: `
          DROP TABLE IF EXISTS auction_deposits CASCADE;
        `
      },
      
      {
        version: 15,
        name: 'create_auction_registrations_table',
        up: `
          CREATE TABLE IF NOT EXISTS auction_registrations (
            id SERIAL PRIMARY KEY,
            auction_id VARCHAR(255) NOT NULL,
            user_email VARCHAR(255) NOT NULL,
            registered_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            
            -- Unique constraint to prevent duplicate registrations
            UNIQUE(auction_id, user_email)
          );
          
          -- Indexes for performance
          CREATE INDEX IF NOT EXISTS idx_registrations_auction_id ON auction_registrations(auction_id);
          CREATE INDEX IF NOT EXISTS idx_registrations_user_email ON auction_registrations(user_email);
          CREATE INDEX IF NOT EXISTS idx_registrations_registered_at ON auction_registrations(registered_at);
        `,
        down: `
          DROP TABLE IF EXISTS auction_registrations CASCADE;
        `
      },
      
      {
        version: 16,
        name: 'create_contact_messages_table',
        up: `
          CREATE TABLE IF NOT EXISTS contact_messages (
            id SERIAL PRIMARY KEY,
            name VARCHAR(255) NOT NULL,
            email VARCHAR(255) NOT NULL,
            message TEXT NOT NULL,
            submitted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            status VARCHAR(50) DEFAULT 'unread', -- unread, read, archived
            admin_notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Indexes for performance
          CREATE INDEX IF NOT EXISTS idx_contact_email ON contact_messages(email);
          CREATE INDEX IF NOT EXISTS idx_contact_status ON contact_messages(status);
          CREATE INDEX IF NOT EXISTS idx_contact_submitted_at ON contact_messages(submitted_at);
        `,
        down: `
          DROP TABLE IF EXISTS contact_messages CASCADE;
        `
      },
      
      {
        version: 17,
        name: 'create_refund_requests_table',
        up: `
          CREATE TABLE IF NOT EXISTS refund_requests (
            id SERIAL PRIMARY KEY,
            auction_id VARCHAR(255) NOT NULL,
            user_email VARCHAR(255) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, completed
            requested_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            admin_notes TEXT,
            reason TEXT,
            refund_amount DECIMAL(10, 2),
            processed_by VARCHAR(255),
            
            -- Unique constraint to prevent duplicate refund requests
            UNIQUE(auction_id, user_email)
          );
          
          -- Indexes for performance
          CREATE INDEX IF NOT EXISTS idx_refunds_auction_id ON refund_requests(auction_id);
          CREATE INDEX IF NOT EXISTS idx_refunds_user_email ON refund_requests(user_email);
          CREATE INDEX IF NOT EXISTS idx_refunds_status ON refund_requests(status);
          CREATE INDEX IF NOT EXISTS idx_refunds_requested_at ON refund_requests(requested_at);
        `,
        down: `
          DROP TABLE IF EXISTS refund_requests CASCADE;
        `
      },
      
      {
        version: 18,
        name: 'create_pending_items_table',
        up: `
          CREATE TABLE IF NOT EXISTS pending_items (
            id SERIAL PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            description TEXT,
            category VARCHAR(100),
            reserve_price DECIMAL(10, 2),
            condition VARCHAR(50),
            seller_email VARCHAR(255) NOT NULL,
            image_data TEXT, -- Store base64 image data
            original_filename VARCHAR(255),
            status VARCHAR(50) DEFAULT 'pending', -- pending, approved, rejected, countered
            counter_offer DECIMAL(10, 2),
            admin_message TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            processed_by VARCHAR(255),
            response_deadline TIMESTAMP
          );
          
          -- Indexes for performance
          CREATE INDEX IF NOT EXISTS idx_pending_items_seller_email ON pending_items(seller_email);
          CREATE INDEX IF NOT EXISTS idx_pending_items_status ON pending_items(status);
          CREATE INDEX IF NOT EXISTS idx_pending_items_created_at ON pending_items(created_at);
          CREATE INDEX IF NOT EXISTS idx_pending_items_category ON pending_items(category);
        `,
        down: `
          DROP TABLE IF EXISTS pending_items CASCADE;
        `
      },
      
      {
        version: 19,
        name: 'create_sell_items_table',
        up: `
          CREATE TABLE IF NOT EXISTS sell_items (
            id SERIAL PRIMARY KEY,
            title VARCHAR(500) NOT NULL,
            description TEXT,
            category VARCHAR(100),
            starting_price DECIMAL(10, 2),
            reserve_price DECIMAL(10, 2),
            condition VARCHAR(50),
            seller_email VARCHAR(255) NOT NULL,
            image_data TEXT, -- Store base64 image data
            original_filename VARCHAR(255),
            status VARCHAR(50) DEFAULT 'active', -- active, sold, withdrawn, expired
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            expires_at TIMESTAMP,
            views INTEGER DEFAULT 0,
            inquiries INTEGER DEFAULT 0
          );
          
          -- Indexes for performance
          CREATE INDEX IF NOT EXISTS idx_sell_items_seller_email ON sell_items(seller_email);
          CREATE INDEX IF NOT EXISTS idx_sell_items_status ON sell_items(status);
          CREATE INDEX IF NOT EXISTS idx_sell_items_category ON sell_items(category);
          CREATE INDEX IF NOT EXISTS idx_sell_items_created_at ON sell_items(created_at);
        `,
        down: `
          DROP TABLE IF EXISTS sell_items CASCADE;
        `
      },
      
      {
        version: 20,
        name: 'migrate_invoices_table_structure',
        up: `
          -- Drop the old invoices table if it exists (from migration v5)
          DROP TABLE IF EXISTS invoices CASCADE;
          
          -- Create the new invoices table with the correct structure
          CREATE TABLE invoices (
            id SERIAL PRIMARY KEY,
            invoice_number VARCHAR(100) UNIQUE NOT NULL,
            auction_id VARCHAR(255),
            lot_id VARCHAR(255),
            buyer_email VARCHAR(255) NOT NULL,
            seller_email VARCHAR(255),
            item_title VARCHAR(500),
            winning_bid DECIMAL(10, 2) NOT NULL,
            buyers_premium DECIMAL(10, 2) DEFAULT 0,
            vat_amount DECIMAL(10, 2) DEFAULT 0,
            total_amount DECIMAL(10, 2) NOT NULL,
            payment_status VARCHAR(50) DEFAULT 'pending',
            payment_method VARCHAR(100),
            payment_date TIMESTAMP,
            payment_reference VARCHAR(255),
            invoice_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            due_date TIMESTAMP,
            pdf_data TEXT,
            notes TEXT,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
        `,
        down: `DROP TABLE IF EXISTS invoices CASCADE`
      },
      
      {
        version: 21,
        name: 'create_invoices_indexes',
        up: [
          `CREATE INDEX IF NOT EXISTS idx_invoices_buyer_email ON invoices(buyer_email)`,
          `CREATE INDEX IF NOT EXISTS idx_invoices_auction_id ON invoices(auction_id)`,
          `CREATE INDEX IF NOT EXISTS idx_invoices_payment_status ON invoices(payment_status)`,
          `CREATE INDEX IF NOT EXISTS idx_invoices_invoice_date ON invoices(invoice_date)`
        ],
        down: `DROP INDEX IF EXISTS idx_invoices_buyer_email, idx_invoices_auction_id, idx_invoices_payment_status, idx_invoices_invoice_date`
      },
      
      {
        version: 22,
        name: 'create_password_reset_tokens_table',
        up: `
          CREATE TABLE IF NOT EXISTS password_reset_tokens (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) NOT NULL,
            token VARCHAR(64) UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            used_at TIMESTAMP
          );
          
          CREATE INDEX IF NOT EXISTS idx_reset_tokens_email ON password_reset_tokens(email);
          CREATE INDEX IF NOT EXISTS idx_reset_tokens_token ON password_reset_tokens(token);
          CREATE INDEX IF NOT EXISTS idx_reset_tokens_expires_at ON password_reset_tokens(expires_at);
        `,
        down: `DROP TABLE IF EXISTS password_reset_tokens CASCADE`
      },
      
      {
        version: 23,
        name: 'create_pending_users_table',
        up: `
          CREATE TABLE IF NOT EXISTS pending_users (
            id SERIAL PRIMARY KEY,
            email VARCHAR(255) UNIQUE NOT NULL,
            password_hash VARCHAR(255) NOT NULL,
            name VARCHAR(255),
            username VARCHAR(255),
            cell VARCHAR(50),
            id_number VARCHAR(20),
            address TEXT,
            city VARCHAR(100),
            postal_code VARCHAR(20),
            id_document TEXT,
            proof_of_address TEXT,
            verification_token VARCHAR(64) UNIQUE NOT NULL,
            expires_at TIMESTAMP NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          CREATE INDEX IF NOT EXISTS idx_pending_users_email ON pending_users(email);
          CREATE INDEX IF NOT EXISTS idx_pending_users_token ON pending_users(verification_token);
          CREATE INDEX IF NOT EXISTS idx_pending_users_expires_at ON pending_users(expires_at);
        `,
        down: `DROP TABLE IF EXISTS pending_users CASCADE`
      },
      
      {
        version: 24,
        name: 'add_user_roles_system',
        up: `
          -- Add role column to users table
          ALTER TABLE users ADD COLUMN IF NOT EXISTS role VARCHAR(50) DEFAULT 'user';
          
          -- Create index for role-based queries
          CREATE INDEX IF NOT EXISTS idx_users_role ON users(role);
        `,
        down: `
          DROP INDEX IF EXISTS idx_users_role;
          ALTER TABLE users DROP COLUMN IF EXISTS role;
        `
      },
      
      {
        version: 25,
        name: 'create_rbac_system',
        up: `
          -- Create roles table
          CREATE TABLE IF NOT EXISTS roles (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            display_name VARCHAR(200) NOT NULL,
            description TEXT,
            is_system_role BOOLEAN DEFAULT FALSE,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Create permissions table
          CREATE TABLE IF NOT EXISTS permissions (
            id SERIAL PRIMARY KEY,
            name VARCHAR(100) UNIQUE NOT NULL,
            display_name VARCHAR(200) NOT NULL,
            description TEXT,
            resource VARCHAR(100) NOT NULL,
            action VARCHAR(50) NOT NULL,
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          -- Create role-permission mapping table
          CREATE TABLE IF NOT EXISTS role_permissions (
            id SERIAL PRIMARY KEY,
            role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
            permission_id INTEGER REFERENCES permissions(id) ON DELETE CASCADE,
            granted_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            granted_by INTEGER REFERENCES users(id),
            UNIQUE(role_id, permission_id)
          );
          
          -- Create user-role assignments table (many-to-many)
          CREATE TABLE IF NOT EXISTS user_roles (
            id SERIAL PRIMARY KEY,
            user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
            role_id INTEGER REFERENCES roles(id) ON DELETE CASCADE,
            assigned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            assigned_by INTEGER REFERENCES users(id),
            expires_at TIMESTAMP,
            is_active BOOLEAN DEFAULT TRUE,
            UNIQUE(user_id, role_id)
          );
          
          -- Create indexes for performance
          CREATE INDEX IF NOT EXISTS idx_roles_name ON roles(name);
          CREATE INDEX IF NOT EXISTS idx_permissions_resource_action ON permissions(resource, action);
          CREATE INDEX IF NOT EXISTS idx_role_permissions_role_id ON role_permissions(role_id);
          CREATE INDEX IF NOT EXISTS idx_role_permissions_permission_id ON role_permissions(permission_id);
          CREATE INDEX IF NOT EXISTS idx_user_roles_user_id ON user_roles(user_id);
          CREATE INDEX IF NOT EXISTS idx_user_roles_role_id ON user_roles(role_id);
          CREATE INDEX IF NOT EXISTS idx_user_roles_active ON user_roles(is_active);
        `,
        down: `
          DROP INDEX IF EXISTS idx_user_roles_active;
          DROP INDEX IF EXISTS idx_user_roles_role_id;
          DROP INDEX IF EXISTS idx_user_roles_user_id;
          DROP INDEX IF EXISTS idx_role_permissions_permission_id;
          DROP INDEX IF EXISTS idx_role_permissions_role_id;
          DROP INDEX IF EXISTS idx_permissions_resource_action;
          DROP INDEX IF EXISTS idx_roles_name;
          DROP TABLE IF EXISTS user_roles CASCADE;
          DROP TABLE IF EXISTS role_permissions CASCADE;
          DROP TABLE IF EXISTS permissions CASCADE;
          DROP TABLE IF EXISTS roles CASCADE;
        `
      },
      
      {
        version: 26,
        name: 'populate_default_rbac_data',
        up: `
          -- Insert default roles
          INSERT INTO roles (name, display_name, description, is_system_role) VALUES
          ('admin', 'Administrator', 'Full system administrator with all permissions', true),
          ('auctioneer', 'Auctioneer', 'Manages auctions and lots', true),
          ('moderator', 'Moderator', 'Moderates users and content', true),
          ('seller', 'Seller', 'Can create and manage their own lots', true),
          ('bidder', 'Bidder', 'Can participate in auctions and place bids', true),
          ('viewer', 'Viewer', 'Read-only access to public auction data', true)
          ON CONFLICT (name) DO NOTHING;
          
          -- Insert default permissions
          INSERT INTO permissions (name, display_name, description, resource, action) VALUES
          -- User management
          ('users.create', 'Create Users', 'Create new user accounts', 'users', 'create'),
          ('users.read', 'View Users', 'View user information', 'users', 'read'),
          ('users.update', 'Update Users', 'Edit user information', 'users', 'update'),
          ('users.delete', 'Delete Users', 'Delete user accounts', 'users', 'delete'),
          ('users.suspend', 'Suspend Users', 'Suspend/unsuspend user accounts', 'users', 'suspend'),
          
          -- Role management
          ('roles.create', 'Create Roles', 'Create new roles', 'roles', 'create'),
          ('roles.read', 'View Roles', 'View role information', 'roles', 'read'),
          ('roles.update', 'Update Roles', 'Edit role information', 'roles', 'update'),
          ('roles.delete', 'Delete Roles', 'Delete roles', 'roles', 'delete'),
          ('roles.assign', 'Assign Roles', 'Assign roles to users', 'roles', 'assign'),
          
          -- Auction management
          ('auctions.create', 'Create Auctions', 'Create new auctions', 'auctions', 'create'),
          ('auctions.read', 'View Auctions', 'View auction information', 'auctions', 'read'),
          ('auctions.update', 'Update Auctions', 'Edit auction information', 'auctions', 'update'),
          ('auctions.delete', 'Delete Auctions', 'Delete auctions', 'auctions', 'delete'),
          ('auctions.start', 'Start Auctions', 'Start auction bidding', 'auctions', 'start'),
          ('auctions.end', 'End Auctions', 'End auction bidding', 'auctions', 'end'),
          
          -- Lot management
          ('lots.create', 'Create Lots', 'Add lots to auctions', 'lots', 'create'),
          ('lots.read', 'View Lots', 'View lot information', 'lots', 'read'),
          ('lots.update', 'Update Lots', 'Edit lot information', 'lots', 'update'),
          ('lots.delete', 'Delete Lots', 'Remove lots from auctions', 'lots', 'delete'),
          ('lots.approve', 'Approve Lots', 'Approve lots for auction', 'lots', 'approve'),
          
          -- Bidding
          ('bids.create', 'Place Bids', 'Place bids on lots', 'bids', 'create'),
          ('bids.read', 'View Bids', 'View bidding information', 'bids', 'read'),
          ('bids.cancel', 'Cancel Bids', 'Cancel own bids', 'bids', 'cancel'),
          
          -- Financial management
          ('invoices.create', 'Create Invoices', 'Generate invoices', 'invoices', 'create'),
          ('invoices.read', 'View Invoices', 'View invoice information', 'invoices', 'read'),
          ('invoices.update', 'Update Invoices', 'Edit invoice information', 'invoices', 'update'),
          ('invoices.send', 'Send Invoices', 'Send invoices to buyers', 'invoices', 'send'),
          
          -- Reports and analytics
          ('reports.auctions', 'Auction Reports', 'View auction performance reports', 'reports', 'read'),
          ('reports.financial', 'Financial Reports', 'View financial reports', 'reports', 'read'),
          ('reports.users', 'User Reports', 'View user activity reports', 'reports', 'read'),
          
          -- System administration
          ('system.settings', 'System Settings', 'Manage system configuration', 'system', 'update'),
          ('system.maintenance', 'System Maintenance', 'Perform system maintenance', 'system', 'maintain'),
          ('system.logs', 'View System Logs', 'Access system logs', 'system', 'read')
          
          ON CONFLICT (name) DO NOTHING;
        `,
        down: `
          DELETE FROM role_permissions;
          DELETE FROM user_roles;
          DELETE FROM permissions;
          DELETE FROM roles;
        `
      }
    ];
  }

  /**
   * Run all pending migrations
   */
  async runMigrations() {
    try {
      console.log('🚀 Starting database migrations...');
      
      // Ensure migrations table exists
      await dbManager.query(this.migrations.find(m => m.name === 'create_migrations_table').up);
      
      // Get executed migrations
      const result = await dbManager.query('SELECT version FROM migrations ORDER BY version');
      const executedVersions = result.rows.map(row => row.version);
      
      // Run pending migrations
      let migrationsRun = 0;
      for (const migration of this.migrations.filter(m => m.name !== 'create_migrations_table')) {
        if (!executedVersions.includes(migration.version)) {
          await this.runMigration(migration);
          migrationsRun++;
        }
      }
      
      if (migrationsRun === 0) {
        console.log('✅ No new migrations to run - database is up to date');
      } else {
        console.log(`✅ Successfully ran ${migrationsRun} migrations`);
      }
      
      return true;
      
    } catch (error) {
      console.error('❌ Migration failed:', error);
      throw error;
    }
  }

  /**
   * Run a single migration
   */
  async runMigration(migration) {
    console.log(`🔄 Running migration: ${migration.name} (v${migration.version})`);
    
    await dbManager.transaction(async (client) => {
      // Handle both string and array formats for migration.up
      let statements = [];
      
      if (Array.isArray(migration.up)) {
        statements = migration.up;
      } else {
        statements = migration.up.split(';').filter(stmt => stmt.trim());
      }
      
      for (const statement of statements) {
        const trimmed = statement.trim();
        if (trimmed) {
          console.log(`🔄 Executing: ${trimmed.substring(0, 50)}...`);
          await client.query(trimmed);
        }
      }
      
      // Record migration
      await client.query(
        'INSERT INTO migrations (version, name) VALUES ($1, $2)',
        [migration.version, migration.name]
      );
      
      // Special handling for different migrations
      if (migration.version === 24) {
        await this.createInitialAdminUser(client);
      }
      
      if (migration.version === 26) {
        await this.assignDefaultRolePermissions(client);
        await this.migrateExistingUserRoles(client);
      }
      
      console.log(`✅ Migration completed: ${migration.name}`);
    });
  }
  
  /**
   * Create initial admin user after role system migration
   */
  async createInitialAdminUser(client) {
    try {
      const bcrypt = require('bcryptjs');
      
      // Get admin credentials from environment
      const adminEmail = process.env.ADMIN_EMAIL || 'admin@all4youauctions.co.za';
      const adminPassword = process.env.ADMIN_PASSWORD || 'AdminPassword123!';
      
      // Check if admin user already exists
      const existingAdmin = await client.query(
        'SELECT id FROM users WHERE role = $1 OR email = $2',
        ['admin', adminEmail]
      );
      
      if (existingAdmin.rows.length > 0) {
        console.log(`👤 Admin user already exists, updating role...`);
        await client.query(
          'UPDATE users SET role = $1 WHERE email = $2',
          ['admin', adminEmail]
        );
      } else {
        console.log(`👤 Creating initial admin user: ${adminEmail}`);
        
        // Hash the admin password
        const hashedPassword = await bcrypt.hash(adminPassword, 12);
        
        // Create admin user
        await client.query(`
          INSERT INTO users (email, password_hash, name, role, email_verified, fica_approved, created_at, updated_at)
          VALUES ($1, $2, $3, $4, $5, $6, NOW(), NOW())
        `, [
          adminEmail,
          hashedPassword,
          'System Administrator',
          'admin',
          true,
          true
        ]);
        
        console.log(`✅ Admin user created successfully`);
      }
    } catch (error) {
      console.error('❌ Failed to create admin user:', error);
      // Don't throw - migration should continue
    }
  }
  
  /**
   * Assign default permissions to roles after RBAC system creation
   */
  async assignDefaultRolePermissions(client) {
    try {
      console.log('🔐 Assigning default permissions to roles...');
      
      // Define role-permission mappings
      const rolePermissions = {
        'admin': [
          // Full access to everything
          'users.create', 'users.read', 'users.update', 'users.delete', 'users.suspend',
          'roles.create', 'roles.read', 'roles.update', 'roles.delete', 'roles.assign',
          'auctions.create', 'auctions.read', 'auctions.update', 'auctions.delete', 'auctions.start', 'auctions.end',
          'lots.create', 'lots.read', 'lots.update', 'lots.delete', 'lots.approve',
          'bids.create', 'bids.read', 'bids.cancel',
          'invoices.create', 'invoices.read', 'invoices.update', 'invoices.send',
          'reports.auctions', 'reports.financial', 'reports.users',
          'system.settings', 'system.maintenance', 'system.logs'
        ],
        'auctioneer': [
          // Auction and lot management
          'auctions.create', 'auctions.read', 'auctions.update', 'auctions.start', 'auctions.end',
          'lots.create', 'lots.read', 'lots.update', 'lots.approve',
          'bids.read',
          'invoices.create', 'invoices.read', 'invoices.send',
          'reports.auctions', 'users.read'
        ],
        'moderator': [
          // User moderation and content management
          'users.read', 'users.update', 'users.suspend',
          'auctions.read', 'lots.read', 'lots.approve',
          'bids.read', 'bids.cancel',
          'reports.users'
        ],
        'seller': [
          // Can manage their own lots
          'lots.create', 'lots.read', 'lots.update',
          'auctions.read', 'bids.read',
          'invoices.read'
        ],
        'bidder': [
          // Can participate in auctions
          'auctions.read', 'lots.read',
          'bids.create', 'bids.read', 'bids.cancel',
          'invoices.read'
        ],
        'viewer': [
          // Read-only access
          'auctions.read', 'lots.read', 'bids.read'
        ]
      };
      
      // Assign permissions to each role
      for (const [roleName, permissions] of Object.entries(rolePermissions)) {
        // Get role ID
        const roleResult = await client.query('SELECT id FROM roles WHERE name = $1', [roleName]);
        if (roleResult.rows.length === 0) {
          console.log(`⚠️  Role ${roleName} not found, skipping...`);
          continue;
        }
        const roleId = roleResult.rows[0].id;
        
        // Assign permissions
        for (const permissionName of permissions) {
          const permResult = await client.query('SELECT id FROM permissions WHERE name = $1', [permissionName]);
          if (permResult.rows.length === 0) {
            console.log(`⚠️  Permission ${permissionName} not found, skipping...`);
            continue;
          }
          const permissionId = permResult.rows[0].id;
          
          // Insert role-permission mapping
          await client.query(`
            INSERT INTO role_permissions (role_id, permission_id)
            VALUES ($1, $2)
            ON CONFLICT (role_id, permission_id) DO NOTHING
          `, [roleId, permissionId]);
        }
        
        console.log(`✅ Assigned ${permissions.length} permissions to role: ${roleName}`);
      }
      
    } catch (error) {
      console.error('❌ Failed to assign role permissions:', error);
      // Don't throw - migration should continue
    }
  }
  
  /**
   * Migrate existing users to the new RBAC system
   */
  async migrateExistingUserRoles(client) {
    try {
      console.log('👥 Migrating existing users to RBAC system...');
      
      // Get all users with their current roles
      const users = await client.query('SELECT id, email, role FROM users');
      
      for (const user of users.rows) {
        if (!user.role) continue;
        
        // Get the role ID from the roles table
        const roleResult = await client.query('SELECT id FROM roles WHERE name = $1', [user.role]);
        if (roleResult.rows.length === 0) {
          console.log(`⚠️  Role ${user.role} not found for user ${user.email}, assigning bidder role...`);
          // Assign default bidder role if role not found
          const bidderRole = await client.query('SELECT id FROM roles WHERE name = $1', ['bidder']);
          if (bidderRole.rows.length > 0) {
            await client.query(`
              INSERT INTO user_roles (user_id, role_id)
              VALUES ($1, $2)
              ON CONFLICT (user_id, role_id) DO NOTHING
            `, [user.id, bidderRole.rows[0].id]);
          }
          continue;
        }
        
        const roleId = roleResult.rows[0].id;
        
        // Assign the role to the user in the new RBAC system
        await client.query(`
          INSERT INTO user_roles (user_id, role_id)
          VALUES ($1, $2)
          ON CONFLICT (user_id, role_id) DO NOTHING
        `, [user.id, roleId]);
        
        console.log(`✅ Migrated user ${user.email} to role: ${user.role}`);
      }
      
      console.log(`✅ Migrated ${users.rows.length} users to RBAC system`);
      
    } catch (error) {
      console.error('❌ Failed to migrate user roles:', error);
      // Don't throw - migration should continue
    }
  }

  /**
   * Rollback last migration
   */
  async rollbackMigration() {
    try {
      // Get last migration
      const result = await dbManager.query(
        'SELECT version, name FROM migrations ORDER BY version DESC LIMIT 1'
      );
      
      if (result.rows.length === 0) {
        console.log('ℹ️  No migrations to rollback');
        return;
      }
      
      const lastMigration = result.rows[0];
      const migration = this.migrations.find(m => m.version === lastMigration.version);
      
      if (!migration) {
        throw new Error(`Migration definition not found for version ${lastMigration.version}`);
      }
      
      console.log(`🔄 Rolling back migration: ${migration.name} (v${migration.version})`);
      
      await dbManager.transaction(async (client) => {
        // Execute rollback
        await client.query(migration.down);
        
        // Remove migration record
        await client.query('DELETE FROM migrations WHERE version = $1', [migration.version]);
        
        console.log(`✅ Rollback completed: ${migration.name}`);
      });
      
    } catch (error) {
      console.error('❌ Rollback failed:', error);
      throw error;
    }
  }

  /**
   * Get migration status
   */
  async getMigrationStatus() {
    try {
      const result = await dbManager.query(`
        SELECT m.version, m.name, m.executed_at
        FROM migrations m
        ORDER BY m.version DESC
      `);
      
      const totalMigrations = this.migrations.length;
      const executedMigrations = result.rows.length;
      
      return {
        totalMigrations,
        executedMigrations,
        pendingMigrations: totalMigrations - executedMigrations,
        lastMigration: result.rows[0] || null,
        migrations: result.rows
      };
    } catch (error) {
      console.error('Failed to get migration status:', error);
      return null;
    }
  }
}

module.exports = new MigrationManager();