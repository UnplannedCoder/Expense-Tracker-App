const express = require('express');
const { analyzeImage, analyzeText } = require('../controllers/imageController');
const { protect } = require('../middleware/authMiddleware');

const router = express.Router();

// POST /api/v1/image/analyze      — analyze a base64-encoded financial image
router.post('/analyze', protect, analyzeImage);

// POST /api/v1/image/analyze-text — analyze plain text extracted from a PDF
router.post('/analyze-text', protect, analyzeText);

module.exports = router;
