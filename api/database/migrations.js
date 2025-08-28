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
        name: 'create_invoices_table',
        up: `
          CREATE TABLE IF NOT EXISTS invoices (
            id SERIAL PRIMARY KEY,
            invoice_number VARCHAR(100) UNIQUE NOT NULL,
            user_email VARCHAR(255) NOT NULL,
            auction_id INTEGER REFERENCES auctions(id),
            invoice_type VARCHAR(50) NOT NULL, -- 'buyer' or 'seller'
            subtotal DECIMAL(10,2) NOT NULL,
            commission DECIMAL(10,2) NOT NULL,
            total DECIMAL(10,2) NOT NULL,
            status VARCHAR(50) DEFAULT 'pending',
            due_date DATE,
            paid_date TIMESTAMP,
            payment_method VARCHAR(100),
            payment_reference VARCHAR(255),
            created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
            updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
          );
          
          CREATE INDEX IF NOT EXISTS idx_invoices_number ON invoices(invoice_number);
          CREATE INDEX IF NOT EXISTS idx_invoices_user_email ON invoices(user_email);
          CREATE INDEX IF NOT EXISTS idx_invoices_status ON invoices(status);
          CREATE INDEX IF NOT EXISTS idx_invoices_type ON invoices(invoice_type);
        `,
        down: 'DROP TABLE IF EXISTS invoices CASCADE;'
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
      // Execute migration
      await client.query(migration.up);
      
      // Record migration
      await client.query(
        'INSERT INTO migrations (version, name) VALUES ($1, $2)',
        [migration.version, migration.name]
      );
      
      console.log(`✅ Migration completed: ${migration.name}`);
    });
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