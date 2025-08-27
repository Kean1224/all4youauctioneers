const nodemailer = require('nodemailer');

/**
 * Enhanced Email Service with Retry Logic and Fallback
 * Addresses recurring email delivery failures
 */
class EnhancedEmailService {
  constructor() {
    this.maxRetries = 3;
    this.retryDelay = 2000; // 2 seconds
    this.transporter = null;
    this.failureCount = 0;
    this.lastFailure = null;
    
    this.initializeTransporter();
  }

  /**
   * Initialize the email transporter with enhanced configuration
   */
  initializeTransporter() {
    try {
      this.transporter = nodemailer.createTransporter({
        service: 'gmail',
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false, // true for 465, false for other ports
        auth: {
          user: process.env.SMTP_USER,
          pass: process.env.SMTP_PASS
        },
        pool: true, // Use connection pooling
        maxConnections: 5, // Max simultaneous connections
        maxMessages: 100, // Max messages per connection
        rateLimit: 14, // Max messages per second
        tls: {
          rejectUnauthorized: false, // Allow self-signed certificates
          ciphers: 'SSLv3'
        },
        debug: process.env.EMAIL_DEBUG === 'true',
        logger: process.env.EMAIL_DEBUG === 'true'
      });

      console.log('📧 Enhanced email service initialized');
      
      // Verify connection on startup
      this.verifyConnection();
      
    } catch (error) {
      console.error('❌ Email service initialization failed:', error);
      this.transporter = null;
    }
  }

  /**
   * Verify email service connection
   */
  async verifyConnection() {
    if (!this.transporter) {
      console.warn('⚠️  Email transporter not initialized');
      return false;
    }

    try {
      await this.transporter.verify();
      console.log('✅ Email service connection verified');
      return true;
    } catch (error) {
      console.error('❌ Email service verification failed:', error.message);
      return false;
    }
  }

  /**
   * Send email with retry logic and comprehensive error handling
   */
  async sendEmail(mailOptions, retryCount = 0) {
    if (!this.transporter) {
      console.error('❌ Email transporter not available');
      return { success: false, error: 'Email service unavailable' };
    }

    try {
      console.log(`📤 Sending email to: ${mailOptions.to} (attempt ${retryCount + 1})`);
      
      // Add default sender if not specified
      if (!mailOptions.from) {
        mailOptions.from = process.env.SMTP_FROM || process.env.SMTP_USER;
      }

      // Send the email
      const info = await this.transporter.sendMail(mailOptions);
      
      // Reset failure count on success
      this.failureCount = 0;
      this.lastFailure = null;
      
      console.log(`✅ Email sent successfully: ${info.messageId}`);
      return { 
        success: true, 
        messageId: info.messageId,
        response: info.response 
      };
      
    } catch (error) {
      console.error(`❌ Email sending failed (attempt ${retryCount + 1}):`, error.message);
      
      this.failureCount++;
      this.lastFailure = new Date();
      
      // Check if we should retry
      if (retryCount < this.maxRetries) {
        console.log(`🔄 Retrying email in ${this.retryDelay}ms...`);
        
        // Wait before retry
        await new Promise(resolve => setTimeout(resolve, this.retryDelay));
        
        // Exponential backoff - increase delay for next retry
        this.retryDelay *= 1.5;
        
        // Retry the send
        return await this.sendEmail(mailOptions, retryCount + 1);
      }
      
      // All retries exhausted
      console.error(`❌ Email delivery failed after ${this.maxRetries + 1} attempts`);
      return { 
        success: false, 
        error: error.message,
        attempts: retryCount + 1
      };
    }
  }

  /**
   * Send verification email with enhanced template
   */
  async sendVerificationEmail(userEmail, verificationCode) {
    const mailOptions = {
      to: userEmail,
      subject: 'Verify Your Email - All4You Auctions',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">All4You Auctions</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px;">
            <h2 style="color: #333; text-align: center;">Verify Your Email Address</h2>
            
            <p style="color: #666; line-height: 1.6;">
              Welcome to All4You Auctions! To complete your registration and start bidding, 
              please verify your email address by clicking the button below.
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/verify-email?code=${verificationCode}&email=${encodeURIComponent(userEmail)}" 
                 style="background: #39FF14; color: #000; padding: 15px 30px; text-decoration: none; 
                        border-radius: 5px; font-weight: bold; display: inline-block;">
                Verify Email Address
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              If the button doesn't work, copy and paste this link into your browser:<br>
              <a href="${process.env.FRONTEND_URL}/verify-email?code=${verificationCode}&email=${encodeURIComponent(userEmail)}">
                ${process.env.FRONTEND_URL}/verify-email?code=${verificationCode}&email=${encodeURIComponent(userEmail)}
              </a>
            </p>
            
            <p style="color: #666; font-size: 14px;">
              This verification link expires in 24 hours for security reasons.
            </p>
          </div>
          
          <div style="background: #333; color: #999; padding: 20px; text-align: center; font-size: 14px;">
            <p>© 2025 All4You Auctions. All rights reserved.</p>
            <p>South Africa's Premier Auction Platform</p>
          </div>
        </div>
      `,
      text: `
        Welcome to All4You Auctions!
        
        To complete your registration, please verify your email address by visiting:
        ${process.env.FRONTEND_URL}/verify-email?code=${verificationCode}&email=${encodeURIComponent(userEmail)}
        
        This verification link expires in 24 hours.
        
        © 2025 All4You Auctions
      `
    };

    return await this.sendEmail(mailOptions);
  }

  /**
   * Send welcome email after verification
   */
  async sendWelcomeEmail(userEmail, userName) {
    const mailOptions = {
      to: userEmail,
      subject: 'Welcome to All4You Auctions!',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">All4You Auctions</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px;">
            <h2 style="color: #333;">Welcome, ${userName}!</h2>
            
            <p style="color: #666; line-height: 1.6;">
              🎉 Your email has been verified successfully! You're now ready to explore 
              South Africa's premier auction platform.
            </p>
            
            <h3 style="color: #333;">What you can do now:</h3>
            <ul style="color: #666; line-height: 1.8;">
              <li>✅ Browse live and upcoming auctions</li>
              <li>✅ Place bids on items you love</li>
              <li>✅ List your own items for auction</li>
              <li>✅ Track your bidding history</li>
            </ul>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/auctions" 
                 style="background: #39FF14; color: #000; padding: 15px 30px; text-decoration: none; 
                        border-radius: 5px; font-weight: bold; display: inline-block;">
                Start Exploring Auctions
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              Need help? Contact our support team at admin@all4youauctions.co.za
            </p>
          </div>
          
          <div style="background: #333; color: #999; padding: 20px; text-align: center; font-size: 14px;">
            <p>© 2025 All4You Auctions. All rights reserved.</p>
          </div>
        </div>
      `
    };

    return await this.sendEmail(mailOptions);
  }

  /**
   * Send password reset email
   */
  async sendPasswordResetEmail(userEmail, resetToken) {
    const mailOptions = {
      to: userEmail,
      subject: 'Reset Your Password - All4You Auctions',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; text-align: center;">
            <h1 style="color: white; margin: 0;">All4You Auctions</h1>
          </div>
          
          <div style="background: #f8f9fa; padding: 30px;">
            <h2 style="color: #333;">Reset Your Password</h2>
            
            <p style="color: #666; line-height: 1.6;">
              We received a request to reset your password. Click the button below to create a new password:
            </p>
            
            <div style="text-align: center; margin: 30px 0;">
              <a href="${process.env.FRONTEND_URL}/reset-password?token=${resetToken}" 
                 style="background: #39FF14; color: #000; padding: 15px 30px; text-decoration: none; 
                        border-radius: 5px; font-weight: bold; display: inline-block;">
                Reset Password
              </a>
            </div>
            
            <p style="color: #666; font-size: 14px;">
              This reset link expires in 1 hour for security reasons. If you didn't request this reset, 
              please ignore this email.
            </p>
          </div>
          
          <div style="background: #333; color: #999; padding: 20px; text-align: center; font-size: 14px;">
            <p>© 2025 All4You Auctions. All rights reserved.</p>
          </div>
        </div>
      `
    };

    return await this.sendEmail(mailOptions);
  }

  /**
   * Get email service statistics
   */
  getStats() {
    return {
      isConnected: this.transporter !== null,
      failureCount: this.failureCount,
      lastFailure: this.lastFailure,
      maxRetries: this.maxRetries,
      currentDelay: this.retryDelay
    };
  }
}

// Export singleton instance
module.exports = new EnhancedEmailService();