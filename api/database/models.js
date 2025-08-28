const dbManager = require('./connection');

/**
 * Database Models - Replaces JSON file operations with PostgreSQL queries
 * Provides atomic, consistent, and scalable data operations
 */
class DatabaseModels {
  
  // ===================== USERS MODEL =====================
  
  /**
   * Create a new user
   */
  async createUser(userData) {
    const query = `
      INSERT INTO users (email, password_hash, name, phone, address, city, postal_code)
      VALUES ($1, $2, $3, $4, $5, $6, $7)
      RETURNING *
    `;
    
    const values = [
      userData.email,
      userData.password_hash,
      userData.name,
      userData.phone || null,
      userData.address || null,
      userData.city || null,
      userData.postal_code || null
    ];
    
    const result = await dbManager.query(query, values);
    return result.rows[0];
  }

  /**
   * Find user by email
   */
  async getUserByEmail(email) {
    const query = 'SELECT * FROM users WHERE email = $1';
    const result = await dbManager.query(query, [email]);
    return result.rows[0] || null;
  }

  /**
   * Update user FICA status
   */
  async updateUserFica(email, ficaData) {
    const query = `
      UPDATE users 
      SET fica_approved = $2, fica_file_url = $3, fica_upload_date = $4, updated_at = CURRENT_TIMESTAMP
      WHERE email = $1
      RETURNING *
    `;
    
    const values = [
      email,
      ficaData.approved || false,
      ficaData.file_url || null,
      ficaData.upload_date || new Date()
    ];
    
    const result = await dbManager.query(query, values);
    return result.rows[0];
  }

  /**
   * Get all users (admin)
   */
  async getAllUsers(limit = 100, offset = 0) {
    const query = `
      SELECT id, email, name, phone, city, fica_approved, email_verified, 
             suspended, created_at, updated_at
      FROM users 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    
    const result = await dbManager.query(query, [limit, offset]);
    return result.rows;
  }

  // ===================== AUCTIONS MODEL =====================

  /**
   * Create a new auction
   */
  async createAuction(auctionData) {
    const query = `
      INSERT INTO auctions (title, description, status, start_time, end_time, created_by)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING *
    `;
    
    const values = [
      auctionData.title,
      auctionData.description || null,
      auctionData.status || 'draft',
      auctionData.start_time || null,
      auctionData.end_time || null,
      auctionData.created_by || null
    ];
    
    const result = await dbManager.query(query, values);
    return result.rows[0];
  }

  /**
   * Get auction with lots
   */
  async getAuctionWithLots(auctionId) {
    const auctionQuery = 'SELECT * FROM auctions WHERE id = $1';
    const lotsQuery = `
      SELECT l.*, 
             COALESCE(b.highest_bid, l.starting_bid) as current_bid,
             b.highest_bidder
      FROM lots l
      LEFT JOIN (
        SELECT lot_id, 
               MAX(bid_amount) as highest_bid,
               (SELECT bidder_email FROM bids WHERE lot_id = b.lot_id AND bid_amount = MAX(b.bid_amount) LIMIT 1) as highest_bidder
        FROM bids b
        GROUP BY lot_id
      ) b ON l.id = b.lot_id
      WHERE l.auction_id = $1
      ORDER BY l.id
    `;
    
    const [auctionResult, lotsResult] = await Promise.all([
      dbManager.query(auctionQuery, [auctionId]),
      dbManager.query(lotsQuery, [auctionId])
    ]);
    
    if (auctionResult.rows.length === 0) {
      return null;
    }
    
    const auction = auctionResult.rows[0];
    auction.lots = lotsResult.rows;
    
    return auction;
  }

  /**
   * Get all active auctions
   */
  async getActiveAuctions() {
    const query = `
      SELECT a.*, 
             COUNT(l.id) as lot_count,
             MIN(l.starting_bid) as min_bid,
             MAX(l.current_bid) as max_bid
      FROM auctions a
      LEFT JOIN lots l ON a.id = l.auction_id
      WHERE a.status = 'active'
      GROUP BY a.id, a.title, a.description, a.status, a.start_time, a.end_time, a.created_by, a.created_at, a.updated_at
      ORDER BY a.start_time ASC
    `;
    
    const result = await dbManager.query(query);
    return result.rows;
  }

  // ===================== LOTS MODEL =====================

  /**
   * Create a new lot
   */
  async createLot(lotData) {
    const query = `
      INSERT INTO lots (auction_id, title, description, starting_bid, reserve_price, 
                       bid_increment, category, condition, image_urls, seller_email)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
      RETURNING *
    `;
    
    const values = [
      lotData.auction_id,
      lotData.title,
      lotData.description || null,
      lotData.starting_bid || 0,
      lotData.reserve_price || null,
      lotData.bid_increment || 10,
      lotData.category || null,
      lotData.condition || null,
      lotData.image_urls || [],
      lotData.seller_email || null
    ];
    
    const result = await dbManager.query(query, values);
    return result.rows[0];
  }

  /**
   * Get lot with current bid information
   */
  async getLotWithBids(lotId) {
    const query = `
      SELECT l.*,
             COALESCE(MAX(b.bid_amount), l.starting_bid) as current_bid,
             COUNT(b.id) as bid_count,
             (SELECT bidder_email FROM bids WHERE lot_id = l.id ORDER BY bid_amount DESC, bid_time DESC LIMIT 1) as highest_bidder
      FROM lots l
      LEFT JOIN bids b ON l.id = b.lot_id
      WHERE l.id = $1
      GROUP BY l.id
    `;
    
    const result = await dbManager.query(query, [lotId]);
    return result.rows[0] || null;
  }

  // ===================== BIDS MODEL =====================

  /**
   * Place a bid atomically (prevents race conditions)
   */
  async placeBid(bidData) {
    return await dbManager.transaction(async (client) => {
      // 1. Lock the lot for update
      const lockQuery = `
        SELECT l.*, COALESCE(MAX(b.bid_amount), l.starting_bid) as current_bid
        FROM lots l
        LEFT JOIN bids b ON l.id = b.lot_id
        WHERE l.id = $1
        GROUP BY l.id
        FOR UPDATE
      `;
      
      const lotResult = await client.query(lockQuery, [bidData.lot_id]);
      
      if (lotResult.rows.length === 0) {
        throw new Error('Lot not found');
      }
      
      const lot = lotResult.rows[0];
      
      // 2. Validate bid
      if (bidData.bid_amount <= lot.current_bid) {
        throw new Error(`Bid must be higher than current bid of ${lot.current_bid}`);
      }
      
      if (bidData.bid_amount < (lot.current_bid + lot.bid_increment)) {
        throw new Error(`Minimum bid is ${lot.current_bid + lot.bid_increment}`);
      }
      
      // 3. Check if user is outbidding themselves
      const lastBidQuery = `
        SELECT bidder_email FROM bids 
        WHERE lot_id = $1 
        ORDER BY bid_amount DESC, bid_time DESC 
        LIMIT 1
      `;
      
      const lastBidResult = await client.query(lastBidQuery, [bidData.lot_id]);
      
      if (lastBidResult.rows.length > 0 && lastBidResult.rows[0].bidder_email === bidData.bidder_email) {
        throw new Error('You are already the highest bidder');
      }
      
      // 4. Insert the bid
      const insertBidQuery = `
        INSERT INTO bids (lot_id, auction_id, bidder_email, bid_amount, ip_address, user_agent)
        VALUES ($1, $2, $3, $4, $5, $6)
        RETURNING *
      `;
      
      const bidValues = [
        bidData.lot_id,
        bidData.auction_id,
        bidData.bidder_email,
        bidData.bid_amount,
        bidData.ip_address || null,
        bidData.user_agent || null
      ];
      
      const bidResult = await client.query(insertBidQuery, bidValues);
      
      // 5. Update lot's current bid
      await client.query(
        'UPDATE lots SET current_bid = $2, updated_at = CURRENT_TIMESTAMP WHERE id = $1',
        [bidData.lot_id, bidData.bid_amount]
      );
      
      console.log(`💰 Bid placed atomically: ${bidData.bidder_email} bid ${bidData.bid_amount} on lot ${bidData.lot_id}`);
      
      return {
        bid: bidResult.rows[0],
        previous_bid: lot.current_bid,
        previous_bidder: lastBidResult.rows[0]?.bidder_email || null
      };
    });
  }

  /**
   * Get bid history for a lot
   */
  async getBidHistory(lotId, limit = 50) {
    const query = `
      SELECT bidder_email, bid_amount, bid_time, is_auto_bid
      FROM bids
      WHERE lot_id = $1
      ORDER BY bid_amount DESC, bid_time DESC
      LIMIT $2
    `;
    
    const result = await dbManager.query(query, [lotId, limit]);
    return result.rows;
  }

  // ===================== INVOICES MODEL =====================

  /**
   * Create invoice atomically
   */
  async createInvoice(invoiceData, items = []) {
    return await dbManager.transaction(async (client) => {
      // Create invoice
      const invoiceQuery = `
        INSERT INTO invoices (invoice_number, user_email, auction_id, invoice_type, 
                             subtotal, commission, total, due_date)
        VALUES ($1, $2, $3, $4, $5, $6, $7, $8)
        RETURNING *
      `;
      
      const invoiceValues = [
        invoiceData.invoice_number,
        invoiceData.user_email,
        invoiceData.auction_id,
        invoiceData.invoice_type,
        invoiceData.subtotal,
        invoiceData.commission,
        invoiceData.total,
        invoiceData.due_date || null
      ];
      
      const invoiceResult = await client.query(invoiceQuery, invoiceValues);
      const invoice = invoiceResult.rows[0];
      
      // Create invoice items
      for (const item of items) {
        const itemQuery = `
          INSERT INTO invoice_items (invoice_id, lot_id, item_description, quantity, unit_price, total_price)
          VALUES ($1, $2, $3, $4, $5, $6)
        `;
        
        const itemValues = [
          invoice.id,
          item.lot_id,
          item.item_description,
          item.quantity || 1,
          item.unit_price,
          item.total_price
        ];
        
        await client.query(itemQuery, itemValues);
      }
      
      return invoice;
    });
  }

  /**
   * Get invoice with items
   */
  async getInvoiceWithItems(invoiceId) {
    const invoiceQuery = 'SELECT * FROM invoices WHERE id = $1';
    const itemsQuery = 'SELECT * FROM invoice_items WHERE invoice_id = $1';
    
    const [invoiceResult, itemsResult] = await Promise.all([
      dbManager.query(invoiceQuery, [invoiceId]),
      dbManager.query(itemsQuery, [invoiceId])
    ]);
    
    if (invoiceResult.rows.length === 0) {
      return null;
    }
    
    const invoice = invoiceResult.rows[0];
    invoice.items = itemsResult.rows;
    
    return invoice;
  }

  // ===================== FICA MODEL =====================

  /**
   * Store FICA document
   */
  async storeFicaDocument(ficaData) {
    const query = `
      INSERT INTO fica_documents (user_email, file_url, original_filename, file_size, mime_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      ficaData.user_email,
      ficaData.file_url,
      ficaData.original_filename,
      ficaData.file_size,
      ficaData.mime_type
    ];
    
    const result = await dbManager.query(query, values);
    return result.rows[0];
  }

  /**
   * Get FICA status for user
   */
  async getFicaStatus(userEmail) {
    const query = `
      SELECT * FROM fica_documents 
      WHERE user_email = $1 
      ORDER BY uploaded_at DESC 
      LIMIT 1
    `;
    
    const result = await dbManager.query(query, [userEmail]);
    return result.rows[0] || null;
  }

  // ===================== UTILITY METHODS =====================

  /**
   * Health check - test database connectivity
   */
  async healthCheck() {
    try {
      const result = await dbManager.query('SELECT COUNT(*) as table_count FROM information_schema.tables WHERE table_schema = $1', ['public']);
      return {
        healthy: true,
        tables: parseInt(result.rows[0].table_count),
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      return {
        healthy: false,
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  /**
   * Get database statistics
   */
  async getStats() {
    const queries = [
      'SELECT COUNT(*) as count FROM users',
      'SELECT COUNT(*) as count FROM auctions',
      'SELECT COUNT(*) as count FROM lots',
      'SELECT COUNT(*) as count FROM bids',
      'SELECT COUNT(*) as count FROM invoices'
    ];
    
    const results = await Promise.all(queries.map(q => dbManager.query(q)));
    
    return {
      users: parseInt(results[0].rows[0].count),
      auctions: parseInt(results[1].rows[0].count),
      lots: parseInt(results[2].rows[0].count),
      bids: parseInt(results[3].rows[0].count),
      invoices: parseInt(results[4].rows[0].count),
      timestamp: new Date().toISOString()
    };
  }
}

module.exports = new DatabaseModels();