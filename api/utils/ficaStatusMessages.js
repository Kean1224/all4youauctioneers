// Enhanced FICA status messaging for better user communication

const FICA_STATUS_MESSAGES = {
  // Registration success messages
  REGISTRATION_SUCCESS_PENDING: {
    title: "🎉 Registration Successful - Verification Required",
    shortMessage: "Account created successfully! FICA verification required before participating in auctions.",
    detailedMessage: `
      <div style="background: #fef3c7; border: 1px solid #f59e0b; border-radius: 8px; padding: 16px; margin: 16px 0;">
        <h4 style="color: #92400e; margin: 0 0 8px 0;">📋 Next Steps - FICA Verification</h4>
        <p style="color: #92400e; margin: 0 0 8px 0;">Your account has been created and your documents have been submitted for admin review.</p>
        <p style="color: #92400e; margin: 0 0 8px 0;"><strong>⏳ Expected Review Time:</strong> 1-3 business days</p>
        <p style="color: #92400e; margin: 0 0 8px 0;"><strong>📧 Notification:</strong> You'll receive an email once approved</p>
        <p style="color: #92400e; margin: 0;"><strong>🚫 Current Restrictions:</strong> Cannot bid, place auto-bids, or participate in auctions until approved</p>
      </div>
    `,
    emailSubject: "FICA Documents Submitted - Verification Pending",
    actionRequired: false
  },

  // Login attempts before approval
  LOGIN_PENDING_APPROVAL: {
    title: "Account Under Review",
    shortMessage: "Your FICA documents are still being reviewed by our admin team.",
    detailedMessage: "You can browse auctions but cannot participate until your FICA documents are approved. This typically takes 1-3 business days.",
    actionRequired: false
  },

  // Bidding attempt before approval
  BIDDING_BLOCKED: {
    title: "❌ Bidding Not Available",
    shortMessage: "FICA verification required before bidding",
    detailedMessage: `
      <div style="background: #fee2e2; border: 1px solid #ef4444; border-radius: 8px; padding: 16px;">
        <h4 style="color: #dc2626; margin: 0 0 8px 0;">🔒 Account Verification Required</h4>
        <p style="color: #dc2626; margin: 0 0 8px 0;">Your FICA documents are currently under admin review.</p>
        <p style="color: #dc2626; margin: 0 0 8px 0;"><strong>Status:</strong> Pending Approval</p>
        <p style="color: #dc2626; margin: 0 0 8px 0;"><strong>What You Can Do:</strong></p>
        <ul style="color: #dc2626; margin: 0; padding-left: 20px;">
          <li>Browse current and upcoming auctions</li>
          <li>View lot details and descriptions</li>
          <li>Add items to your watchlist</li>
        </ul>
        <p style="color: #dc2626; margin: 8px 0 0 0;"><strong>🕐 Approval typically takes 1-3 business days</strong></p>
      </div>
    `,
    actionRequired: false
  },

  // Auto-bid attempt before approval
  AUTO_BID_BLOCKED: {
    title: "❌ Auto-Bidding Not Available", 
    shortMessage: "FICA verification required before setting auto-bids",
    detailedMessage: "Your FICA documents are pending approval. You will be able to set auto-bids once approved by our admin team (typically 1-3 business days).",
    actionRequired: false
  },

  // FICA approved
  FICA_APPROVED: {
    title: "🎉 Account Verified - Welcome to All4You Auctions!",
    shortMessage: "Your FICA documents have been approved. You can now participate in all auctions!",
    detailedMessage: `
      <div style="background: #d1fae5; border: 1px solid #10b981; border-radius: 8px; padding: 16px;">
        <h4 style="color: #065f46; margin: 0 0 8px 0;">✅ Account Fully Verified</h4>
        <p style="color: #065f46; margin: 0 0 8px 0;">Congratulations! Your FICA documents have been approved.</p>
        <p style="color: #065f46; margin: 0 0 8px 0;"><strong>You Can Now:</strong></p>
        <ul style="color: #065f46; margin: 0; padding-left: 20px;">
          <li>Place bids on auction lots</li>
          <li>Set up automatic bidding</li>
          <li>Participate in live auctions</li>
          <li>Submit items for future auctions</li>
        </ul>
        <p style="color: #065f46; margin: 8px 0 0 0;"><strong>🎯 Start bidding today!</strong></p>
      </div>
    `,
    emailSubject: "FICA Approved - Welcome to All4You Auctions!",
    actionRequired: false
  },

  // FICA rejected
  FICA_REJECTED: {
    title: "📄 Document Resubmission Required",
    shortMessage: "Your FICA documents need to be updated. Please resubmit clear, valid documents.",
    detailedMessage: "Your submitted documents could not be verified. Please upload clear, valid copies of your ID and proof of address to continue.",
    emailSubject: "FICA Documents - Resubmission Required",
    actionRequired: true
  },

  // Dashboard status messages
  DASHBOARD_PENDING: {
    title: "⏳ Account Verification in Progress",
    shortMessage: "Your account is being reviewed. You'll be notified once approved.",
    detailedMessage: `
      <div style="background: #fef3c7; border-left: 4px solid #f59e0b; padding: 16px;">
        <h4 style="color: #92400e; margin: 0 0 8px 0;">🔍 FICA Review Status</h4>
        <p style="color: #92400e; margin: 0 0 8px 0;"><strong>Current Status:</strong> Under Review</p>
        <p style="color: #92400e; margin: 0 0 8px 0;"><strong>Submitted:</strong> ID Document ✅ | Proof of Address ✅</p>
        <p style="color: #92400e; margin: 0 0 8px 0;"><strong>Review Time:</strong> 1-3 business days</p>
        <p style="color: #92400e; margin: 0;"><strong>Next Steps:</strong> Wait for admin approval - you'll receive an email notification</p>
      </div>
    `,
    actionRequired: false
  }
};

// Helper function to get appropriate message
const getFicaStatusMessage = (user, context = 'general') => {
  const { ficaApproved, rejectionReason, createdAt } = user;

  // User has been rejected
  if (rejectionReason) {
    return FICA_STATUS_MESSAGES.FICA_REJECTED;
  }

  // User is approved
  if (ficaApproved) {
    return FICA_STATUS_MESSAGES.FICA_APPROVED;
  }

  // User is pending approval - return context-specific message
  switch (context) {
    case 'registration':
      return FICA_STATUS_MESSAGES.REGISTRATION_SUCCESS_PENDING;
    case 'login':
      return FICA_STATUS_MESSAGES.LOGIN_PENDING_APPROVAL;
    case 'bidding':
      return FICA_STATUS_MESSAGES.BIDDING_BLOCKED;
    case 'auto_bid':
      return FICA_STATUS_MESSAGES.AUTO_BID_BLOCKED;
    case 'dashboard':
      return FICA_STATUS_MESSAGES.DASHBOARD_PENDING;
    default:
      return FICA_STATUS_MESSAGES.DASHBOARD_PENDING;
  }
};

// Email templates for FICA status updates
const generateFicaStatusEmail = (user, status) => {
  const message = getFicaStatusMessage(user, status);
  
  return {
    subject: message.emailSubject || 'All4You Auctions - Account Status Update',
    html: `
      <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto; background: #ffffff;">
        <div style="background: #f59e0b; color: white; padding: 20px; text-align: center;">
          <h1 style="margin: 0; font-size: 24px;">ALL4YOU AUCTIONEERS</h1>
          <p style="margin: 8px 0 0 0; font-size: 14px;">Professional Auction Services</p>
        </div>
        
        <div style="padding: 20px;">
          <h2 style="color: #374151; margin: 0 0 16px 0;">${message.title}</h2>
          
          <p style="color: #374151; margin: 0 0 16px 0;">Hi ${user.name || 'there'},</p>
          
          ${message.detailedMessage}
          
          <div style="background: #f3f4f6; padding: 16px; border-radius: 8px; margin: 16px 0;">
            <h4 style="color: #374151; margin: 0 0 8px 0;">📞 Need Help?</h4>
            <p style="color: #6b7280; margin: 0 0 4px 0;">Email: admin@all4youauctions.co.za</p>
            <p style="color: #6b7280; margin: 0 0 4px 0;">Phone: +27 11 123 4567</p>
            <p style="color: #6b7280; margin: 0;">Website: www.all4youauctions.co.za</p>
          </div>
          
          <p style="color: #374151; margin: 16px 0 0 0;">
            Best regards,<br>
            <strong>All4You Auctions Team</strong>
          </p>
        </div>
        
        <div style="background: #f9fafb; color: #6b7280; padding: 16px; text-align: center; font-size: 12px;">
          <p style="margin: 0;">This is an automated message from All4You Auctioneers</p>
        </div>
      </div>
    `,
    text: `
${message.title}

Hi ${user.name || 'there'},

${message.shortMessage}

${status === 'approved' ? 'You can now participate in all auctions!' : 'Please wait for admin approval before participating in auctions.'}

Need help? Contact us at admin@all4youauctions.co.za or +27 11 123 4567

Best regards,
All4You Auctions Team
    `
  };
};

module.exports = {
  FICA_STATUS_MESSAGES,
  getFicaStatusMessage,
  generateFicaStatusEmail
};