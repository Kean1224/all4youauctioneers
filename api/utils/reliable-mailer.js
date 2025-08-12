const nodemailer = require('nodemailer');

// Import email service classes
let GmailOAuth2Service, SendGridService;
try {
  GmailOAuth2Service = require('./gmail-oauth');
  SendGridService = require('./sendgrid-service');
} catch (e) {
  console.log('⚠️ Advanced email services not available, using basic SMTP');
}

console.log('🔧 Configuring Multi-Service Email System...');
console.log('SMTP Host:', process.env.SMTP_HOST);
console.log('SMTP Port:', process.env.SMTP_PORT);
console.log('SMTP User:', process.env.SMTP_USER);
console.log('SMTP From:', process.env.SMTP_FROM);
console.log('SMTP Password Set:', !!process.env.SMTP_PASS);
console.log('Gmail OAuth2 Available:', !!(process.env.GMAIL_CLIENT_ID && process.env.GMAIL_REFRESH_TOKEN));
console.log('SendGrid Available:', !!process.env.SENDGRID_API_KEY);

// Initialize email services
let gmailOAuth2, sendGridService;
if (GmailOAuth2Service) gmailOAuth2 = new GmailOAuth2Service();
if (SendGridService) sendGridService = new SendGridService();

// Configure fallback SMTP transport (Gmail with app password)
const transporter = nodemailer.createTransporter({
  host: process.env.SMTP_HOST || 'smtp.gmail.com',
  port: parseInt(process.env.SMTP_PORT) || 587,
  secure: false,
  auth: {
    user: process.env.SMTP_USER,
    pass: process.env.SMTP_PASS,
  },
  tls: {
    rejectUnauthorized: false
  },
  connectionTimeout: 60000,
  greetingTimeout: 30000,
  socketTimeout: 60000,
  debug: process.env.EMAIL_DEBUG === 'true',
  logger: process.env.EMAIL_DEBUG === 'true'
});

// Email service priority order
const EMAIL_SERVICES = {
  SENDGRID: 'sendgrid',
  GMAIL_OAUTH2: 'gmail_oauth2',
  SMTP_FALLBACK: 'smtp_fallback'
};

class ReliableMailer {
  constructor() {
    this.services = this.initializeServices();
    this.lastWorkingService = null;
  }

  initializeServices() {
    const services = [];
    
    // Priority 1: SendGrid (most reliable)
    if (process.env.SENDGRID_API_KEY && sendGridService) {
      services.push({
        name: EMAIL_SERVICES.SENDGRID,
        service: sendGridService,
        priority: 1
      });
    }
    
    // Priority 2: Gmail OAuth2 (never expires)
    if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_REFRESH_TOKEN && gmailOAuth2) {
      services.push({
        name: EMAIL_SERVICES.GMAIL_OAUTH2,
        service: gmailOAuth2,
        priority: 2
      });
    }
    
    // Priority 3: SMTP with app password (fallback)
    if (process.env.SMTP_PASS) {
      services.push({
        name: EMAIL_SERVICES.SMTP_FALLBACK,
        service: { sendMail: this.sendSMTPMail.bind(this), testConnection: this.testSMTPConnection.bind(this) },
        priority: 3
      });
    }
    
    // Sort by priority
    return services.sort((a, b) => a.priority - b.priority);
  }

  async sendSMTPMail({ to, subject, text, html, attachments }) {
    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'admin@all4youauctions.co.za',
      to,
      subject,
      text,
      html,
      attachments,
    });
    return result;
  }

  async testSMTPConnection() {
    try {
      await transporter.verify();
      return true;
    } catch (error) {
      return false;
    }
  }

  async sendMail({ to, subject, text, html, attachments }) {
    const errors = [];
    
    // Start with the last working service if available
    if (this.lastWorkingService) {
      const service = this.services.find(s => s.name === this.lastWorkingService);
      if (service) {
        try {
          console.log(`📧 Attempting email with last working service: ${service.name}`);
          const result = await service.service.sendMail({ to, subject, text, html, attachments });
          console.log(`✅ Email sent successfully with ${service.name}`);
          return result;
        } catch (error) {
          console.log(`❌ Last working service ${service.name} failed: ${error.message}`);
          errors.push({ service: service.name, error: error.message });
          this.lastWorkingService = null; // Reset if it fails
        }
      }
    }

    // Try all services in priority order
    for (const serviceConfig of this.services) {
      if (serviceConfig.name === this.lastWorkingService) continue; // Already tried above
      
      try {
        console.log(`📧 Attempting email with ${serviceConfig.name}...`);
        
        // Test connection first for reliability
        const connectionOk = await serviceConfig.service.testConnection();
        if (!connectionOk) {
          console.log(`⚠️ ${serviceConfig.name} connection test failed, skipping...`);
          errors.push({ service: serviceConfig.name, error: 'Connection test failed' });
          continue;
        }

        const result = await serviceConfig.service.sendMail({ to, subject, text, html, attachments });
        console.log(`✅ Email sent successfully with ${serviceConfig.name}`);
        
        // Remember this working service
        this.lastWorkingService = serviceConfig.name;
        return result;
        
      } catch (error) {
        console.log(`❌ ${serviceConfig.name} failed: ${error.message}`);
        errors.push({ service: serviceConfig.name, error: error.message });
        continue;
      }
    }

    // All services failed
    console.error('❌ All email services failed!');
    errors.forEach((err, index) => {
      console.error(`${index + 1}. ${err.service}: ${err.error}`);
    });
    
    throw new Error(`All email services failed. Errors: ${JSON.stringify(errors)}`);
  }

  async testConnection() {
    const results = {};
    
    for (const serviceConfig of this.services) {
      try {
        results[serviceConfig.name] = await serviceConfig.service.testConnection();
      } catch (error) {
        results[serviceConfig.name] = false;
      }
    }
    
    console.log('📊 Email service test results:', results);
    return results;
  }

  getServiceStatus() {
    return {
      services: this.services.map(s => ({
        name: s.name,
        priority: s.priority,
        configured: true
      })),
      lastWorkingService: this.lastWorkingService,
      totalServices: this.services.length
    };
  }
}

// Create singleton instance
const reliableMailer = new ReliableMailer();

// Export functions to match existing API
async function sendMail(emailData) {
  return await reliableMailer.sendMail(emailData);
}

async function sendEmail(to, subject, text, html, attachments) {
  return await reliableMailer.sendMail({ to, subject, text, html, attachments });
}

async function testConnection() {
  return await reliableMailer.testConnection();
}

function getServiceStatus() {
  return reliableMailer.getServiceStatus();
}

module.exports = { 
  sendMail, 
  sendEmail, 
  testConnection, 
  getServiceStatus,
  ReliableMailer 
};