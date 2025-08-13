# Google Workspace Email Setup Guide

## Overview
Your auction system now uses Google Workspace exclusively for email services. SendGrid has been completely removed.

## Email Service Priority
1. **Gmail OAuth2** (if configured) - Most reliable, never expires
2. **SMTP with App Password** - Fallback method

## Setup Instructions

### Method 1: SMTP with App Password (Recommended)

1. **Enable 2-Step Verification** on your Google Workspace account
2. **Generate App Password**:
   - Go to Google Account settings
   - Security → 2-Step Verification
   - App passwords → Select app and device
   - Generate password (16-character code)

3. **Set Environment Variables**:
```bash
SMTP_HOST=smtp.gmail.com
SMTP_PORT=587
SMTP_USER=your-workspace-email@yourdomain.com
SMTP_PASS=your-16-character-app-password
SMTP_FROM=your-workspace-email@yourdomain.com
```

### Method 2: Gmail OAuth2 (Advanced)

If you prefer OAuth2 authentication:

1. **Create Google Cloud Project**
2. **Enable Gmail API**
3. **Create OAuth2 Credentials**
4. **Generate Refresh Token**

Set these variables:
```bash
GMAIL_CLIENT_ID=your-oauth-client-id
GMAIL_CLIENT_SECRET=your-oauth-client-secret
GMAIL_REFRESH_TOKEN=your-refresh-token
SMTP_FROM=your-workspace-email@yourdomain.com
```

## Testing Email Configuration

After setup, test your email configuration:

```bash
curl -X POST http://localhost:5000/api/test-email-connection
```

The system will automatically:
- Try Gmail OAuth2 first (if configured)
- Fall back to SMTP with app password
- Provide detailed error messages if both fail

## Email Features

Your system sends emails for:
- User registration verification
- FICA approval/rejection notifications  
- Bid confirmations and outbid notifications
- Invoice generation and payment confirmations
- Admin notifications

## Troubleshooting

### Common Issues:

1. **"Invalid credentials"** - Check app password is correct
2. **"Less secure app access"** - Use app password instead of regular password
3. **"Authentication failed"** - Enable 2-Step Verification first

### Debug Mode:

Enable email debugging:
```bash
EMAIL_DEBUG=true
```

This will show detailed SMTP logs for troubleshooting.

## Security Notes

- App passwords are more secure than regular passwords
- OAuth2 tokens never expire (preferred for production)
- All email connections use TLS encryption
- No email credentials are logged or exposed

## File Changes Made

1. Removed `@sendgrid/mail` dependency
2. Updated `reliable-mailer.js` to use Google Workspace only
3. Removed `sendgrid-service.js` and `scalable-mailer.js`
4. Updated `.env.example` with Google Workspace configuration

Your system is now configured to use Google Workspace exclusively for all email communications.