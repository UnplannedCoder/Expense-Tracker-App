/**
 * imageAnalysisService.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Extracts financial data from:
 *   1. Images (bank statement photos, payslips, receipts) — via Gemini Vision
 *   2. PDFs with a text layer — text extracted client-side, sent as plain text
 *
 * Returns a structured JSON summary:
 *   { totalIncome, totalExpense, netBalance, savingsRatio, transactions[], note }
 * ─────────────────────────────────────────────────────────────────────────────
 */

const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';
const MODEL = 'google/gemini-2.5-flash';

// ─── System prompt for financial IMAGE extraction ─────────────────────────────
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

// ─── System prompt for financial TEXT extraction (PDF text layer) ─────────────
const TEXT_EXTRACTION_PROMPT = `You are a precise financial data extractor. The user has provided the raw text content extracted from a PDF financial document (bank statement, payslip, salary slip, expense receipts, etc.).

Your task:
1. Carefully read ALL numbers and labels in the text
2. Identify and sum up all INCOME entries (salary, credits, deposits, earnings)
3. Identify and sum up all EXPENSE entries (debits, payments, purchases, bills)
4. Calculate: Net Balance = Total Income - Total Expenses
5. Calculate: Savings Ratio = (Net Balance / Total Income) * 100  (0 if income is 0)
6. List individual transactions you can identify (up to 20 most significant)

IMPORTANT RULES:
- Use Indian Rupees (₹) — if currency symbol is missing, assume INR
- Round all amounts to 2 decimal places
- If the text does not appear to be a financial document, set all values to 0 and explain in the "note" field
- Never hallucinate numbers — only extract what is clearly present in the text
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

// ─── Shared fetch helper ──────────────────────────────────────────────────────
const postToOpenRouter = async (messages, title = 'SpendWise Analyzer') => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not configured. Add it to server/.env');
  }

  const body = JSON.stringify({
    model: MODEL,
    messages,
    temperature: 0.1,
    max_tokens: 1500,
  });

  const headers = {
    Authorization: `Bearer ${apiKey}`,
    'Content-Type': 'application/json',
    'HTTP-Referer': 'http://localhost:5173',
    'X-Title': title,
  };

  if (typeof fetch !== 'undefined') {
    const res = await fetch(OPENROUTER_BASE_URL, { method: 'POST', headers, body });
    const data = await res.json();
    if (!res.ok) {
      throw new Error(data?.error?.message || `HTTP ${res.status}`);
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
        headers: { ...headers, 'Content-Length': Buffer.byteLength(body) },
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

// ─── Vision request (images) ──────────────────────────────────────────────────
const callOpenRouterVision = (base64Image, mimeType = 'image/jpeg') => {
  const messages = [
    {
      role: 'user',
      content: [
        {
          type: 'image_url',
          image_url: { url: `data:${mimeType};base64,${base64Image}` },
        },
        { type: 'text', text: IMAGE_EXTRACTION_PROMPT },
      ],
    },
  ];
  return postToOpenRouter(messages, 'SpendWise Image Analyzer');
};

// ─── Text request (PDFs with text layer) ──────────────────────────────────────
const callOpenRouterText = (documentText, filename = 'document.pdf') => {
  const userMessage = `Filename: ${filename}\n\n--- PDF TEXT CONTENT START ---\n${documentText}\n--- PDF TEXT CONTENT END ---`;
  const messages = [
    {
      role: 'user',
      content: [
        { type: 'text', text: TEXT_EXTRACTION_PROMPT },
        { type: 'text', text: userMessage },
      ],
    },
  ];
  return postToOpenRouter(messages, 'SpendWise PDF Analyzer');
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
 * @returns {Promise<Object>}
 */
const analyzeFinancialImage = async (base64Image, mimeType = 'image/jpeg') => {
  if (!base64Image || typeof base64Image !== 'string') {
    throw new Error('Invalid image data — base64 string required');
  }

  const cleanBase64 = base64Image.replace(/^data:[^;]+;base64,/, '');

  console.log(`[ImageAnalysis] Processing image (mime: ${mimeType}, size: ${Math.round(cleanBase64.length / 1024)}KB base64)`);

  const response = await callOpenRouterVision(cleanBase64, mimeType);

  const rawText = response?.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('Empty response from AI model');

  try {
    const result = parseExtractionResult(rawText);
    console.log(`[ImageAnalysis] Extracted — Income: ${result.totalIncome}, Expense: ${result.totalExpense}, Transactions: ${result.transactions.length}`);
    return result;
  } catch {
    console.error('[ImageAnalysis] JSON parse failed. Raw response:', rawText.substring(0, 300));
    throw new Error('Could not parse financial data from the image. Please try a clearer photo.');
  }
};

/**
 * Analyse plain text extracted from a PDF financial document.
 * PDFs are handled client-side with pdfjs-dist to avoid OpenRouter's paid
 * file-upload requirement.
 *
 * @param {string} text      — raw text extracted from the PDF pages
 * @param {string} filename  — original filename for AI context
 * @returns {Promise<Object>}
 */
const analyzeFinancialText = async (text, filename = 'document.pdf') => {
  if (!text || typeof text !== 'string' || text.trim().length === 0) {
    throw new Error('No text content provided for analysis');
  }

  console.log(`[ImageAnalysis] Processing PDF text (file: ${filename}, chars: ${text.length})`);

  const response = await callOpenRouterText(text, filename);

  const rawText = response?.choices?.[0]?.message?.content;
  if (!rawText) throw new Error('Empty response from AI model');

  try {
    const result = parseExtractionResult(rawText);
    console.log(`[ImageAnalysis] PDF extracted — Income: ${result.totalIncome}, Expense: ${result.totalExpense}, Transactions: ${result.transactions.length}`);
    return result;
  } catch {
    console.error('[ImageAnalysis] JSON parse failed. Raw response:', rawText.substring(0, 300));
    throw new Error('Could not parse financial data from the PDF. Please ensure the document contains readable text.');
  }
};

module.exports = { analyzeFinancialImage, analyzeFinancialText };
