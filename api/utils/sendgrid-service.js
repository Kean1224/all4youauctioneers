const sgMail = require('@sendgrid/mail');

class SendGridService {
  constructor() {
    if (process.env.SENDGRID_API_KEY) {
      sgMail.setApiKey(process.env.SENDGRID_API_KEY);
      this.enabled = true;
    } else {
      console.log('⚠️ SendGrid API key not found - service disabled');
      this.enabled = false;
    }
  }

  async sendMail({ to, subject, text, html, attachments }) {
    if (!this.enabled) {
      throw new Error('SendGrid service not configured');
    }

    try {
      const msg = {
        to,
        from: {
          email: process.env.SENDGRID_FROM_EMAIL || 'admin@all4youauctions.co.za',
          name: process.env.SENDGRID_FROM_NAME || 'All4You Auctions'
        },
        subject,
        text,
        html,
      };

      // Add attachments if provided
      if (attachments && attachments.length > 0) {
        msg.attachments = attachments.map(att => ({
          content: att.content,
          filename: att.filename,
          type: att.type || 'application/octet-stream',
          disposition: 'attachment'
        }));
      }

      const result = await sgMail.send(msg);
      console.log('✅ SendGrid email sent successfully');
      return { messageId: result[0].headers['x-message-id'] };
    } catch (error) {
      console.error('❌ SendGrid email failed:', error);
      if (error.response) {
        console.error('SendGrid error details:', error.response.body);
      }
      throw error;
    }
  }

  async testConnection() {
    if (!this.enabled) {
      return false;
    }

    try {
      // SendGrid doesn't have a direct test method, so we'll validate API key format
      const apiKey = process.env.SENDGRID_API_KEY;
      if (apiKey && apiKey.startsWith('SG.') && apiKey.length > 50) {
        console.log('✅ SendGrid API key format is valid');
        return true;
      } else {
        console.log('❌ Invalid SendGrid API key format');
        return false;
      }
    } catch (error) {
      console.error('❌ SendGrid connection test failed:', error);
      return false;
    }
  }
}

module.exports = SendGridService;