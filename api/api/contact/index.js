const express = require('express');
const fs = require('fs');
const path = require('path');
const nodemailer = require('nodemailer');
const router = express.Router();

const CONTACT_INBOX_PATH = path.join(__dirname, '../../data/contact_inbox.json');

// Use the centralized mailer for consistency
const { sendMail } = require('../../utils/mailer');

// POST /api/contact - receive contact form submission
router.post('/', (req, res) => {
  const { name, email, message } = req.body;
  if (!name || !email || !message) {
    return res.status(400).json({ error: 'Missing fields' });
  }
  const entry = {
    name,
    email,
    message,
    date: new Date().toISOString()
  };
  // Save to inbox
  let inbox = [];
  if (fs.existsSync(CONTACT_INBOX_PATH)) {
    inbox = JSON.parse(fs.readFileSync(CONTACT_INBOX_PATH, 'utf8'));
  }
  inbox.unshift(entry);
  fs.writeFileSync(CONTACT_INBOX_PATH, JSON.stringify(inbox, null, 2));

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

// GET /api/contact/inbox - admin fetch inbox
router.get('/inbox', (req, res) => {
  let inbox = [];
  if (fs.existsSync(CONTACT_INBOX_PATH)) {
    inbox = JSON.parse(fs.readFileSync(CONTACT_INBOX_PATH, 'utf8'));
  }
  res.json(inbox);
});

module.exports = router;
