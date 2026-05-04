// backend/src/routes/items.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Item = require('../models/Item');
const Movement = require('../models/Movement');
const Job = require('../models/Job');
const { requireRole } = require('../middleware/auth');

/* ------------------------- helpers ------------------------- */

function validateItem(body) {
  const errors = [];
  if (!body.orderNo || typeof body.orderNo !== 'string') {
    errors.push('orderNo is required (string)');
  }
  if (!body.customerName || typeof body.customerName !== 'string') {
    errors.push('customerName is required (string)');
  }
  return errors;
}

/**
 * OFFICE: can access everything
 * DRIVER: can access only items assigned to their jobs
 */
async function canAccessItem(req, itemId) {
  const role = req.user?.role;
  if (role === 'OFFICE') return true;

  if (role !== 'DRIVER') return false;

  const driverId = req.user?._id;
  if (!driverId) return false;

  const count = await Job.countDocuments({
    items: itemId,
    driverId: driverId,
  });

  return count > 0;

}


/**
 * Loads Item into req.item and enforces access rules.
 * - validates ObjectId
 * - 404 if missing
 * - 403 if not allowed
 */
async function loadItemAndAuthorize(req, res, next) {
  try {
    const { id } = req.params;

    if (!mongoose.Types.ObjectId.isValid(id)) {
      return res.status(400).json({ message: 'Invalid item id' });
    }

    const allowed = await canAccessItem(req, id);
    if (!allowed) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const item = await Item.findById(id);
    if (!item) {
      return res.status(404).json({ message: 'Item not found' });
    }

    req.item = item;
    return next();
  } catch (err) {
    console.error('[ItemAuth] error', err);
    return res.status(500).json({ message: 'Failed to load item' });
  }
}

/* ------------------------- GET /items ------------------------- */
/**
 * OFFICE: all items
 * DRIVER: only items assigned to their jobs
 */
router.get('/', async (req, res) => {
  try {
    const role = req.user?.role;

    if (role === 'OFFICE') {
      const items = await Item.find().sort({ createdAt: -1 });
      console.log(`[GET /items] role=OFFICE count=${items.length}`);
      return res.json(items);
    }

    const driverId = req.user?._id;
    if (!driverId) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    const jobs = await Job.find({ driverId }, { items: 1 });
    const itemIds = [];

    for (const job of jobs) {
      for (const id of job.items || []) itemIds.push(id);
    }

    if (itemIds.length === 0) {
      console.log('[GET /items] role=DRIVER count=0');
      return res.json([]);
    }

    // Note: duplicates are fine; Mongo handles $in nicely, but you can dedupe later if you want
    const items = await Item.find({ _id: { $in: itemIds } }).sort({ createdAt: -1 });
    console.log(`[GET /items] role=DRIVER count=${items.length}`);
    return res.json(items);
  } catch (err) {
    console.error('[GET /items] error', err);
    return res.status(500).json({ message: 'Failed to fetch items' });
  }
});

/* ------------------------- GET /items/:id ------------------------- */
router.get('/:id', loadItemAndAuthorize, (req, res) => {
  console.log(`[GET /items/${req.params.id}] role=${req.user?.role}`);
  return res.json(req.item);
});

/* ------------------------- POST /items ------------------------- */
/**
 * Create new item (OFFICE only)
 */
router.post('/', requireRole('OFFICE'), async (req, res) => {
  console.log('[POST /items] body =', req.body);

  const errors = validateItem(req.body);
  if (errors.length > 0) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  try {
    const now = new Date();

    const newItem = await Item.create({
      orderNo: req.body.orderNo,
      customerName: req.body.customerName,
      description: req.body.description || '',
      quantity: typeof req.body.quantity === 'number' ? req.body.quantity : 1,
      status: 'PENDING',
      lastSeenAt: now,
    });

    console.log('[POST /items] created id =', newItem._id.toString());
    return res.status(201).json(newItem);
  } catch (err) {
    console.error('[POST /items] error', err);
    return res.status(500).json({ message: 'Failed to create item' });
  }
});

/* ------------------------- PATCH /items/:id/status ------------------------- */
/**
 * OFFICE: can update any item
 * DRIVER: only if item is assigned to their job
 */
router.patch('/:id/status', loadItemAndAuthorize, async (req, res) => {
  const { status } = req.body;

  const validStatuses = [
    'PENDING',
    'PICKED_UP',
    'IN_STORAGE',
    'LOADED',
    'EN_ROUTE',
    'DELIVERED',
  ];

  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  try {
    req.item.status = status;
    req.item.lastSeenAt = new Date();
    await req.item.save();

    console.log(`[PATCH /items/${req.params.id}/status] -> ${status}`);
    return res.json(req.item);
  } catch (err) {
    console.error('[PATCH /items/:id/status] error', err);
    return res.status(500).json({ message: 'Failed to update status' });
  }
});

/* ------------------------- POST /items/:id/movements ------------------------- */
/**
 * OFFICE: can add movement for any item
 * DRIVER: only if item is assigned to their job
 */
router.post('/:id/movements', loadItemAndAuthorize, async (req, res) => {
  const { type, location, note } = req.body;

  const validTypes = ['PICKUP', 'STORE', 'LOAD', 'MOVE', 'DELIVER'];
  if (!validTypes.includes(type)) {
    return res.status(400).json({ message: 'Invalid movement type' });
  }

  try {
    const movement = await Movement.create({
      itemId: req.item._id,
      type,
      location: location || '',
      note: note || '',
      at: new Date(),
    });

    console.log(
      `[POST /items/${req.item._id}/movements] type=${type} location=${movement.location}`
    );

    // auto-status sync
    if (type === 'PICKUP') req.item.status = 'PICKED_UP';
    if (type === 'STORE') req.item.status = 'IN_STORAGE';
    if (type === 'LOAD') req.item.status = 'LOADED';
    if (type === 'MOVE') req.item.status = 'EN_ROUTE';
    if (type === 'DELIVER') req.item.status = 'DELIVERED';

    req.item.lastSeenAt = new Date();
    await req.item.save();

    return res.status(201).json(movement);
  } catch (err) {
    console.error('[POST /items/:id/movements] error', err);
    return res.status(500).json({ message: 'Failed to create movement' });
  }
});

module.exports = router;