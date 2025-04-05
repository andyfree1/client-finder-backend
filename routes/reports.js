const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const reportController = require('../controllers/reportController');

// All routes require authentication
router.use(auth);

// Get dashboard statistics
router.get('/dashboard', reportController.getDashboardStats);

// Get prospect statistics
router.get('/prospects', reportController.getProspectStats);

// Get campaign statistics
router.get('/campaigns', reportController.getCampaignStats);

// Get data collection statistics
router.get('/data-collection', reportController.getDataCollectionStats);

module.exports = router;
