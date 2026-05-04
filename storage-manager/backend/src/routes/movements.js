// backend/src/routes/movements.js
const express = require('express');
const mongoose = require('mongoose');
const router = express.Router();

const Movement = require('../models/Movement');
const Job = require('../models/Job');

router.get('/', async (req, res) => {
  try {
    const { itemId } = req.query;
    const role = req.user?.role;

    /* ---------------- OFFICE ---------------- */
    if (role === 'OFFICE') {
      // allow ALL movements or filter by itemId
      if (itemId && !mongoose.Types.ObjectId.isValid(itemId)) {
        return res.status(400).json({ message: 'Invalid itemId' });
      }

      const filter = itemId ? { itemId } : {};
      const movements = await Movement.find(filter).sort({ at: -1 });

      console.log(
        `[GET /movements] role=OFFICE itemId=${itemId || 'ALL'} count=${movements.length}`
      );

      return res.json(movements);
    }

    /* ---------------- DRIVER ---------------- */
    // Driver MUST provide itemId
    if (!itemId) {
      return res.status(400).json({ message: 'itemId query param is required' });
    }

    if (!mongoose.Types.ObjectId.isValid(itemId)) {
      return res.status(400).json({ message: 'Invalid itemId' });
    }

    const driverIdObj = req.user?._id;               // ObjectId
    const driverIdStr = driverIdObj?.toString();     // string
    if (!driverIdStr) {
      return res.status(401).json({ message: 'Not authenticated' });
    }

    // ✅ Mixed-type safe authorization:
    // allow if there exists a job for this driver (string OR ObjectId) that contains the itemId
    const allowed = await Job.exists({
      items: itemId,
      $or: [{ driverId: driverIdStr }, { driverId: driverIdObj }],
    });

    if (!allowed) {
      return res.status(403).json({ message: 'Forbidden' });
    }

    const movements = await Movement.find({ itemId }).sort({ at: -1 });

    console.log(
      `[GET /movements] role=DRIVER user=${req.user.email} itemId=${itemId} count=${movements.length}`
    );

    return res.json(movements);
  } catch (err) {
    console.error('[GET /movements] error', err);
    return res.status(500).json({ message: 'Failed to fetch movements' });
  }
});

module.exports = router;
