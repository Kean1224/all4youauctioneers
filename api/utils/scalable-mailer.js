const nodemailer = require('nodemailer');

// Import email service classes
let GmailOAuth2Service, SendGridService;
try {
  GmailOAuth2Service = require('./gmail-oauth');
  SendGridService = require('./sendgrid-service');
} catch (e) {
  console.log('⚠️ Advanced email services not available, using basic SMTP');
}

console.log('🔧 Configuring Scalable Email System for 1000+ clients...');

class ScalableMailer {
  constructor() {
    this.services = this.initializeServices();
    this.lastWorkingService = null;
    this.emailStats = {
      sent: 0,
      failed: 0,
      dailyCount: 0,
      lastResetDate: new Date().toDateString()
    };
    this.rateLimits = {
      sendgrid: { daily: 50000, current: 0 },
      gmail_oauth2: { daily: 2000, current: 0 },
      smtp_fallback: { daily: 500, current: 0 }
    };
  }

  initializeServices() {
    const services = [];
    
    // Priority 1: SendGrid (best for scale)
    if (process.env.SENDGRID_API_KEY && SendGridService) {
      services.push({
        name: 'sendgrid',
        service: new SendGridService(),
        priority: 1,
        maxDaily: 50000, // Essentials plan
        costEffective: true,
        bulkCapable: true
      });
    }
    
    // Priority 2: Gmail OAuth2 (good for moderate volume)
    if (process.env.GMAIL_CLIENT_ID && process.env.GMAIL_REFRESH_TOKEN && GmailOAuth2Service) {
      services.push({
        name: 'gmail_oauth2',
        service: new GmailOAuth2Service(),
        priority: 2,
        maxDaily: 2000,
        costEffective: true,
        bulkCapable: false
      });
    }
    
    // Priority 3: SMTP fallback (emergency only)
    if (process.env.SMTP_PASS) {
      services.push({
        name: 'smtp_fallback',
        service: { 
          sendMail: this.sendSMTPMail.bind(this), 
          testConnection: this.testSMTPConnection.bind(this) 
        },
        priority: 3,
        maxDaily: 500,
        costEffective: false,
        bulkCapable: false
      });
    }
    
    return services.sort((a, b) => a.priority - b.priority);
  }

  resetDailyCounters() {
    const today = new Date().toDateString();
    if (this.emailStats.lastResetDate !== today) {
      this.emailStats.dailyCount = 0;
      this.emailStats.lastResetDate = today;
      
      // Reset service counters
      Object.keys(this.rateLimits).forEach(service => {
        this.rateLimits[service].current = 0;
      });
      
      console.log('📊 Daily email counters reset');
    }
  }

  async sendSMTPMail({ to, subject, text, html, attachments }) {
    const transporter = nodemailer.createTransporter({
      host: process.env.SMTP_HOST || 'smtp.gmail.com',
      port: parseInt(process.env.SMTP_PORT) || 587,
      secure: false,
      auth: {
        user: process.env.SMTP_USER,
        pass: process.env.SMTP_PASS,
      },
      tls: { rejectUnauthorized: false }
    });

    const result = await transporter.sendMail({
      from: process.env.SMTP_FROM || 'admin@all4youauctions.co.za',
      to, subject, text, html, attachments,
    });
    return result;
  }

  async testSMTPConnection() {
    try {
      const transporter = nodemailer.createTransporter({
        host: process.env.SMTP_HOST || 'smtp.gmail.com',
        port: parseInt(process.env.SMTP_PORT) || 587,
        secure: false,
        auth: { user: process.env.SMTP_USER, pass: process.env.SMTP_PASS },
        tls: { rejectUnauthorized: false }
      });
      await transporter.verify();
      return true;
    } catch (error) {
      return false;
    }
  }

  selectBestService(emailType = 'transactional') {
    this.resetDailyCounters();
    
    // For bulk emails (auction announcements), prefer SendGrid
    if (emailType === 'bulk') {
      const sendGridService = this.services.find(s => s.name === 'sendgrid' && s.bulkCapable);
      if (sendGridService && this.rateLimits.sendgrid.current < this.rateLimits.sendgrid.daily) {
        return sendGridService;
      }
    }
    
    // For transactional emails, use best available service
    for (const service of this.services) {
      const serviceName = service.name;
      const rateLimit = this.rateLimits[serviceName];
      
      if (rateLimit && rateLimit.current < rateLimit.daily) {
        return service;
      }
    }
    
    // All services at limit
    throw new Error('All email services have reached daily limits');
  }

  async sendMail({ to, subject, text, html, attachments, emailType = 'transactional' }) {
    try {
      // Select best service based on email type and limits
      const selectedService = this.selectBestService(emailType);
      
      console.log(`📧 Sending ${emailType} email via ${selectedService.name}...`);
      
      // Send email
      const result = await selectedService.service.sendMail({ to, subject, text, html, attachments });
      
      // Update counters
      this.emailStats.sent++;
      this.emailStats.dailyCount++;
      this.rateLimits[selectedService.name].current++;
      this.lastWorkingService = selectedService.name;
      
      console.log(`✅ Email sent successfully via ${selectedService.name}`);
      console.log(`📊 Daily count: ${this.emailStats.dailyCount}, Service usage: ${this.rateLimits[selectedService.name].current}/${this.rateLimits[selectedService.name].daily}`);
      
      return {
        ...result,
        serviceUsed: selectedService.name,
        dailyCount: this.emailStats.dailyCount
      };
      
    } catch (error) {
      this.emailStats.failed++;
      console.error('❌ Email sending failed:', error.message);
      throw error;
    }
  }

  // Bulk email method for auction announcements
  async sendBulkEmails(emails) {
    console.log(`📬 Starting bulk email send for ${emails.length} recipients...`);
    
    const results = {
      successful: 0,
      failed: 0,
      errors: []
    };
    
    // Send in batches to avoid overwhelming services
    const batchSize = 10;
    for (let i = 0; i < emails.length; i += batchSize) {
      const batch = emails.slice(i, i + batchSize);
      
      const batchPromises = batch.map(async (emailData, index) => {
        try {
          await this.sendMail({ ...emailData, emailType: 'bulk' });
          results.successful++;
        } catch (error) {
          results.failed++;
          results.errors.push({
            recipient: emailData.to,
            error: error.message
          });
        }
      });
      
      await Promise.all(batchPromises);
      
      // Small delay between batches to be respectful
      if (i + batchSize < emails.length) {
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
    
    console.log(`📊 Bulk email complete: ${results.successful} sent, ${results.failed} failed`);
    return results;
  }

  getStats() {
    this.resetDailyCounters();
    
    return {
      totalSent: this.emailStats.sent,
      totalFailed: this.emailStats.failed,
      dailyCount: this.emailStats.dailyCount,
      lastWorkingService: this.lastWorkingService,
      rateLimits: this.rateLimits,
      services: this.services.map(s => ({
        name: s.name,
        priority: s.priority,
        maxDaily: s.maxDaily,
        currentUsage: this.rateLimits[s.name]?.current || 0,
        bulkCapable: s.bulkCapable,
        costEffective: s.costEffective
      })),
      recommendations: this.getRecommendations()
    };
  }

  getRecommendations() {
    const recommendations = [];
    
    if (!this.services.find(s => s.name === 'sendgrid')) {
      recommendations.push({
        type: 'setup',
        message: 'Configure SendGrid for reliable high-volume email delivery',
        priority: 'high'
      });
    }
    
    if (this.emailStats.dailyCount > 100 && !this.services.find(s => s.bulkCapable)) {
      recommendations.push({
        type: 'upgrade',
        message: 'Consider upgrading to SendGrid Essentials plan for better bulk email support',
        priority: 'medium'
      });
    }
    
    if (this.emailStats.failed / (this.emailStats.sent + this.emailStats.failed) > 0.1) {
      recommendations.push({
        type: 'reliability',
        message: 'High failure rate detected. Check email service configurations.',
        priority: 'high'
      });
    }
    
    return recommendations;
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
    
    return results;
  }
}

// Create singleton instance
const scalableMailer = new ScalableMailer();

// Export functions
async function sendMail(emailData) {
  return await scalableMailer.sendMail(emailData);
}

async function sendBulkEmails(emails) {
  return await scalableMailer.sendBulkEmails(emails);
}

async function sendEmail(to, subject, text, html, attachments) {
  return await scalableMailer.sendMail({ to, subject, text, html, attachments });
}

async function testConnection() {
  return await scalableMailer.testConnection();
}

function getEmailStats() {
  return scalableMailer.getStats();
}

module.exports = { 
  sendMail, 
  sendBulkEmails,
  sendEmail, 
  testConnection, 
  getEmailStats,
  ScalableMailer 
};