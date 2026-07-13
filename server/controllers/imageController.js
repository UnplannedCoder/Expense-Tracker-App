const { analyzeFinancialImage, analyzeFinancialText } = require('../services/imageAnalysisService');

/**
 * imageController.js
 * Handles financial image analysis endpoints.
 */

// @desc    Analyze a financial image (bank statement, payslip, receipt)
// @route   POST /api/v1/image/analyze
// @access  Private
// @body    { image: "<base64 string>", mimeType: "image/jpeg" }
const analyzeImage = async (req, res, next) => {
  try {
    const { image, mimeType } = req.body;

    if (!image || typeof image !== 'string') {
      return res.status(400).json({
        success: false,
        message: 'Image data is required. Send a base64-encoded image in the "image" field.',
      });
    }

    // Enforce a ~13.5MB base64 limit to prevent abuse (13.5MB base64 ≈ 10MB raw)
    const MAX_BASE64_BYTES = 13.5 * 1024 * 1024;
    if (Buffer.byteLength(image, 'base64') > MAX_BASE64_BYTES) {
      return res.status(413).json({
        success: false,
        message: 'File is too large. Please use a file under 10MB.',
      });
    }

    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif', 'application/pdf'];
    const resolvedMime = validMimes.includes(mimeType) ? mimeType : 'image/jpeg';

    const result = await analyzeFinancialImage(image, resolvedMime);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[imageController] analyzeImage error:', error.message);

    if (error.message) {
      return res.status(422).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

// @desc    Analyze plain text extracted from a PDF
// @route   POST /api/v1/image/analyze-text
// @access  Private
// @body    { text: "<extracted pdf text>", filename: "optional name" }
const analyzeText = async (req, res, next) => {
  try {
    const { text, filename } = req.body;

    if (!text || typeof text !== 'string' || text.trim().length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Text content is required.',
      });
    }

    // Sanity cap — 500KB of text is more than enough for any financial doc
    if (Buffer.byteLength(text, 'utf8') > 500 * 1024) {
      return res.status(413).json({
        success: false,
        message: 'PDF text content is too large. Try a smaller document.',
      });
    }

    const result = await analyzeFinancialText(text, filename || 'document.pdf');

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[imageController] analyzeText error:', error.message);

    if (error.message) {
      return res.status(422).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

module.exports = { analyzeImage, analyzeText };
