const express = require('express');
const { testConnection, sendMail } = require('../utils/mailer');
const router = express.Router();

// Test SMTP connection and send test email
router.post('/test-email', async (req, res) => {
  try {
    console.log('🧪 Testing email configuration...');
    
    // Log environment variables (without password)
    console.log('Environment Check:');
    console.log('- SMTP_HOST:', process.env.SMTP_HOST);
    console.log('- SMTP_PORT:', process.env.SMTP_PORT);
    console.log('- SMTP_USER:', process.env.SMTP_USER);
    console.log('- SMTP_FROM:', process.env.SMTP_FROM);
    console.log('- SMTP_PASS set:', !!process.env.SMTP_PASS);
    console.log('- SMTP_PASS length:', process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0);
    
    // Test connection
    console.log('🔍 Testing SMTP connection...');
    const connectionOk = await testConnection();
    
    if (!connectionOk) {
      return res.status(500).json({ 
        error: 'SMTP connection failed', 
        details: 'Check credentials and environment variables'
      });
    }

    // Send test email
    console.log('📧 Sending test email...');
    const result = await sendMail({
      to: 'admin@all4youauctions.co.za',
      subject: 'Email Configuration Test',
      text: 'This is a test email to verify SMTP configuration.',
      html: `
        <div style="font-family: Arial, sans-serif; max-width: 600px; margin: 0 auto;">
          <h2 style="color: #059669;">✅ Email Test Successful</h2>
          <p>Your SMTP configuration is working correctly!</p>
          <div style="background: #f0fdf4; padding: 15px; border-radius: 8px; margin: 15px 0;">
            <h3>Configuration Details:</h3>
            <p><strong>Host:</strong> ${process.env.SMTP_HOST || 'smtp.gmail.com'}</p>
            <p><strong>Port:</strong> ${process.env.SMTP_PORT || '587'}</p>
            <p><strong>User:</strong> ${process.env.SMTP_USER}</p>
            <p><strong>From:</strong> ${process.env.SMTP_FROM}</p>
            <p><strong>Test Time:</strong> ${new Date().toISOString()}</p>
          </div>
          <p>Contact form and sell item notifications should now work correctly.</p>
          <p>Best regards,<br><strong>System Test</strong></p>
        </div>
      `
    });

    res.json({ 
      success: true, 
      message: 'Email test successful',
      messageId: result.messageId,
      config: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || '587',
        user: process.env.SMTP_USER,
        from: process.env.SMTP_FROM,
        passwordSet: !!process.env.SMTP_PASS,
        passwordLength: process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0
      }
    });

  } catch (error) {
    console.error('❌ Email test failed:', error);
    
    res.status(500).json({ 
      error: 'Email test failed', 
      details: error.message,
      code: error.code,
      config: {
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: process.env.SMTP_PORT || '587',
        user: process.env.SMTP_USER,
        passwordSet: !!process.env.SMTP_PASS,
        passwordLength: process.env.SMTP_PASS ? process.env.SMTP_PASS.length : 0
      }
    });
  }
});

module.exports = router;