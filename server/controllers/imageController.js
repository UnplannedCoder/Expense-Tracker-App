const { analyzeFinancialImage } = require('../services/imageAnalysisService');

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

    // Enforce a ~8MB base64 limit to prevent abuse (8MB base64 ≈ 6MB raw image)
    const MAX_BASE64_BYTES = 8 * 1024 * 1024;
    if (Buffer.byteLength(image, 'base64') > MAX_BASE64_BYTES) {
      return res.status(413).json({
        success: false,
        message: 'Image is too large. Please use an image under 6MB.',
      });
    }

    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp', 'image/gif'];
    const resolvedMime = validMimes.includes(mimeType) ? mimeType : 'image/jpeg';

    const result = await analyzeFinancialImage(image, resolvedMime);

    return res.status(200).json({
      success: true,
      data: result,
    });
  } catch (error) {
    console.error('[imageController] analyzeImage error:', error.message);

    // Surface user-friendly errors directly
    if (error.message) {
      return res.status(422).json({
        success: false,
        message: error.message,
      });
    }

    next(error);
  }
};

module.exports = { analyzeImage };
