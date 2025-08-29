// Test email configuration with production settings
const nodemailer = require('nodemailer');

const testEmailConfig = async () => {
  try {
    console.log('🧪 Testing production email configuration...');
    
    const transporter = nodemailer.createTransport({
      service: 'gmail',
      host: 'smtp.gmail.com',
      port: 587,
      secure: false,
      auth: {
        user: 'admin@all4youauctions.co.za',
        pass: 'inqvaadzvmcwltjz' // Your Gmail App Password
      }
    });

    // Verify connection
    const verified = await transporter.verify();
    console.log('✅ SMTP Connection verified:', verified);
    
    // Test send (commented out to avoid spam)
    console.log('📧 Email configuration is READY for production');
    console.log('✅ Production email system: OPERATIONAL');
    
  } catch (error) {
    console.error('❌ Email configuration error:', error.message);
  }
};

testEmailConfig();