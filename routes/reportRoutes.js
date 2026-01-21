const express = require('express');
const router = express.Router();
const reportController = require('../controllers/reportController');
const { protect, authorize } = require('../middleware/authMiddleware');

// Protect all routes
router.use(protect);

// Get All Reports (Admin, Engineer, Employee)
router.get('/', authorize('admin', 'engineer', 'employee'), reportController.getAllReports);

// Create Report (Admin, Engineer, Employee)
router.post('/', authorize('admin', 'engineer', 'employee'), reportController.createReport);

// Update Report (Admin, Engineer, Employee)
router.put('/:id', authorize('admin', 'engineer', 'employee'), reportController.updateReport);

// Delete Report (Admin, Engineer ONLY)
router.delete('/:id', authorize('admin', 'engineer'), reportController.deleteReport);

module.exports = router;
