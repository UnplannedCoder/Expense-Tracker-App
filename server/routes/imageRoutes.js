const express = require('express');
const { analyzeImage } = require('../controllers/imageController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/v1/image/analyze — analyze a base64-encoded financial image
router.post('/analyze', protect, analyzeImage);

module.exports = router;
