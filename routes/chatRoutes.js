const express = require('express');
const router = express.Router();
const chatController = require('../controllers/chatController');
const { protect, authorize } = require('../middleware/authMiddleware');
const multer = require('multer');

const storage = multer.diskStorage({
    destination: (req, file, cb) => {
        cb(null, 'uploads/');
    },
    filename: (req, file, cb) => {
        cb(null, `${Date.now()}-${file.originalname}`);
    }
});

const upload = multer({ storage });

router.get('/:projectId', protect, chatController.getChatHistory);

router.post('/send-image', protect, upload.single('image'), chatController.sendImageMessage);
router.delete('/:id', protect, chatController.deleteMessage);
// Clear Project Chat (Admin & Engineer Only)
router.delete('/project/:projectId', protect, authorize('admin', 'engineer'), chatController.clearProjectChat);

module.exports = router;
