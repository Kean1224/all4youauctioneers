const fs = require('fs').promises;
const path = require('path');
const lockManager = require('./file-lock');

/**
 * Atomic Data Operations - Prevents race conditions in critical operations
 * Essential for bidding system integrity and data consistency
 */
class AtomicDataOperations {
  constructor() {
    this.dataDir = path.join(__dirname, '..', 'data');
  }

  /**
   * Atomically read and modify data file
   */
  async atomicReadModifyWrite(filename, modifyFn, options = {}) {
    const filePath = path.join(this.dataDir, filename);
    const backupPath = `${filePath}.backup`;
    const tempPath = `${filePath}.tmp`;
    
    return await lockManager.withLock(filePath, async () => {
      try {
        // Step 1: Read current data
        let currentData;
        try {
          const rawData = await fs.readFile(filePath, 'utf-8');
          currentData = JSON.parse(rawData);
        } catch (error) {
          if (error.code === 'ENOENT') {
            currentData = options.defaultData || [];
          } else {
            throw error;
          }
        }

        // Step 2: Create backup
        if (currentData && Object.keys(currentData).length > 0) {
          await fs.writeFile(backupPath, JSON.stringify(currentData, null, 2));
        }

        // Step 3: Apply modification
        const modifiedData = await modifyFn(currentData);
        
        if (modifiedData === null || modifiedData === undefined) {
          throw new Error('Modification function returned null/undefined');
        }

        // Step 4: Write to temporary file
        await fs.writeFile(tempPath, JSON.stringify(modifiedData, null, 2));

        // Step 5: Atomic rename (OS-level atomic operation)
        await fs.rename(tempPath, filePath);

        // Step 6: Cleanup backup after successful write
        try {
          await fs.unlink(backupPath);
        } catch (e) {
          // Backup cleanup failure is non-critical
          console.warn(`⚠️  Failed to cleanup backup: ${backupPath}`);
        }

        console.log(`✅ Atomic operation completed: ${filename}`);
        return modifiedData;

      } catch (error) {
        console.error(`❌ Atomic operation failed for ${filename}:`, error);
        
        // Cleanup temporary file
        try {
          await fs.unlink(tempPath);
        } catch (e) {
          // Ignore cleanup errors
        }

        // Attempt recovery from backup
        try {
          await fs.copyFile(backupPath, filePath);
          console.log(`🔄 Recovered from backup: ${filename}`);
        } catch (recoveryError) {
          console.error(`❌ Recovery failed: ${recoveryError.message}`);
        }

        throw error;
      }
    });
  }

  /**
   * Atomic bid placement - prevents race conditions in bidding
   */
  async placeBidAtomically(auctionId, lotId, bidData) {
    return await this.atomicReadModifyWrite('auctions.json', (auctions) => {
      const auction = auctions.find(a => a.id === auctionId);
      if (!auction) {
        throw new Error(`Auction not found: ${auctionId}`);
      }

      const lot = auction.lots?.find(l => l.id === lotId);
      if (!lot) {
        throw new Error(`Lot not found: ${lotId} in auction ${auctionId}`);
      }

      // Validate bid amount
      const newBidAmount = parseFloat(bidData.bidAmount);
      const currentBid = parseFloat(lot.currentBid) || 0;
      const minimumIncrement = parseFloat(lot.minimumIncrement) || 10;

      if (newBidAmount <= currentBid) {
        throw new Error(`Bid amount ${newBidAmount} must be higher than current bid ${currentBid}`);
      }

      if (newBidAmount < (currentBid + minimumIncrement)) {
        throw new Error(`Bid increment too small. Minimum: ${currentBid + minimumIncrement}`);
      }

      // Check auction status
      if (auction.status !== 'active') {
        throw new Error(`Cannot bid on ${auction.status} auction`);
      }

      // Check lot status
      if (lot.status === 'sold' || lot.status === 'withdrawn') {
        throw new Error(`Cannot bid on ${lot.status} lot`);
      }

      // Update lot with new bid
      const previousBidder = lot.highestBidder;
      const previousBid = lot.currentBid;

      lot.currentBid = newBidAmount;
      lot.highestBidder = bidData.bidderEmail;
      lot.bidCount = (lot.bidCount || 0) + 1;
      lot.lastBidTime = new Date().toISOString();

      // Add to bid history
      if (!lot.bidHistory) {
        lot.bidHistory = [];
      }

      lot.bidHistory.push({
        bidder: bidData.bidderEmail,
        amount: newBidAmount,
        timestamp: new Date().toISOString(),
        bidId: `bid_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`
      });

      // Auto-extend auction if needed (sniping protection)
      if (auction.endTime) {
        const endTime = new Date(auction.endTime);
        const now = new Date();
        const timeRemaining = endTime - now;
        
        // If less than 5 minutes remaining, extend by 5 minutes
        if (timeRemaining < 5 * 60 * 1000) {
          const newEndTime = new Date(now.getTime() + 5 * 60 * 1000);
          auction.endTime = newEndTime.toISOString();
          console.log(`⏱️  Auction ${auctionId} extended to ${newEndTime.toISOString()}`);
        }
      }

      console.log(`💰 Bid placed atomically: ${bidData.bidderEmail} bid ${newBidAmount} on lot ${lotId}`);
      
      return {
        auctions,
        bidResult: {
          success: true,
          newBid: newBidAmount,
          previousBid: previousBid,
          previousBidder: previousBidder,
          lotId: lotId,
          auctionId: auctionId,
          bidHistory: lot.bidHistory,
          auctionExtended: auction.endTime !== bidData.originalEndTime
        }
      };
    }, { defaultData: [] });
  }

  /**
   * Atomic user registration - prevents duplicate registrations
   */
  async registerUserAtomically(userData) {
    return await this.atomicReadModifyWrite('users.json', (users) => {
      // Check for existing user
      const existingUser = users.find(u => u.email === userData.email);
      if (existingUser) {
        throw new Error(`User already exists: ${userData.email}`);
      }

      // Generate unique user ID
      const userId = `user_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
      
      const newUser = {
        id: userId,
        ...userData,
        registrationDate: new Date().toISOString(),
        status: 'pending_verification',
        verified: false
      };

      users.push(newUser);
      
      console.log(`👤 User registered atomically: ${userData.email}`);
      return users;
    }, { defaultData: [] });
  }

  /**
   * Atomic invoice generation - ensures unique invoice numbers
   */
  async generateInvoiceAtomically(invoiceData) {
    return await this.atomicReadModifyWrite('invoices.json', (invoices) => {
      // Generate unique invoice number
      const invoiceNumber = `INV-${new Date().getFullYear()}-${String(invoices.length + 1).padStart(6, '0')}`;
      
      const invoice = {
        id: `invoice_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        invoiceNumber: invoiceNumber,
        ...invoiceData,
        createdAt: new Date().toISOString(),
        status: 'pending'
      };

      invoices.push(invoice);
      
      console.log(`📄 Invoice generated atomically: ${invoiceNumber}`);
      return invoices;
    }, { defaultData: [] });
  }

  /**
   * Get atomic operation statistics
   */
  getStats() {
    return lockManager.getLockStats();
  }
}

// Export singleton instance
module.exports = new AtomicDataOperations();