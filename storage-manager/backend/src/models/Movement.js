// backend/src/models/Movement.js
const mongoose = require('mongoose');

const movementSchema = new mongoose.Schema(
  {
    itemId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Item',
      required: true,
      index: true,
    },
    type: {
      type: String,
      enum: ['PICKUP', 'STORE', 'LOAD', 'MOVE', 'DELIVER'],
      required: true,
    },
    location: {
      type: String,
      default: '',
    },
    at: {
      type: Date,
      default: Date.now,
    },
    note: {
      type: String,
      default: '',
    },
  },
  { timestamps: true }
);

module.exports = mongoose.model('Movement', movementSchema);