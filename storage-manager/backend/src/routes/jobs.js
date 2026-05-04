const express = require('express');
const mongoose = require('mongoose');
const Job = require('../models/Job');
const router = express.Router();
const { requireRole } = require('../middleware/auth');

// helper: OFFICE can access any job; DRIVER can access only their own job
async function loadJob(req, res, next) {
  try {
    const job = await Job.findById(req.params.id); // no populate by default
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (req.user.role !== 'OFFICE' && String(job.driverId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    req.job = job;
    next();
  } catch (err) {
    console.error('[JobAuth] error', err);
    return res.status(500).json({ message: 'Failed to load job' });
  }
}

async function loadJobWithItems(req, res, next) {
  try {
    const job = await Job.findById(req.params.id).populate('items');
    if (!job) return res.status(404).json({ message: 'Job not found' });

    if (req.user.role !== 'OFFICE' && String(job.driverId) !== String(req.user._id)) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    req.job = job;
    next();
  } catch (err) {
    console.error('[JobAuth] error', err);
    return res.status(500).json({ message: 'Failed to load job' });
  }
}

// GET /jobs - all jobs (OFFICE only)
router.get('/', requireRole('OFFICE'), async (req, res) => {
  try {
    const jobs = await Job.find({}).sort({ createdAt: -1 });
    console.log('[GET /jobs] count =', jobs.length);
    res.json(jobs);
  } catch (err) {
    console.error('[GET /jobs] error', err);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
});

// validator
function validateJob(body) {
  const errors = [];
  if (!body.title) errors.push('title is required');
  if (!body.pickupLocation) errors.push('pickupLocation is required');
  if (!body.dropoffLocation) errors.push('dropoffLocation is required');
  if (!body.driverId) errors.push('driverId is required');

  // ✅ add a “professional” check
  if (body.driverId && !mongoose.Types.ObjectId.isValid(body.driverId)) {
    errors.push('driverId must be a valid ObjectId');
  }

  return errors;
}

// POST /jobs – create a job (OFFICE only)
router.post('/', requireRole('OFFICE'), async (req, res) => {
  console.log('[POST /jobs] body =', req.body);

  const errors = validateJob(req.body);
  if (errors.length) {
    return res.status(400).json({ message: 'Validation failed', errors });
  }

  try {
    const job = await Job.create({
      title: req.body.title,
      driverId: req.body.driverId,
      van: req.body.van || '',
      pickupLocation: req.body.pickupLocation,
      dropoffLocation: req.body.dropoffLocation,
      scheduledDate: req.body.scheduledDate || new Date(),
      status: 'PLANNED',
      items: [],
    });

    console.log('[POST /jobs] created id =', job._id.toString());
    res.status(201).json(job);
  } catch (err) {
    console.error('[POST /jobs] error', err);
    res.status(500).json({ message: 'Failed to create job' });
  }
});

// GET /jobs/my – driver’s own jobs (OFFICE can pass driverId)
router.get('/my', async (req, res) => {
  try {
    const effectiveDriverId =
      req.user.role === 'OFFICE' && req.query.driverId
        ? req.query.driverId
        : req.user._id.toString();

    const jobs = await Job.find({ driverId: effectiveDriverId })
      .sort({ scheduledDate: 1, createdAt: -1 });

    console.log(
      `[GET /jobs/my] user=${req.user.email} driverId=${effectiveDriverId} count=${jobs.length}`
    );

    res.json(jobs);
  } catch (err) {
    console.error('[GET /jobs/my] error', err);
    res.status(500).json({ message: 'Failed to fetch jobs' });
  }
});

// GET /jobs/:id – single job (populated items)
router.get('/:id', loadJobWithItems, async (req, res) => {
  console.log(`[GET /jobs/${req.params.id}] user=${req.user.email}`);
  return res.json(req.job);
});

// PATCH /jobs/:id/items – set items for a job (OFFICE only)
router.patch('/:id/items', requireRole('OFFICE'), async (req, res) => {
  const { itemIds } = req.body;

  if (!Array.isArray(itemIds)) {
    return res.status(400).json({ message: 'itemIds must be an array of item IDs' });
  }

  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { items: itemIds },
      { new: true }
    ).populate('items');

    if (!job) return res.status(404).json({ message: 'Job not found' });

    console.log(`[PATCH /jobs/${req.params.id}/items] now has items=${job.items.length}`);
    res.json(job);
  } catch (err) {
    console.error('[PATCH /jobs/:id/items] error', err);
    res.status(500).json({ message: 'Failed to update job items' });
  }
});

// PATCH /jobs/:id/status – update job status
router.patch('/:id/status', loadJob, async (req, res) => {
  const { status } = req.body;

  const validStatuses = ['PLANNED', 'IN_PROGRESS', 'COMPLETED', 'CANCELLED'];
  if (!validStatuses.includes(status)) {
    return res.status(400).json({ message: 'Invalid status' });
  }

  // DRIVER restrictions
  if (req.user.role !== 'OFFICE') {
    const driverAllowed = ['IN_PROGRESS', 'COMPLETED'];
    if (!driverAllowed.includes(status)) {
      return res.status(403).json({ message: 'Drivers can only set IN_PROGRESS or COMPLETED' });
    }
  }

  try {
    const job = await Job.findByIdAndUpdate(
      req.params.id,
      { status },
      { new: true }
    ).populate('items'); // keep frontend response consistent

    if (!job) return res.status(404).json({ message: 'Job not found' });

    console.log(`[PATCH /jobs/${req.params.id}/status] user=${req.user.email} -> ${status}`);
    return res.json(job);
  } catch (err) {
    console.error('[PATCH /jobs/:id/status] error', err);
    return res.status(500).json({ message: 'Failed to update job status' });
  }
});

module.exports = router;