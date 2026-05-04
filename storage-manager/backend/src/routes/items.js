const express = require('express');
const router = express.Router();
const auth = require('../middleware/auth');
const itemController = require('../controllers/itemController');

// Create a new item
router.post('/', auth, itemController.createItem);

// Get all items for the user's office
router.get('/office', auth, itemController.getOfficeItems);

// Get a specific item
router.get('/:id', auth, itemController.getItemById);

// Update an item
router.put('/:id', auth, itemController.updateItem);

// Delete an item
router.delete('/:id', auth, itemController.deleteItem);

module.exports = router;