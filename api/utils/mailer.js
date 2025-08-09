const nodemailer = require('nodemailer');

console.log('🔧 Configuring Email Transporter...');
console.log('SMTP Host:', process.env.SMTP_HOST);
console.log('SMTP Port:', process.env.SMTP_PORT);
console.log('SMTP User:', process.env.SMTP_USER);
console.log('SMTP From:', process.env.SMTP_FROM);
console.log('SMTP Password Set:', !!process.env.SMTP_PASS);

// Configure your SMTP transport with enhanced Google Workspace settings
const transporter = nodemailer.createTransport({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false, // true for 465, false for other ports
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 60000, // 60 seconds
  greetingTimeout: 30000,   // 30 seconds
  socketTimeout: 60000,     // 60 seconds
  debug: process.env.EMAIL_DEBUG === 'true',
  logger: process.env.EMAIL_DEBUG === 'true'
});

// Test the connection on startup
async function testConnection() {
  try {
    await transporter.verify();
    console.log('✅ SMTP connection verified successfully');
    return true;
  } catch (error) {
    console.error('❌ SMTP connection failed:', error.message);
    console.error('⚠️  Email notifications will be disabled');
    return false;
  }
}

async function sendMail({ to, subject, text, html, attachments }) {
  try {
    // Test connection first
    const connectionOk = await testConnection();
    if (!connectionOk) {
      console.log(`📧 Mock email (SMTP failed) to: ${to}, Subject: ${subject}`);
      return { messageId: 'mock-email-id' };
    }

    console.log(`📧 Attempting to send email to: ${to}`);
    console.log(`📧 Subject: ${subject}`);
    
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'admin@all4youauctions.co.za',
      to,
      subject,
      text,
      html,
      attachments,
    });
    
    console.log('✅ Email sent successfully:', result.messageId);
    return result;
  } catch (error) {
    console.error('❌ Email sending failed:', error.message);
    console.error('Error code:', error.code);
    console.error('Error command:', error.command);
    throw error;
  }
}

// Alternative function name for consistency
async function sendEmail(to, subject, text, html, attachments) {
  return sendMail({ to, subject, text, html, attachments });
}

// Email service ready - no startup test
module.exports = { sendMail, sendEmail, testConnection };
