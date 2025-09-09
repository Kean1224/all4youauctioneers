// Admin endpoint to run database optimizations
const express = require('express');
const router = express.Router();
const { runOptimization } = require('../../database/run-optimization');

// POST /api/admin/optimize-database
// Run critical database optimizations for production scaling
router.post('/', async (req, res) => {
  try {
    console.log('🚀 Admin requested database optimization...');
    
    // Run the optimization
    await runOptimization();
    
    res.json({
      success: true,
      message: 'Database optimization completed successfully',
      optimizations: [
        'Critical indexes added for bids, lots, auctions',
        'Query performance optimized for 1000+ concurrent users',
        'Partial indexes created for active records',
        'Auto-vacuum settings optimized for high-write tables'
      ]
    });
    
  } catch (error) {
    console.error('❌ Database optimization failed:', error);
    
    res.status(500).json({
      success: false,
      error: 'Database optimization failed',
      message: error.message
    });
  }
});

module.exports = router;