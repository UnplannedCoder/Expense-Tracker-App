/**
 * imageAnalysisService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Uses OpenRouter's vision-capable model (google/gemini-2.0-flash-exp:free)
 * to extract financial data from an uploaded image (bank statement, payslip,
 * handwritten expense note, receipt bundle, etc.).
 *
 * Returns a structured JSON summary:
 *   { totalIncome, totalExpense, netBalance, savingsRatio, transactions[], note }
 *
 * Accepts base64-encoded image data (no multer needed — pure JSON body).
 * ─────────────────────────────────────────────────────────────────────────────
 */

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';

// ─── System prompt for financial image extraction ─────────────────────────────
const IMAGE_EXTRACTION_PROMPT = `You are a precise financial data extractor. The user has uploaded an image that may be a bank statement, payslip, salary slip, expense receipt, handwritten budget note, or any financial document.

Your task:
1. Carefully read ALL numbers and labels visible in the image
2. Identify and sum up all INCOME entries (salary, credits, deposits, earnings)
3. Identify and sum up all EXPENSE entries (debits, payments, purchases, bills)
4. Calculate: Net Balance = Total Income - Total Expenses
5. Calculate: Savings Ratio = (Net Balance / Total Income) * 100  (0 if income is 0)
6. List individual transactions you can see (up to 20 most significant)

IMPORTANT RULES:
- Use Indian Rupees (₹) — if currency symbol is missing, assume INR
- Round all amounts to 2 decimal places
- If the image is unclear or not a financial document, set all values to 0 and explain in the "note" field
- Never hallucinate numbers — only extract what is clearly visible
- For transactions, categorise each as "income" or "expense"

Respond with ONLY valid JSON in this exact format (no markdown, no explanation outside JSON):
{
  "totalIncome": 0.00,
  "totalExpense": 0.00,
  "netBalance": 0.00,
  "savingsRatio": 0.00,
  "currency": "INR",
  "documentType": "bank_statement | payslip | receipt | handwritten | other",
  "period": "detected period string or null",
  "transactions": [
    {
      "description": "string",
      "amount": 0.00,
      "type": "income | expense",
      "date": "DD MMM YYYY or null",
      "category": "Salary | Food | Transport | Bills | Shopping | Healthcare | Entertainment | Travel | Others"
    }
  ],
  "note": "Any important observation about the document or extraction confidence"
}`;

// ─── Generic fetch helper (reuses same pattern as geminiService) ──────────────
const callOpenRouterVision = async (base64Image, mimeType = 'image/jpeg') => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured. Add it to server/.env');
  }

  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: {
            url: `data:${mimeType};base64,${base64Image}`,
          },
        },
        {
          type: 'text',
          text: IMAGE_EXTRACTION_PROMPT,
        },
      ],
    },
  ];

  const body = JSON.stringify({
    model: MODEL,
    messages,
    temperature: 0.1,  // near-deterministic for data extraction
    max_tokens: 1500,
  });

  if (typeof fetch !== 'undefined') {
    const res = await fetch(OPENROUTER_BASE_URL, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'SpendWise Image Analyzer',
      },
      body,
    });

    const data = await res.json();
    if (!res.ok) {
      const msg = data?.error?.message || `HTTP ${res.status}`;
      throw new Error(msg);
    }
    return data;
  }

  // Node < 18 fallback
  const https = require('https');
  return new Promise((resolve, reject) => {
    const url = new URL(OPENROUTER_BASE_URL);
    const req = https.request(
      {
        hostname: url.hostname,
        path: url.pathname,
        method: 'POST',
        headers: {
          Authorization: `Bearer ${apiKey}`,
          'Content-Type': 'application/json',
          'Content-Length': Buffer.byteLength(body),
          'HTTP-Referer': 'http://localhost:5173',
          'X-Title': 'SpendWise Image Analyzer',
        },
      },
      (res) => {
        let raw = '';
        res.on('data', (c) => (raw += c));
        res.on('end', () => {
          try {
            const data = JSON.parse(raw);
            if (res.statusCode >= 400) {
              reject(new Error(data?.error?.message || `HTTP ${res.statusCode}`));
            } else {
              resolve(data);
            }
          } catch {
            reject(new Error(`Bad JSON from OpenRouter: ${raw.substring(0, 200)}`));
          }
        });
      }
    );
    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

// ─── Parse the AI response text into a clean JS object ───────────────────────
const parseExtractionResult = (text) => {
  // Strip any markdown code fences the model might add despite instructions
  const cleaned = text
    .replace(/^```json\s*/i, '')
    .replace(/^```\s*/i, '')
    .replace(/```\s*$/i, '')
    .trim();

  const parsed = JSON.parse(cleaned);

  // Ensure numeric fields are actually numbers, not strings
  const toNum = (v) => Math.max(0, parseFloat(v) || 0);

  const totalIncome  = toNum(parsed.totalIncome);
  const totalExpense = toNum(parsed.totalExpense);
  const netBalance   = totalIncome - totalExpense;
  const savingsRatio = totalIncome > 0
    ? Math.round((netBalance / totalIncome) * 100 * 100) / 100
    : 0;

  return {
    totalIncome:  Math.round(totalIncome  * 100) / 100,
    totalExpense: Math.round(totalExpense * 100) / 100,
    netBalance:   Math.round(netBalance   * 100) / 100,
    savingsRatio,
    currency:     parsed.currency     || 'INR',
    documentType: parsed.documentType || 'other',
    period:       parsed.period       || null,
    transactions: Array.isArray(parsed.transactions) ? parsed.transactions : [],
    note:         parsed.note         || '',
  };
};

// ─── Public API ───────────────────────────────────────────────────────────────

/**
 * Analyse a base64-encoded financial image.
 *
 * @param {string} base64Image  — raw base64 string (no data-URI prefix)
 * @param {string} mimeType     — e.g. 'image/jpeg', 'image/png', 'image/webp'
 * @returns {Promise<Object>}   — { totalIncome, totalExpense, netBalance, savingsRatio, transactions[], ... }
 */
const analyzeFinancialImage = async (base64Image, mimeType = 'image/jpeg') => {
  if (!base64Image || typeof base64Image !== 'string') {
    throw new Error('Invalid image data — base64 string required');
  }

  // Strip data-URI prefix if the client accidentally included it
  const cleanBase64 = base64Image.replace(/^data:[^;]+;base64,/, '');

  console.log(`[ImageAnalysis] Processing image (mime: ${mimeType}, size: ${Math.round(cleanBase64.length / 1024)}KB base64)`);

  const response = await callOpenRouterVision(cleanBase64, mimeType);

  const rawText = response?.choices?.[0]?.message?.content;
  if (!rawText) {
    throw new Error('Empty response from AI model');
  }

  try {
    const result = parseExtractionResult(rawText);
    console.log(`[ImageAnalysis] Extracted — Income: ${result.totalIncome}, Expense: ${result.totalExpense}, Transactions: ${result.transactions.length}`);
    return result;
  } catch (parseErr) {
    console.error('[ImageAnalysis] JSON parse failed. Raw response:', rawText.substring(0, 300));
    throw new Error('Could not parse financial data from the image. Please try a clearer photo.');
  }
};

module.exports = { analyzeFinancialImage };
