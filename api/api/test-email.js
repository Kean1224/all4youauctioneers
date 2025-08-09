const express = require('express');
const router = express.Router();
const { sendEmail } = require('../utils/mailer');

// Test email endpoint
router.post('/send-test', async (req, res) => {
  try {
    const { to, subject, text } = req.body;
    
    // Default values for testing
    const testEmail = to || 'test@example.com';
    const testSubject = subject || 'Email System Test';
    const testText = text || 'This is a test email to verify the email system is working correctly.';
    
    console.log('Attempting to send test email to:', testEmail);
    
    await sendEmail(testEmail, testSubject, testText);
    
    res.json({ 
      success: true, 
      message: 'Test email sent successfully!',
      details: {
        to: testEmail,
        subject: testSubject
      }
    });
  } catch (error) {
    console.error('Test email failed:', error);
    res.status(500).json({ 
      success: false, 
      message: 'Failed to send test email',
      error: error.message,
      details: {
        code: error.code,
        command: error.command
      }
    });
  }
});

// Get email configuration status
router.get('/status', (req, res) => {
  const config = {
    host: process.env.SMTP_HOST,
    port: process.env.SMTP_PORT,
    user: process.env.SMTP_USER,
    hasPassword: !!process.env.SMTP_PASS && process.env.SMTP_PASS !== 'your_16_character_app_password_here',
    from: process.env.SMTP_FROM
  };
  
  res.json({
    configured: config.hasPassword && config.host && config.user,
    settings: {
      ...config,
      password: config.hasPassword ? '***configured***' : 'NOT SET'
    }
  });
});

module.exports = router;
