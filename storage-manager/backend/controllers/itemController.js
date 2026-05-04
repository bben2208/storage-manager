const Item = require('../models/Item');

// Create a new item
exports.createItem = async (req, res) => {
    try {
        const newItem = new Item({
            ...req.body,
            office: req.user.officeId
        });
        await newItem.save();
        res.status(201).json(newItem);
    } catch (error) {
        res.status(500).json({ message: 'Error creating item', error: error.message });
    }
};

// Get all items for the user's office
exports.getOfficeItems = async (req, res) => {
    try {
        const items = await Item.find({ office: req.user.officeId });
        res.status(200).json(items);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching items', error: error.message });
    }
};

// Get a specific item
exports.getItemById = async (req, res) => {
    try {
        const item = await Item.findOne({ _id: req.params.id, office: req.user.officeId });
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ message: 'Error fetching item', error: error.message });
    }
};

// Update an item
exports.updateItem = async (req, res) => {
    try {
        const item = await Item.findOneAndUpdate(
            { _id: req.params.id, office: req.user.officeId },
            req.body,
            { new: true }
        );
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json(item);
    } catch (error) {
        res.status(500).json({ message: 'Error updating item', error: error.message });
    }
};

// Delete an item
exports.deleteItem = async (req, res) => {
    try {
        const item = await Item.findOneAndDelete({ _id: req.params.id, office: req.user.officeId });
        if (!item) {
            return res.status(404).json({ message: 'Item not found' });
        }
        res.status(200).json({ message: 'Item deleted successfully' });
    } catch (error) {
        res.status(500).json({ message: 'Error deleting item', error: error.message });
    }
};