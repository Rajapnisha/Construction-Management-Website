const express = require('express');
const router = express.Router();
const projectController = require('../controllers/projectController');
const { protect, authorize } = require('../middleware/authMiddleware');
const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

// Engineer routes
router.post('/', protect, authorize('engineer'), upload.fields([
    { name: 'projectImage', maxCount: 1 },
    { name: 'blueprint', maxCount: 1 }
]), projectController.createProject);

router.put('/:id/assign-employees', protect, authorize('engineer'), projectController.assignEmployees);

// Project Retrieval
router.get('/public', projectController.getPublicProjects);
router.get('/', protect, projectController.getAllProjects);
router.get('/stats', protect, projectController.getDashboardStats);
router.get('/:id', projectController.getProject);

// Updates (Engineer & Employee)
router.post('/:id/updates', protect, authorize('engineer', 'employee'), upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 }
]), projectController.postUpdate);

// View Updates (Engineer, Employee, Client)
router.get('/:id/updates', protect, projectController.getProjectUpdates);

module.exports = router;
