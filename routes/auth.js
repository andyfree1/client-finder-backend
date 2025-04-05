const express = require('express');
const router = express.Router();
const { auth, checkRole } = require('../middleware/auth');
const authController = require('../controllers/authController');

// Public routes
router.post('/register', authController.register);
router.post('/login', authController.login);

// Protected routes
router.get('/profile', auth, authController.getProfile);
router.put('/profile', auth, authController.updateProfile);
router.post('/change-password', auth, authController.changePassword);

// Admin routes
router.get('/users', auth, checkRole(['admin']), authController.getAllUsers);
router.put('/user-status', auth, checkRole(['admin']), authController.updateUserStatus);
router.put('/user-role', auth, checkRole(['admin']), authController.updateUserRole);

module.exports = router;
