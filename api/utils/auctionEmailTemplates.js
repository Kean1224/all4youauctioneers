const { sendMail } = require('./mailer');

// Email template styles
const emailStyles = `
<style>
  .email-container { 
    max-width: 600px; 
    margin: 0 auto; 
    font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif; 
    background: linear-gradient(135deg, #f5f7fa 0%, #c3cfe2 100%);
    padding: 20px;
  }
  .email-content { 
    background: white; 
    border-radius: 12px; 
    padding: 30px; 
    box-shadow: 0 10px 25px rgba(0,0,0,0.1);
  }
  .header { 
    text-align: center; 
    border-bottom: 3px solid #f59e0b; 
    padding-bottom: 20px; 
    margin-bottom: 30px;
  }
  .logo { 
    font-size: 32px; 
    color: #f59e0b; 
    font-weight: bold; 
    margin-bottom: 10px;
  }
  .auction-badge {
    background: linear-gradient(45deg, #f59e0b, #d97706);
    color: white;
    padding: 8px 16px;
    border-radius: 20px;
    font-size: 14px;
    font-weight: bold;
    display: inline-block;
    margin: 10px 0;
  }
  .bid-amount {
    font-size: 28px;
    color: #059669;
    font-weight: bold;
    text-align: center;
    background: #ecfdf5;
    padding: 15px;
    border-radius: 8px;
    margin: 15px 0;
  }
  .lot-details {
    background: #f8fafc;
    padding: 20px;
    border-radius: 8px;
    border-left: 4px solid #f59e0b;
    margin: 20px 0;
  }
  .warning-box {
    background: #fef2f2;
    border: 1px solid #fecaca;
    color: #dc2626;
    padding: 15px;
    border-radius: 8px;
    margin: 15px 0;
  }
  .success-box {
    background: #f0fdf4;
    border: 1px solid #bbf7d0;
    color: #166534;
    padding: 15px;
    border-radius: 8px;
    margin: 15px 0;
  }
  .action-button {
    background: linear-gradient(45deg, #f59e0b, #d97706);
    color: white;
    padding: 12px 24px;
    border-radius: 8px;
    text-decoration: none;
    font-weight: bold;
    display: inline-block;
    margin: 20px 0;
  }
  .footer {
    text-align: center;
    margin-top: 30px;
    padding-top: 20px;
    border-top: 1px solid #e5e7eb;
    color: #6b7280;
    font-size: 14px;
  }
  .countdown {
    background: #dbeafe;
    color: #1e40af;
    padding: 10px;
    border-radius: 6px;
    font-weight: bold;
    text-align: center;
    margin: 10px 0;
  }
</style>
`;

// 1. OUTBID NOTIFICATION EMAIL
async function sendOutbidNotification({
  bidderEmail,
  lotTitle,
  auctionTitle,
  auctionId,
  lotId,
  currentBid,
  newBidAmount,
  timeRemaining,
  isAutoBid = false,
  autoBidderMasked = null
}) {
  const subject = `🚨 You've been outbid on "${lotTitle}"`;
  
  const html = `
    ${emailStyles}
    <div class="email-container">
      <div class="email-content">
        <div class="header">
          <div class="logo">🏆 ALL4YOU AUCTIONEERS</div>
          <span class="auction-badge">OUTBID ALERT</span>
        </div>
        
        <h2 style="color: #dc2626; text-align: center;">⚠️ You've Been Outbid!</h2>
        
        <div class="warning-box">
          <strong>Another bidder has placed a higher bid on your lot.</strong>
          ${isAutoBid ? '<br><em>This was an automatic bid.</em>' : ''}
        </div>
        
        <div class="lot-details">
          <h3 style="margin-top: 0; color: #374151;">Lot Details:</h3>
          <p><strong>Auction:</strong> ${auctionTitle}</p>
          <p><strong>Lot:</strong> ${lotTitle}</p>
          <p><strong>Your Previous Bid:</strong> R${currentBid.toLocaleString()}</p>
          <p><strong>New Leading Bid:</strong> R${newBidAmount.toLocaleString()}</p>
          ${autoBidderMasked ? `<p><strong>Outbid by:</strong> ${autoBidderMasked} (Auto-bid)</p>` : ''}
        </div>
        
        <div class="bid-amount">
          New Leading Bid: R${newBidAmount.toLocaleString()}
        </div>
        
        ${timeRemaining ? `
        <div class="countdown">
          ⏰ Time Remaining: ${timeRemaining}
        </div>
        ` : ''}
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL}/auctions/${auctionId}#lot-${lotId}" class="action-button">
            🔥 Place New Bid Now
          </a>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #f9fafb; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: #6b7280;">
            <strong>Quick Tip:</strong> Consider setting up an auto-bid to stay competitive without constantly monitoring the auction.
          </p>
        </div>
        
        <div class="footer">
          <p>Best regards,<br><strong>The ALL4YOU AUCTIONEERS Team</strong></p>
          <p style="font-size: 12px;">
            This is an automated notification. Visit your auction dashboard for more details.
          </p>
        </div>
      </div>
    </div>
  `;

  const text = `
🚨 OUTBID ALERT - ${lotTitle}

You've been outbid on "${lotTitle}" in the "${auctionTitle}" auction.

Your previous bid: R${currentBid.toLocaleString()}
New leading bid: R${newBidAmount.toLocaleString()}
${isAutoBid ? 'This was an automatic bid.' : ''}

${timeRemaining ? `Time remaining: ${timeRemaining}` : 'Auction may be ending soon.'}

Place a new bid: ${process.env.FRONTEND_URL}/auctions/${auctionId}#lot-${lotId}

- ALL4YOU AUCTIONEERS Team
  `;

  return await sendMail({ to: bidderEmail, subject, text, html });
}

// 2. BID CONFIRMATION EMAIL
async function sendBidConfirmation({
  bidderEmail,
  lotTitle,
  auctionTitle,
  auctionId,
  lotId,
  bidAmount,
  timeRemaining,
  isAutoBid = false,
  nextMinBid = null
}) {
  const subject = `✅ Bid Confirmed: R${bidAmount.toLocaleString()} on "${lotTitle}"`;
  
  const html = `
    ${emailStyles}
    <div class="email-container">
      <div class="email-content">
        <div class="header">
          <div class="logo">🏆 ALL4YOU AUCTIONEERS</div>
          <span class="auction-badge">${isAutoBid ? 'AUTO-BID PLACED' : 'BID CONFIRMED'}</span>
        </div>
        
        <h2 style="color: #059669; text-align: center;">🎯 ${isAutoBid ? 'Auto-Bid Successful!' : 'Bid Placed Successfully!'}</h2>
        
        <div class="success-box">
          <strong>Your ${isAutoBid ? 'automatic ' : ''}bid has been placed and you are currently the highest bidder!</strong>
        </div>
        
        <div class="bid-amount">
          Your Winning Bid: R${bidAmount.toLocaleString()}
        </div>
        
        <div class="lot-details">
          <h3 style="margin-top: 0; color: #374151;">Auction Details:</h3>
          <p><strong>Auction:</strong> ${auctionTitle}</p>
          <p><strong>Lot:</strong> ${lotTitle}</p>
          <p><strong>Your Bid:</strong> R${bidAmount.toLocaleString()}</p>
          ${nextMinBid ? `<p><strong>Next Minimum Bid:</strong> R${nextMinBid.toLocaleString()}</p>` : ''}
          <p><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">LEADING BID</span></p>
        </div>
        
        ${timeRemaining ? `
        <div class="countdown">
          ⏰ Time Remaining: ${timeRemaining}
        </div>
        ` : ''}
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL}/auctions/${auctionId}#lot-${lotId}" class="action-button">
            👁️ Watch Auction Live
          </a>
        </div>
        
        ${isAutoBid ? `
        <div style="margin-top: 20px; padding: 15px; background: #ede9fe; border-radius: 8px; border-left: 4px solid #8b5cf6;">
          <h4 style="margin-top: 0; color: #6b46c1;">Auto-Bid Information</h4>
          <p style="margin: 0; font-size: 14px; color: #6b46c1;">
            This bid was placed automatically by our system based on your auto-bid settings. 
            We'll continue bidding on your behalf up to your maximum amount.
          </p>
        </div>
        ` : ''}
        
        <div style="margin-top: 20px; padding: 15px; background: #f0f9ff; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: #0369a1;">
            <strong>What's Next?</strong> Monitor the auction and we'll notify you immediately if someone outbids you. 
            The auction ends when the timer reaches zero with no new bids.
          </p>
        </div>
        
        <div class="footer">
          <p>Good luck with your auction!<br><strong>The ALL4YOU AUCTIONEERS Team</strong></p>
        </div>
      </div>
    </div>
  `;

  const text = `
✅ BID CONFIRMED - ${lotTitle}

Your ${isAutoBid ? 'auto-' : ''}bid of R${bidAmount.toLocaleString()} has been placed on "${lotTitle}" in the "${auctionTitle}" auction.

You are currently the highest bidder!

${timeRemaining ? `Time remaining: ${timeRemaining}` : 'Auction status: Active'}
${nextMinBid ? `Next minimum bid: R${nextMinBid.toLocaleString()}` : ''}

Watch live: ${process.env.FRONTEND_URL}/auctions/${auctionId}#lot-${lotId}

We'll notify you immediately if someone outbids you.

- ALL4YOU AUCTIONEERS Team
  `;

  return await sendMail({ to: bidderEmail, subject, text, html });
}

// 3. AUCTION ENDING SOON EMAIL
async function sendAuctionEndingSoon({
  userEmail,
  auctionTitle,
  auctionId,
  timeRemaining,
  userActiveLots = []
}) {
  const subject = `⏰ Auction ending soon: "${auctionTitle}" - Final chance to bid!`;
  
  const activeBidsText = userActiveLots.length > 0 
    ? `You have active bids on ${userActiveLots.length} lot(s).`
    : 'Browse lots you might be interested in.';
  
  const html = `
    ${emailStyles}
    <div class="email-container">
      <div class="email-content">
        <div class="header">
          <div class="logo">🏆 ALL4YOU AUCTIONEERS</div>
          <span class="auction-badge">ENDING SOON</span>
        </div>
        
        <h2 style="color: #d97706; text-align: center;">⏰ Final Call: Auction Ending Soon!</h2>
        
        <div class="countdown">
          ${timeRemaining} remaining in "${auctionTitle}"
        </div>
        
        <div style="text-align: center; margin: 20px 0;">
          <p style="font-size: 18px; color: #374151;">
            ${activeBidsText}
          </p>
        </div>
        
        ${userActiveLots.length > 0 ? `
        <div class="lot-details">
          <h3 style="margin-top: 0; color: #374151;">Your Active Bids:</h3>
          ${userActiveLots.map(lot => `
            <div style="margin: 10px 0; padding: 10px; background: white; border-radius: 6px; border: 1px solid #e5e7eb;">
              <strong>${lot.title}</strong><br>
              <span style="color: #059669;">Your Bid: R${lot.yourBid.toLocaleString()}</span>
              ${lot.isWinning ? '<span style="color: #059669; font-weight: bold;"> (WINNING)</span>' : '<span style="color: #dc2626;"> (OUTBID)</span>'}
            </div>
          `).join('')}
        </div>
        ` : ''}
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL}/auctions/${auctionId}" class="action-button">
            🔥 View Auction Now
          </a>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #fef3c7; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: #92400e;">
            <strong>⚡ Last Chance:</strong> This auction will end soon! Don't miss out on items you're interested in. 
            Bidding will close automatically when the timer reaches zero.
          </p>
        </div>
        
        <div class="footer">
          <p>Happy bidding!<br><strong>The ALL4YOU AUCTIONEERS Team</strong></p>
        </div>
      </div>
    </div>
  `;

  const text = `
⏰ AUCTION ENDING SOON - ${auctionTitle}

${timeRemaining} remaining!

${activeBidsText}

${userActiveLots.length > 0 ? `
Your active bids:
${userActiveLots.map(lot => `- ${lot.title}: R${lot.yourBid.toLocaleString()} ${lot.isWinning ? '(WINNING)' : '(OUTBID)'}`).join('\n')}
` : ''}

This is your final chance to bid before the auction ends!

View auction: ${process.env.FRONTEND_URL}/auctions/${auctionId}

- ALL4YOU AUCTIONEERS Team
  `;

  return await sendMail({ to: userEmail, subject, text, html });
}

// 4. AUCTION WON EMAIL
async function sendAuctionWonNotification({
  winnerEmail,
  lotTitle,
  auctionTitle,
  auctionId,
  lotId,
  winningBid,
  invoiceNumber = null
}) {
  const subject = `🎉 Congratulations! You won "${lotTitle}" for R${winningBid.toLocaleString()}`;
  
  const html = `
    ${emailStyles}
    <div class="email-container">
      <div class="email-content">
        <div class="header">
          <div class="logo">🏆 ALL4YOU AUCTIONEERS</div>
          <span class="auction-badge">WINNER!</span>
        </div>
        
        <h2 style="color: #059669; text-align: center;">🎉 Congratulations! You Won!</h2>
        
        <div class="success-box">
          <strong>You are the winning bidder for "${lotTitle}"!</strong>
        </div>
        
        <div class="bid-amount">
          Winning Bid: R${winningBid.toLocaleString()}
        </div>
        
        <div class="lot-details">
          <h3 style="margin-top: 0; color: #374151;">Winning Details:</h3>
          <p><strong>Auction:</strong> ${auctionTitle}</p>
          <p><strong>Lot:</strong> ${lotTitle}</p>
          <p><strong>Your Winning Bid:</strong> R${winningBid.toLocaleString()}</p>
          ${invoiceNumber ? `<p><strong>Invoice Number:</strong> ${invoiceNumber}</p>` : ''}
          <p><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">WON</span></p>
        </div>
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL}/auctions/${auctionId}/invoice/${lotId}" class="action-button">
            📄 Download Invoice
          </a>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #f0fdf4; border-radius: 8px; border-left: 4px solid #22c55e;">
          <h4 style="margin-top: 0; color: #166534;">Next Steps:</h4>
          <ol style="margin: 0; color: #166534;">
            <li>Download your invoice using the button above</li>
            <li>Complete payment according to our terms</li>
            <li>Arrange collection or delivery</li>
            <li>Contact us if you have any questions</li>
          </ol>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #fefce8; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: #a16207;">
            <strong>Payment Information:</strong> Please complete payment within 7 days of auction end. 
            Banking details and payment instructions are included in your invoice.
          </p>
        </div>
        
        <div class="footer">
          <p>Thank you for participating!<br><strong>The ALL4YOU AUCTIONEERS Team</strong></p>
          <p style="font-size: 12px;">
            Questions? Contact us at admin@all4youauctions.co.za
          </p>
        </div>
      </div>
    </div>
  `;

  const text = `
🎉 CONGRATULATIONS! YOU WON - ${lotTitle}

You are the winning bidder for "${lotTitle}" in the "${auctionTitle}" auction!

Winning bid: R${winningBid.toLocaleString()}
${invoiceNumber ? `Invoice number: ${invoiceNumber}` : ''}

Next steps:
1. Download your invoice: ${process.env.FRONTEND_URL}/auctions/${auctionId}/invoice/${lotId}
2. Complete payment within 7 days
3. Arrange collection or delivery
4. Contact us with any questions

Payment information and banking details are included in your invoice.

Thank you for participating in our auction!

- ALL4YOU AUCTIONEERS Team
Questions? Contact: admin@all4youauctions.co.za
  `;

  return await sendMail({ to: winnerEmail, subject, text, html });
}

// 5. AUCTION STARTED EMAIL
async function sendAuctionStartedNotification({
  userEmail,
  auctionTitle,
  auctionId,
  startTime,
  endTime,
  totalLots
}) {
  const subject = `🚀 Auction Started: "${auctionTitle}" - ${totalLots} lots available!`;
  
  const html = `
    ${emailStyles}
    <div class="email-container">
      <div class="email-content">
        <div class="header">
          <div class="logo">🏆 ALL4YOU AUCTIONEERS</div>
          <span class="auction-badge">NOW LIVE</span>
        </div>
        
        <h2 style="color: #059669; text-align: center;">🚀 Auction is Now Live!</h2>
        
        <div style="text-align: center; margin: 20px 0;">
          <h3 style="color: #374151; margin: 0;">${auctionTitle}</h3>
          <p style="font-size: 18px; color: #6b7280; margin: 10px 0;">
            ${totalLots} lots available for bidding
          </p>
        </div>
        
        <div class="lot-details">
          <h3 style="margin-top: 0; color: #374151;">Auction Information:</h3>
          <p><strong>Started:</strong> ${new Date(startTime).toLocaleString()}</p>
          <p><strong>Ends:</strong> ${new Date(endTime).toLocaleString()}</p>
          <p><strong>Total Lots:</strong> ${totalLots}</p>
          <p><strong>Status:</strong> <span style="color: #059669; font-weight: bold;">LIVE BIDDING</span></p>
        </div>
        
        <div style="text-align: center;">
          <a href="${process.env.FRONTEND_URL}/auctions/${auctionId}" class="action-button">
            🔥 Start Bidding Now
          </a>
        </div>
        
        <div style="margin-top: 20px; padding: 15px; background: #dbeafe; border-radius: 8px;">
          <p style="margin: 0; font-size: 14px; color: #1e40af;">
            <strong>💡 Bidding Tips:</strong> Browse all lots, set up auto-bids for items you want, 
            and watch the live auction feed for real-time updates. Good luck!
          </p>
        </div>
        
        <div class="footer">
          <p>Happy bidding!<br><strong>The ALL4YOU AUCTIONEERS Team</strong></p>
        </div>
      </div>
    </div>
  `;

  const text = `
🚀 AUCTION STARTED - ${auctionTitle}

The auction is now live with ${totalLots} lots available for bidding!

Started: ${new Date(startTime).toLocaleString()}
Ends: ${new Date(endTime).toLocaleString()}

Start bidding: ${process.env.FRONTEND_URL}/auctions/${auctionId}

Browse lots, set up auto-bids, and watch the live auction feed for real-time updates.

Good luck!

- ALL4YOU AUCTIONEERS Team
  `;

  return await sendMail({ to: userEmail, subject, text, html });
}

module.exports = {
  sendOutbidNotification,
  sendBidConfirmation,
  sendAuctionEndingSoon,
  sendAuctionWonNotification,
  sendAuctionStartedNotification,
  emailStyles
};
