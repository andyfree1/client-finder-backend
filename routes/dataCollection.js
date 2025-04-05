const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const dataCollectionController = require('../controllers/dataCollectionController');

// All routes require authentication
router.use(auth);

// Get all data sources
router.get('/', dataCollectionController.getAllDataSources);

// Get data source by ID
router.get('/:id', dataCollectionController.getDataSourceById);

// Create new data source (admin only)
router.post('/', checkRole(['admin']), dataCollectionController.createDataSource);

// Update data source (admin only)
router.put('/:id', checkRole(['admin']), dataCollectionController.updateDataSource);

// Delete data source (admin only)
router.delete('/:id', checkRole(['admin']), dataCollectionController.deleteDataSource);

// Run data collection for a specific source
router.post('/:id/run', dataCollectionController.runDataCollection);

// Run data collection for all active sources
router.post('/run-all', dataCollectionController.runAllDataCollections);

module.exports = router;
