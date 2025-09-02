// backend/api/pending-users/index.js
const express = require('express');
const fs = require('fs');
const path = require('path');
const router = express.Router();

// Import database models - PostgreSQL only
const dbModels = require('../../database/models');

// Register new user (pending)
router.post('/', (req, res) => {
  const { email, name, password } = req.body;
  const pending = readPending();
  if (pending.find(u => u.email === email)) {
    return res.status(400).json({ error: 'Already pending' });
  }
  pending.push({ email, name, password, status: 'pending', createdAt: new Date().toISOString() });
  writePending(pending);
  res.json({ success: true });
});

// List all pending users (admin)
router.get('/', (req, res) => {
  res.json(readPending());
});

// Admin: approve user
router.post('/:email/approve', (req, res) => {
  const pending = readPending();
  const users = readUsers();
  const idx = pending.findIndex(u => u.email === req.params.email);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  const user = pending[idx];
  user.status = 'approved';
  users.push({ email: user.email, name: user.name, password: user.password, role: 'user', createdAt: user.createdAt });
  writeUsers(users);
  pending.splice(idx, 1);
  writePending(pending);
  res.json({ success: true });
});

// Admin: reject user
router.post('/:email/reject', (req, res) => {
  const pending = readPending();
  const idx = pending.findIndex(u => u.email === req.params.email);
  if (idx === -1) return res.status(404).json({ error: 'Not found' });
  pending[idx].status = 'rejected';
  // TODO: send rejection email here if needed
  writePending(pending);
  res.json({ success: true });
});

module.exports = router;
