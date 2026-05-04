// backend/src/server.js
const dotenv = require('dotenv');
dotenv.config();

const express = require('express');
const cors = require('cors');
const mongoose = require('mongoose');
const bcrypt = require('bcryptjs');

const User = require('./models/User');
const { requireAuth } = require('./middleware/auth');

const app = express();

// Middleware
app.use(
  cors({
    origin: process.env.CORS_ORIGIN || 'http://localhost:5173',
    credentials: true,
  })
);
app.use(express.json());

// Request logger
app.use((req, res, next) => {
  console.log(`[REQ] ${req.method} ${req.url}`);
  next();
});

// Routes (these should export the router directly via module.exports = router)
const authRoutes = require('./routes/auth');
const authRouter = authRoutes.router || authRoutes;const itemRouter = require('./routes/items');
const movementRouter = require('./routes/movements');
const jobRouter = require('./routes/jobs');

// Safety check (helps catch the exact crash you had)
console.log('[BOOT] typeof requireAuth =', typeof requireAuth);
console.log('[BOOT] routers:', {
  auth: typeof authRouter,
  items: typeof itemRouter,
  movements: typeof movementRouter,
  jobs: typeof jobRouter,
});

app.use('/auth', authRouter);

// ✅ protect everything else
app.use('/items', requireAuth, itemRouter);
app.use('/movements', requireAuth, movementRouter);
app.use('/jobs', requireAuth, jobRouter);

app.get('/health', (req, res) => {
  res.json({ ok: true, ts: new Date().toISOString() });
});

// Config
const PORT = process.env.PORT || 5000;
const MONGO_URI = process.env.MONGO_URI;

/*
|--------------------------------------------------------------------------
| Seed Users
|--------------------------------------------------------------------------
*/

async function ensureDemoDriver() {
  const email = 'driver@storage-manager.test';

  const existing = await User.findOne({ email });
  if (existing) {
    console.log('[Seed] Demo DRIVER already exists');
    return;
  }

  const passwordHash = await bcrypt.hash('driver', 10);

  await User.create({
    name: 'Demo Driver',
    email,
    passwordHash,
    role: 'DRIVER',
  });

  console.log('[Seed] Created demo DRIVER user:', email);
}

async function ensureOfficeUser() {
  const email = 'office@storage-manager.test';

  const existing = await User.findOne({ email });
  if (existing) {
    console.log('[Seed] OFFICE user already exists');
    return;
  }

  const passwordHash = await bcrypt.hash('office', 10);

  await User.create({
    name: 'Demo Office',
    email,
    passwordHash,
    role: 'OFFICE',
  });

  console.log('[Seed] Created OFFICE user:', email);
}

/*
|--------------------------------------------------------------------------
| Start Server
|--------------------------------------------------------------------------
*/
async function start() {
  try {
    console.log('[DB] Connecting to Mongo...');
    await mongoose.connect(MONGO_URI);
    console.log('[DB] Connected');

    await ensureDemoDriver();
    await ensureOfficeUser();

    app.listen(PORT, () => {
      console.log(`API running on port ${PORT}`);
    });
  } catch (err) {
    console.error('[DB] Connection error', err);
    process.exit(1);
  }
}

start();