const mongoose = require('mongoose');

const itemSchema = new mongoose.Schema(
  {
    orderNo: {
      type: String,
      required: true,
      index: true,
    },
    customerName: {
      type: String,
      required: true,
    },
    description: {
      type: String,
      default: '',
    },
    quantity: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['PENDING', 'PICKED_UP', 'IN_STORAGE', 'LOADED', 'EN_ROUTE', 'DELIVERED'],      default: 'PENDING',
      index: true,
    },
    lastSeenAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  },
);

module.exports = mongoose.model('Item', itemSchema);
