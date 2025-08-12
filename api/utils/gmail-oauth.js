const nodemailer = require('nodemailer');
const { google } = require('googleapis');

// OAuth2 configuration for Gmail
const OAuth2 = google.auth.OAuth2;

class GmailOAuth2Service {
  constructor() {
    this.oauth2Client = new OAuth2(
      process.env.GMAIL_CLIENT_ID,
      process.env.GMAIL_CLIENT_SECRET,
      'https://developers.google.com/oauthplayground' // Redirect URL
    );

    this.oauth2Client.setCredentials({
      refresh_token: process.env.GMAIL_REFRESH_TOKEN
    });
  }

  async getAccessToken() {
    try {
      const { token } = await this.oauth2Client.getAccessToken();
      return token;
    } catch (error) {
      console.error('Failed to get OAuth2 access token:', error);
      throw error;
    }
  }

  async createTransporter() {
    try {
      const accessToken = await this.getAccessToken();
      
      return nodemailer.createTransporter({
        service: 'gmail',
        auth: {
          type: 'OAuth2',
          user: process.env.SMTP_USER || 'admin@all4youauctions.co.za',
          clientId: process.env.GMAIL_CLIENT_ID,
          clientSecret: process.env.GMAIL_CLIENT_SECRET,
          refreshToken: process.env.GMAIL_REFRESH_TOKEN,
          accessToken: accessToken,
        },
      });
    } catch (error) {
      console.error('Failed to create OAuth2 transporter:', error);
      throw error;
    }
  }

  async sendMail({ to, subject, text, html, attachments }) {
    try {
      const transporter = await this.createTransporter();
      
      const result = await transporter.sendMail({
        from: process.env.SMTP_FROM || 'admin@all4youauctions.co.za',
        to,
        subject,
        text,
        html,
        attachments,
      });
      
      console.log('✅ OAuth2 email sent successfully:', result.messageId);
      return result;
    } catch (error) {
      console.error('❌ OAuth2 email sending failed:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const transporter = await this.createTransporter();
      await transporter.verify();
      console.log('✅ Gmail OAuth2 connection verified');
      return true;
    } catch (error) {
      console.error('❌ Gmail OAuth2 connection failed:', error.message);
      return false;
    }
  }
}

module.exports = GmailOAuth2Service;