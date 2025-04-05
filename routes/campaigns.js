const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const campaignController = require('../controllers/campaignController');

// All routes require authentication
router.use(auth);

// Get all campaigns
router.get('/', campaignController.getAllCampaigns);

// Get campaign by ID
router.get('/:id', campaignController.getCampaignById);

// Create new campaign
router.post('/', campaignController.createCampaign);

// Update campaign
router.put('/:id', campaignController.updateCampaign);

// Delete campaign (admin and agent only)
router.delete('/:id', checkRole(['admin', 'agent']), campaignController.deleteCampaign);

// Launch campaign
router.post('/:id/launch', campaignController.launchCampaign);

// Cancel campaign
router.post('/:id/cancel', campaignController.cancelCampaign);

module.exports = router;
