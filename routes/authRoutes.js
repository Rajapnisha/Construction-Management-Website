const express = require('express');
const router = express.Router();
const authController = require('../controllers/authController');

const { protect } = require('../middleware/authMiddleware');

const multer = require('multer');
const path = require('path');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `user-${req.params.id}-${Date.now()}${path.extname(file.originalname)}`);
    }
});

const upload = multer({ storage });

router.post('/register', authController.register);
router.post('/login', authController.login);
router.get('/users', authController.getUsers);
router.put('/update/:id', protect, upload.single('profileImage'), authController.updateProfile);
router.get('/me', protect, authController.getMe);

module.exports = router;
