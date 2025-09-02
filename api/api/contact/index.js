const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const dbModels = require('../../database/models');
const router = express.Router();

const CONTACT_INBOX_PATH = path.join(__dirname, '../../data/contact_inbox.json');

// Use the centralized mailer for consistency
const { sendMail } = require('../../utils/mailer');

// POST /api/contact - receive contact form submission - MIGRATED TO POSTGRESQL
router.post('/', async (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  
  const messageData = {
    name,
    email,
    message,
    submitted_at: new Date().toISOString()
  };
  
  try {
    // Try to save to PostgreSQL first
    const savedMessage = await dbModels.createContactMessage(messageData);
    
    // If PostgreSQL fails, fallback to JSON file
    if (!savedMessage) {
      let inbox = [];
      if (fs.existsSync(CONTACT_INBOX_PATH)) {
        inbox = JSON.parse(fs.readFileSync(CONTACT_INBOX_PATH, 'utf8'));
      }
      const entry = { ...messageData, date: messageData.submitted_at };
      inbox.unshift(entry);
      fs.writeFileSync(CONTACT_INBOX_PATH, JSON.stringify(inbox, null, 2));
    }
  } catch (error) {
    console.error('Error saving contact message:', error);
    // Fallback to JSON file on any error
    let inbox = [];
    if (fs.existsSync(CONTACT_INBOX_PATH)) {
      inbox = JSON.parse(fs.readFileSync(CONTACT_INBOX_PATH, 'utf8'));
    }
    const entry = { ...messageData, date: messageData.submitted_at };
    inbox.unshift(entry);
    fs.writeFileSync(CONTACT_INBOX_PATH, JSON.stringify(inbox, null, 2));
  }

  // Send email to admin using centralized mailer
  sendMail({
    to: 'admin@all4youauctions.co.za',
    subject: `Contact Form Submission from ${name}`,
    text: `Name: ${name}\nEmail: ${email}\nMessage: ${message}`,
    html: `
      <h3>New Contact Form Submission</h3>
      <p><strong>Name:</strong> ${name}</p>
      <p><strong>Email:</strong> ${email}</p>
      <p><strong>Message:</strong></p>
      <p>${message.replace(/\n/g, '<br>')}</p>
      <hr>
      <p><small>Sent via all4youauctions.co.za contact form</small></p>
    `
  }).then(() => {
    res.json({ success: true, note: 'Message sent and email delivered' });
  }).catch((err) => {
    console.log('Email send error:', err);
    // Still return success even if email fails (form data is saved)
    res.json({ success: true, note: 'Message saved, email delivery pending' });
  });
});

// GET /api/contact/inbox - admin fetch inbox - MIGRATED TO POSTGRESQL
router.get('/inbox', async (req, res) => {
  try {
    // Try PostgreSQL first
    const messages = await dbModels.getAllContactMessages();
    
    if (messages.length > 0) {
      // Transform database fields to match expected format
      const transformedMessages = messages.map(msg => ({
        id: msg.id,
        name: msg.name,
        email: msg.email,
        message: msg.message,
        date: msg.submitted_at,
        status: msg.status || 'unread'
      }));
      return res.json(transformedMessages);
    }
    
    // Fallback to JSON file if no database messages
    let inbox = [];
    if (fs.existsSync(CONTACT_INBOX_PATH)) {
      inbox = JSON.parse(fs.readFileSync(CONTACT_INBOX_PATH, 'utf8'));
    }
    res.json(inbox);
  } catch (error) {
    console.error('Error fetching contact messages:', error);
    // Fallback to JSON file on error
    let inbox = [];
    if (fs.existsSync(CONTACT_INBOX_PATH)) {
      inbox = JSON.parse(fs.readFileSync(CONTACT_INBOX_PATH, 'utf8'));
    }
    res.json(inbox);
  }
});

module.exports = router;
