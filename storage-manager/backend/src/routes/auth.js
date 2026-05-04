const express = require('express');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const User = require('../models/User');

const router = express.Router();

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';
const JWT_EXPIRES_IN = '7d';

// helper: create a JWT
function createToken(user) {
  return jwt.sign(
    {
      sub: user._id.toString(),
      role: user.role,
    },
    JWT_SECRET,
    { expiresIn: JWT_EXPIRES_IN }
  );
}

// helper: shape user object for frontend
function safeUser(userDoc) {
  const obj = userDoc.toObject ? userDoc.toObject() : userDoc;
  const { passwordHash, __v, ...rest } = obj;
  return rest;
}

// POST /auth/register  (for later / manual use)
router.post('/register', async (req, res) => {
  const { name, email, password, role } = req.body || {};

  if (!name || !email || !password) {
    return res
      .status(400)
      .json({ message: 'name, email and password are required' });
  }

  try {
    const existing = await User.findOne({ email });
    if (existing) {
      return res.status(409).json({ message: 'Email already in use' });
    }

    const passwordHash = await bcrypt.hash(password, 10);
    const user = await User.create({
      name,
      email,
      passwordHash,
      role: role || 'DRIVER',
    });

    const token = createToken(user);

    console.log('[POST /auth/register] created user', user.email);

    res.status(201).json({
      token,
      user: safeUser(user),
    });
  } catch (err) {
    console.error('[POST /auth/register] error', err);
    res.status(500).json({ message: 'Failed to register user' });
  }
});

// POST /auth/login  – email + password -> token + user
router.post('/login', async (req, res) => {
  const { email, password } = req.body || {};
  console.log('[POST /auth/login] body =', {
    email,
    password: password ? '***' : '',
  });

  if (!email || !password) {
    return res.status(400).json({ message: 'email and password are required' });
  }

  try {
    const user = await User.findOne({ email });
    if (!user) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const ok = await bcrypt.compare(password, user.passwordHash);
    if (!ok) {
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = createToken(user);

    console.log('[POST /auth/login] success for', user.email);

    res.json({
      token,
      user: safeUser(user),
    });
  } catch (err) {
    console.error('[POST /auth/login] error', err);
    res.status(500).json({ message: 'Login failed' });
  }
});

// GET /auth/me – read token from Authorization header and return user
router.get('/me', async (req, res) => {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    console.log('[GET /auth/me]', user.email);

    res.json(safeUser(user));
  } catch (err) {
    console.error('[GET /auth/me] error', err);
    res.status(401).json({ message: 'Invalid or expired token' });
  }
});

module.exports = router;