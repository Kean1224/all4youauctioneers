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
      INSERT INTO users (
        email, password_hash, name, phone, address, city, postal_code,
        fica_approved, fica_file_url, email_verified, suspended
      )
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    // Handle FICA documents as JSON
    const ficaFiles = {};
    if (userData.idDocument) ficaFiles.idDocument = userData.idDocument;
    if (userData.proofOfAddress) ficaFiles.proofOfAddress = userData.proofOfAddress;
    if (userData.bankStatement) ficaFiles.bankStatement = userData.bankStatement;
    if (userData.watchlist) ficaFiles.watchlist = userData.watchlist;
    
    const values = [
      userData.email,
      userData.password_hash || userData.password, // Support both field names
      userData.name,
      userData.phone || null,
      userData.address || null,
      userData.city || null,
      userData.postal_code || userData.postalCode || null, // Support both field names
      userData.fica_approved || userData.ficaApproved || false,
      Object.keys(ficaFiles).length > 0 ? JSON.stringify(ficaFiles) : null,
      userData.email_verified || userData.emailVerified || false,
      userData.suspended || false
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
   * Update user details (including FICA document filenames and status)
   */
  async updateUser(email, userData) {
    const fields = [];
    const values = [email];
    let paramIndex = 2;

    // Dynamically build the SET clause based on provided fields
    const allowedFields = [
      'name', 'phone', 'address', 'city', 'postal_code', 'fica_approved', 
      'suspended', 'suspension_reason', 'rejection_reason', 'email_verified'
    ];

    for (const field of allowedFields) {
      if (userData.hasOwnProperty(field)) {
        fields.push(`${field} = $${paramIndex}`);
        values.push(userData[field]);
        paramIndex++;
      }
    }

    // Handle FICA document filenames (stored as JSON in fica_file_url for now)
    if (userData.idDocument || userData.proofOfAddress || userData.bankStatement) {
      const ficaFiles = {};
      if (userData.idDocument) ficaFiles.idDocument = userData.idDocument;
      if (userData.proofOfAddress) ficaFiles.proofOfAddress = userData.proofOfAddress;
      if (userData.bankStatement) ficaFiles.bankStatement = userData.bankStatement;
      
      fields.push(`fica_file_url = $${paramIndex}`);
      values.push(JSON.stringify(ficaFiles));
      paramIndex++;
    }

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    fields.push('updated_at = CURRENT_TIMESTAMP');

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE email = $1
      RETURNING *
    `;

    const result = await dbManager.query(query, values);
    return result.rows[0];
  }

  /**
   * Suspend/unsuspend user
   */
  async updateUserSuspension(email, suspended, reason = null) {
    const query = `
      UPDATE users 
      SET suspended = $2, suspension_reason = $3, updated_at = CURRENT_TIMESTAMP
      WHERE email = $1
      RETURNING *
    `;
    
    const result = await dbManager.query(query, [email, suspended, reason]);
    return result.rows[0];
  }

  /**
   * Update user's FICA approval status with rejection reason
   */
  async updateFicaApproval(email, approved, rejectionReason = null) {
    const fields = ['fica_approved = $2', 'updated_at = CURRENT_TIMESTAMP'];
    const values = [email, approved];
    let paramIndex = 3;

    if (!approved && rejectionReason) {
      fields.push(`rejection_reason = $${paramIndex}`);
      values.push(rejectionReason);
      paramIndex++;
    } else if (approved) {
      // Clear rejection reason when approving
      fields.push('rejection_reason = NULL');
    }

    const query = `
      UPDATE users 
      SET ${fields.join(', ')}
      WHERE email = $1
      RETURNING *
    `;

    const result = await dbManager.query(query, values);
    return result.rows[0];
  }

  /**
   * Update user's watchlist
   */
  async updateUserWatchlist(email, watchlist) {
    const query = `
      UPDATE users 
      SET fica_file_url = COALESCE(fica_file_url, '{}')::jsonb || jsonb_build_object('watchlist', $2::jsonb),
          updated_at = CURRENT_TIMESTAMP
      WHERE email = $1
      RETURNING *
    `;
    
    const result = await dbManager.query(query, [email, JSON.stringify(watchlist)]);
    return result.rows[0];
  }

  /**
   * Verify user email
   */
  async verifyUserEmail(email) {
    const query = `
      UPDATE users 
      SET email_verified = TRUE, updated_at = CURRENT_TIMESTAMP
      WHERE email = $1
      RETURNING *
    `;
    
    const result = await dbManager.query(query, [email]);
    return result.rows[0];
  }

  /**
   * Get user with extended data (including parsed FICA files)
   */
  async getUserWithExtendedData(email) {
    const user = await this.getUserByEmail(email);
    if (!user) return null;

    // Parse FICA file URLs if they exist
    let ficaFiles = {};
    if (user.fica_file_url) {
      try {
        ficaFiles = JSON.parse(user.fica_file_url);
      } catch (e) {
        // Legacy single file URL
        ficaFiles = { legacy: user.fica_file_url };
      }
    }

    return {
      ...user,
      idDocument: ficaFiles.idDocument,
      proofOfAddress: ficaFiles.proofOfAddress,
      bankStatement: ficaFiles.bankStatement,
      watchlist: ficaFiles.watchlist || []
    };
  }

  /**
   * Get all users (admin) - returns data compatible with existing API
   */
  async getAllUsers(limit = 100, offset = 0) {
    const query = `
      SELECT id, email, name, phone, address, city, postal_code, 
             fica_approved, fica_file_url, email_verified, suspended, 
             suspension_reason, rejection_reason, created_at, updated_at
      FROM users 
      ORDER BY created_at DESC 
      LIMIT $1 OFFSET $2
    `;
    
    const result = await dbManager.query(query, [limit, offset]);
    
    // Transform data to match the existing API format
    return result.rows.map(user => {
      let ficaFiles = {};
      if (user.fica_file_url) {
        try {
          ficaFiles = JSON.parse(user.fica_file_url);
        } catch (e) {
          ficaFiles = { legacy: user.fica_file_url };
        }
      }
      
      return {
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
        idDocument: ficaFiles.idDocument,
        proofOfAddress: ficaFiles.proofOfAddress,
        bankStatement: ficaFiles.bankStatement,
        watchlist: ficaFiles.watchlist || []
      };
    });
  }

  // ===================== AUCTIONS MODEL =====================

  /**
   * Create a new auction
   */
  async createAuction(auctionData) {
    const query = `
      INSERT INTO auctions (title, description, status, start_time, end_time, created_by, image_urls, location, increment, deposit_required, deposit_amount)
      VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11)
      RETURNING *
    `;
    
    const values = [
      auctionData.title,
      auctionData.description || null,
      auctionData.status || 'draft',
      auctionData.start_time || null,
      auctionData.end_time || null,
      auctionData.created_by || null,
      auctionData.image_urls || [],
      auctionData.location || null,
      auctionData.increment || 10,
      auctionData.deposit_required || false,
      auctionData.deposit_amount || 0
    ];
    
    const result = await dbManager.query(query, values);
    return result.rows[0];
  }

  /**
   * Get all auctions from database
   */
  async getAllAuctions() {
    const query = `
      SELECT * FROM auctions 
      ORDER BY created_at DESC
    `;
    const result = await dbManager.query(query);
    return result.rows;
  }

  /**
   * Get auction by ID
   */
  async getAuctionById(auctionId) {
    const query = `
      SELECT * FROM auctions 
      WHERE id = $1
    `;
    const result = await dbManager.query(query, [auctionId]);
    return result.rows[0] || null;
  }

  /**
   * Store auction image as base64 in PostgreSQL
   */
  async storeAuctionImage(imageData) {
    const query = `
      INSERT INTO auction_images (auction_id, file_url, original_filename, file_size, mime_type)
      VALUES ($1, $2, $3, $4, $5)
      RETURNING *
    `;
    
    const values = [
      imageData.auction_id,
      imageData.file_url,
      imageData.original_filename,
      imageData.file_size,
      imageData.mime_type
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
  /**
   * Get all lots for an auction
   */
  async getLotsByAuctionId(auctionId) {
    const query = `
      SELECT l.*,
             COALESCE(MAX(b.bid_amount), l.starting_bid) as current_bid,
             COUNT(b.id) as bid_count
      FROM lots l
      LEFT JOIN bids b ON l.id = b.lot_id
      WHERE l.auction_id = $1
      GROUP BY l.id
      ORDER BY l.id
    `;
    const result = await dbManager.query(query, [auctionId]);
    return result.rows;
  }

  /**
   * Update lot details
   */
  async updateLot(lotId, lotData) {
    const fields = [];
    const values = [];
    let paramIndex = 1;

    // Build dynamic update query
    Object.keys(lotData).forEach(key => {
      if (lotData[key] !== undefined) {
        fields.push(`${key} = $${paramIndex}`);
        values.push(lotData[key]);
        paramIndex++;
      }
    });

    if (fields.length === 0) {
      throw new Error('No fields to update');
    }

    values.push(lotId); // Add lotId as last parameter
    const query = `
      UPDATE lots 
      SET ${fields.join(', ')}, updated_at = CURRENT_TIMESTAMP
      WHERE id = $${paramIndex}
      RETURNING *
    `;

    const result = await dbManager.query(query, values);
    return result.rows[0];
  }

  /**
   * Delete lot from database
   */
  async deleteLot(lotId) {
    const query = 'DELETE FROM lots WHERE id = $1 RETURNING *';
    const result = await dbManager.query(query, [lotId]);
    return result.rows[0] || null;
  }

  /**
   * Get lot by ID with basic info
   */
  async getLotById(lotId) {
    const query = 'SELECT * FROM lots WHERE id = $1';
    const result = await dbManager.query(query, [lotId]);
    return result.rows[0] || null;
  }

  /**
   * Set auto-bid for a lot
   */
  async setAutoBid(lotId, bidderEmail, maxBid) {
    // For now, store auto-bids as JSON in a separate field or create auto_bids table later
    // This is a temporary solution - should create a proper auto_bids table
    const query = `
      UPDATE lots 
      SET auto_bids = COALESCE(auto_bids, '[]'::jsonb) || jsonb_build_object($2, $3)::jsonb,
          updated_at = CURRENT_TIMESTAMP
      WHERE id = $1
      RETURNING *
    `;
    const result = await dbManager.query(query, [lotId, bidderEmail, maxBid]);
    return result.rows[0];
  }

  /**
   * Get auto-bid for a user on a lot
   */
  async getAutoBid(lotId, bidderEmail) {
    const query = `
      SELECT auto_bids->$2 as max_bid 
      FROM lots 
      WHERE id = $1
    `;
    const result = await dbManager.query(query, [lotId, bidderEmail]);
    return result.rows[0]?.max_bid || null;
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

  /**
   * Generate consolidated invoices for auction completion
   * Creates buyer invoices (with 10% commission) and seller invoices (with 15% commission deduction)
   */
  async generateAuctionInvoices(auctionId) {
    console.log('📋 Generating invoices for auction:', auctionId);
    
    // Get auction with lots and their winning bids
    const auctionData = await this.getAuctionWithLots(auctionId);
    if (!auctionData || !auctionData.lots) {
      throw new Error('Auction or lots not found');
    }

    // Filter only sold lots (lots with winning bids)
    const soldLots = auctionData.lots.filter(lot => {
      const lastBid = lot.bidHistory?.[lot.bidHistory.length - 1];
      return lastBid && lot.status === 'ended';
    });

    if (soldLots.length === 0) {
      console.log('⚠️  No sold lots found for auction', auctionId);
      return { buyerInvoices: [], sellerInvoices: [] };
    }

    // Group lots by buyer (winner) and seller
    const lotsByBuyer = {};
    const lotsBySeller = {};

    soldLots.forEach(lot => {
      const lastBid = lot.bidHistory[lot.bidHistory.length - 1];
      const buyerEmail = lastBid.bidderEmail;
      const sellerEmail = lot.sellerEmail || lot.seller_email;
      
      // Group by buyer
      if (!lotsByBuyer[buyerEmail]) {
        lotsByBuyer[buyerEmail] = [];
      }
      lotsByBuyer[buyerEmail].push({ ...lot, winningBid: lastBid.amount });

      // Group by seller (if seller is specified)
      if (sellerEmail && sellerEmail.trim()) {
        if (!lotsBySeller[sellerEmail]) {
          lotsBySeller[sellerEmail] = [];
        }
        lotsBySeller[sellerEmail].push({ ...lot, winningBid: lastBid.amount });
      }
    });

    const createdInvoices = { buyerInvoices: [], sellerInvoices: [] };

    // Generate buyer invoices (consolidated by buyer)
    for (const [buyerEmail, lots] of Object.entries(lotsByBuyer)) {
      const buyerInvoice = await this.createBuyerInvoice(auctionId, buyerEmail, lots);
      createdInvoices.buyerInvoices.push(buyerInvoice);
    }

    // Generate seller invoices (consolidated by seller)  
    for (const [sellerEmail, lots] of Object.entries(lotsBySeller)) {
      const sellerInvoice = await this.createSellerInvoice(auctionId, sellerEmail, lots);
      createdInvoices.sellerInvoices.push(sellerInvoice);
    }

    console.log(`✅ Generated ${createdInvoices.buyerInvoices.length} buyer invoices and ${createdInvoices.sellerInvoices.length} seller invoices`);
    return createdInvoices;
  }

  /**
   * Create buyer invoice with 10% commission
   */
  async createBuyerInvoice(auctionId, buyerEmail, lots) {
    const subtotal = lots.reduce((sum, lot) => sum + lot.winningBid, 0);
    const commission = Math.round(subtotal * 0.10 * 100) / 100; // 10% buyer commission
    const total = subtotal + commission;
    
    const invoiceNumber = `BUY-${auctionId}-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const dueDate = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days from now

    const invoiceData = {
      invoice_number: invoiceNumber,
      user_email: buyerEmail,
      auction_id: auctionId,
      invoice_type: 'buyer',
      subtotal: subtotal,
      commission: commission,
      total: total,
      due_date: dueDate
    };

    const items = lots.map(lot => ({
      lot_id: lot.id,
      item_description: `Lot ${lot.lotNumber || lot.id}: ${lot.title}`,
      quantity: 1,
      unit_price: lot.winningBid,
      total_price: lot.winningBid
    }));

    console.log(`💰 Creating buyer invoice for ${buyerEmail}: R${total} (${lots.length} items)`);
    return await this.createInvoice(invoiceData, items);
  }

  /**
   * Create seller invoice with 15% commission deduction  
   */
  async createSellerInvoice(auctionId, sellerEmail, lots) {
    const subtotal = lots.reduce((sum, lot) => sum + lot.winningBid, 0);
    const commission = Math.round(subtotal * 0.15 * 100) / 100; // 15% seller commission
    const total = subtotal - commission; // Seller gets paid LESS commission

    const invoiceNumber = `SELL-${auctionId}-${Date.now()}-${Math.random().toString(36).substr(2, 4).toUpperCase()}`;
    const dueDate = new Date(Date.now() + 14 * 24 * 60 * 60 * 1000); // 14 days from now

    const invoiceData = {
      invoice_number: invoiceNumber,
      user_email: sellerEmail,
      auction_id: auctionId,
      invoice_type: 'seller',
      subtotal: subtotal,
      commission: commission,
      total: total, // Amount to pay seller (after commission deduction)
      due_date: dueDate
    };

    const items = lots.map(lot => ({
      lot_id: lot.id,
      item_description: `Lot ${lot.lotNumber || lot.id}: ${lot.title}`,
      quantity: 1,
      unit_price: lot.winningBid,
      total_price: lot.winningBid
    }));

    console.log(`💳 Creating seller invoice for ${sellerEmail}: R${total} payout (R${commission} commission deducted)`);
    return await this.createInvoice(invoiceData, items);
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

  // ===================== COMPANY ASSETS MODEL =====================

  /**
   * Store company logo
   */
  async storeCompanyLogo(logoData) {
    const query = `
      INSERT INTO company_assets (asset_type, file_url, original_filename, file_size, mime_type)
      VALUES ($1, $2, $3, $4, $5)
      ON CONFLICT (asset_type) 
      DO UPDATE SET 
        file_url = EXCLUDED.file_url,
        original_filename = EXCLUDED.original_filename,
        file_size = EXCLUDED.file_size,
        mime_type = EXCLUDED.mime_type,
        updated_at = CURRENT_TIMESTAMP
      RETURNING *
    `;
    
    const values = [
      'logo',
      logoData.file_url,
      logoData.original_filename,
      logoData.file_size,
      logoData.mime_type
    ];
    
    const result = await dbManager.query(query, values);
    return result.rows[0];
  }

  /**
   * Get company logo
   */
  async getCompanyLogo() {
    const query = 'SELECT * FROM company_assets WHERE asset_type = $1';
    const result = await dbManager.query(query, ['logo']);
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