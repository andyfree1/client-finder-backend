const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const prospectController = require('../controllers/prospectController');

// All routes require authentication
router.use(auth);

// Get all prospects with filtering
router.get('/', prospectController.getAllProspects);

// Get qualified leads
router.get('/qualified', prospectController.getQualifiedLeads);

// Get prospect by ID
router.get('/:id', prospectController.getProspectById);

// Create new prospect
router.post('/', prospectController.createProspect);

// Update prospect
router.put('/:id', prospectController.updateProspect);

// Delete prospect (admin and agent only)
router.delete('/:id', checkRole(['admin', 'agent']), prospectController.deleteProspect);

// Add note to prospect
router.post('/:id/notes', prospectController.addNote);

// Add interaction to prospect
router.post('/:id/interactions', prospectController.addInteraction);

// Assign prospect to agent (admin only)
router.put('/:id/assign', checkRole(['admin']), prospectController.assignProspect);

module.exports = router;
