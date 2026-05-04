const jwt = require('jsonwebtoken');
const User = require('../models/User');

const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret';

async function requireAuth(req, res, next) {
  const authHeader = req.headers.authorization || '';
  const token = authHeader.startsWith('Bearer ')
    ? authHeader.slice(7)
    : null;

  if (!token) {
    return res.status(401).json({ message: 'No token provided' });
  }

  try {
    const payload = jwt.verify(token, JWT_SECRET);

    const user = await User.findById(payload.sub);
    if (!user) {
      return res.status(401).json({ message: 'User not found' });
    }

    req.user = user; // attach authenticated user
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid or expired token' });
  }
}

function requireRole(...roles) {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(500).json({ message: 'Auth middleware missing' });
    }

    if (!roles.includes(req.user.role)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    next();
  };
}

async function requireAuth(req, res, next) {
    const authHeader = req.headers.authorization || '';
    console.log('[AUTH] header:', authHeader ? authHeader.slice(0, 30) + '...' : '(none)');
  
    const token = authHeader.startsWith('Bearer ')
      ? authHeader.slice(7)
      : null;
  
    if (!token) {
      console.log('[AUTH] NO TOKEN -> 401');
      return res.status(401).json({ message: 'No token provided' });
    }
  
    try {
      const payload = jwt.verify(token, JWT_SECRET);
      console.log('[AUTH] token OK payload.sub=', payload.sub);
  
      const user = await User.findById(payload.sub);
      if (!user) {
        console.log('[AUTH] USER NOT FOUND -> 401');
        return res.status(401).json({ message: 'User not found' });
      }
  
      req.user = user;
      next();
    } catch (err) {
      console.log('[AUTH] INVALID TOKEN -> 401', err.message);
      return res.status(401).json({ message: 'Invalid or expired token' });
    }
  }

module.exports = { requireAuth, requireRole };