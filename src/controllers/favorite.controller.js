const Favorite = require('../models/favorite.model');
const { sequelize } = require('../config/db');

// Add a product to favorites
exports.addFavorite = async (req, res) => {
  try {
    console.log(">>>>>>>>>>>>>>>>>", req.body)
    const { userId, productId } = req.body;
    if (!userId || !productId) {
      return res.status(400).json({ status: 'error', message: 'userId and productId are required' });
    }

    // Prevent duplicates
    const existing = await Favorite.findOne({ where: { userId, productId } });
    if (existing) {
      return res.status(200).json({ status: 'success', message: 'Product already in favorites', favorite: existing });
    }

    const favorite = await Favorite.create({ userId, productId });
    res.status(200).json({ status: 'success', message: 'Added to favorites', favorite });
  } catch (error) {
    console.error('Add favorite error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to add favorite', error: error.message });
  }
};

// Remove a product from favorites
exports.removeFavorite = async (req, res) => {
  try {
    const { userId, productId } = req.body;
    if (!userId || !productId) {
      return res.status(400).json({ status: 'error', message: 'userId and productId are required' });
    }

    const deleted = await Favorite.destroy({ where: { userId, productId } });
    if (!deleted) {
      return res.status(404).json({ status: 'error', message: 'Favorite not found' });
    }

    res.status(200).json({ status: 'success', message: 'Removed from favorites' });
  } catch (error) {
    console.error('Remove favorite error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to remove favorite', error: error.message });
  }
};

// Get all favorites for a user
exports.getFavorites = async (req, res) => {
  try {
    const { userId } = req.query;
    if (!userId) {
      return res.status(400).json({ status: 'error', message: 'userId is required' });
    }

    const favorites = await Favorite.findAll({ where: { userId } });
    res.status(200).json({ status: 'success', favorites });
  } catch (error) {
    console.error('Get favorites error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to get favorites', error: error.message });
  }
};

// Check if a product is in user's favorites
exports.isFavorite = async (req, res) => {
  try {
    const { userId, productId } = req.query;
    if (!userId || !productId) {
      return res.status(400).json({ status: 'error', message: 'userId and productId are required' });
    }

    const favorite = await Favorite.findOne({ where: { userId, productId } });
    res.status(200).json({ status: 'success', isFavorite: !!favorite });
  } catch (error) {
    console.error('Check favorite error:', error);
    res.status(500).json({ status: 'error', message: 'Failed to check favorite', error: error.message });
  }
};
