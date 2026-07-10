const https = require('https');

/**
 * geminiService.js  (now powered by OpenRouter)
 * -----------------------------------------------
 * Replaces the @google/genai SDK with direct calls to the
 * OpenRouter API, which is fully OpenAI-compatible.
 *
 * Model used: google/gemini-2.0-flash-exp:free
 * OpenRouter routes this to Google Gemini automatically.
 * No SDK required — pure HTTPS fetch keeps zero new dependencies.
 */

// ─── FinBot personality ───────────────────────────────────────────────────────
const FINBOT_SYSTEM_INSTRUCTION = `You are FinBot, an intelligent AI Financial Assistant inside an Expense Tracker application called SpendWise.

Your responsibilities include:
- Budget planning and recommendations
- Expense analysis and breakdowns
- Saving suggestions and money-saving tips
- Spending insights and patterns
- Financial education and guidance
- Monthly and yearly summaries
- Category recommendations
- Personal finance guidance
- Financial health scoring
- Unusual spending detection and alerts

Rules you must follow:
- Never answer harmful, illegal, or unethical requests
- Never generate illegal financial advice
- Always respond politely and in a friendly, professional tone
- Keep answers concise and actionable
- Use bullet points whenever listing items or giving tips
- Use Indian Rupees (₹) as the currency symbol
- If expense data is provided in the prompt, always use it before giving generic suggestions
- Format numbers with commas for Indian number system (e.g., ₹1,00,000)
- When you detect overspending, be empathetic and constructive
- Always end with an encouraging note when appropriate`;

// ─── OpenRouter config ────────────────────────────────────────────────────────
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

// OpenRouter's free auto-routing model — picks the best available free provider
const MODEL = 'openrouter/free';

/**
 * Lightweight HTTPS POST helper — avoids adding axios/node-fetch
 * as a new dependency since Node 18+ has native fetch available.
 * Falls back to https module for Node < 18 compatibility.
 */
const callOpenRouter = async (messages) => {
  const apiKey = process.env.OPENROUTER_API_KEY;
  if (!apiKey) {
    throw new Error('OPENROUTER_API_KEY is not set in environment variables. Add it to server/.env');
  }

  const body = JSON.stringify({
    model: MODEL,
    messages,
    temperature: 0.7,
    top_p: 0.9,
    max_tokens: 1024,
  });

  // Use native fetch if available (Node 18+), otherwise fall back to https module
  if (typeof fetch !== 'undefined') {
    const res = await fetch(OPENROUTER_BASE_URL, {
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'SpendWise FinBot',
      },
      body,
    });

    const data = await res.json();

    if (!res.ok) {
      const errMsg = data?.error?.message || `HTTP ${res.status}`;
      const errCode = data?.error?.code || res.status;
      throw Object.assign(new Error(JSON.stringify({ error: { code: errCode, message: errMsg, status: data?.error?.type || String(res.status) } })), { status: res.status });
    }

    return data;
  }

  // Node < 18 fallback using built-in https module
  return new Promise((resolve, reject) => {
    const url = new URL(OPENROUTER_BASE_URL);
    const options = {
      hostname: url.hostname,
      path: url.pathname,
      method: 'POST',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(body),
        'HTTP-Referer': 'http://localhost:5173',
        'X-Title': 'SpendWise FinBot',
      },
    };

    const req = https.request(options, (res) => {
      let raw = '';
      res.on('data', (chunk) => (raw += chunk));
      res.on('end', () => {
        try {
          const data = JSON.parse(raw);
          if (res.statusCode >= 400) {
            const errMsg = data?.error?.message || `HTTP ${res.statusCode}`;
            reject(Object.assign(new Error(JSON.stringify({ error: { code: res.statusCode, message: errMsg, status: String(res.statusCode) } })), { status: res.statusCode }));
          } else {
            resolve(data);
          }
        } catch {
          reject(new Error(`Failed to parse OpenRouter response: ${raw.substring(0, 200)}`));
        }
      });
    });

    req.on('error', reject);
    req.write(body);
    req.end();
  });
};

/**
 * Maps a user-friendly error from an OpenRouter/network failure.
 */
const parseError = (error) => {
  let apiError = null;
  try {
    apiError = JSON.parse(error.message)?.error;
  } catch { /* not JSON */ }

  const code = apiError?.code || error.status;
  const status = apiError?.status || '';
  const message = apiError?.message || error.message || '';

  console.error('[FinBot Error]', { code, status, message: message.substring(0, 200) });

  if (message.includes('API key') || message.includes('Unauthorized') || code === 401) {
    return new Error('FinBot setup error: Invalid OpenRouter API key. Please check OPENROUTER_API_KEY in server/.env');
  }
  if (code === 429 || message.includes('rate limit') || message.includes('quota')) {
    return new Error('FinBot is temporarily busy. Please try again in a moment.');
  }
  if (code === 402 || message.includes('insufficient') || message.includes('credits')) {
    return new Error('FinBot service error: OpenRouter credits exhausted. Please top up at openrouter.ai');
  }
  if (message.includes('SAFETY')) {
    return new Error('I cannot respond to that request. Please ask me about your finances.');
  }

  const isDev = process.env.NODE_ENV !== 'production';
  return new Error(isDev ? `FinBot error (${code}): ${message.substring(0, 150)}` : 'FinBot encountered an error. Please try again.');
};

/**
 * Sends a message to FinBot via OpenRouter and returns the AI reply.
 *
 * @param {string} userMessage          - The user's question
 * @param {string} financialContext     - Structured financial data block
 * @param {Array}  conversationHistory  - Previous { role, message } objects
 * @returns {Promise<string>}           - FinBot's text reply
 */
const sendMessageToGemini = async (userMessage, financialContext, conversationHistory = []) => {
  // Build system message with FinBot personality
  const systemMessage = { role: 'system', content: FINBOT_SYSTEM_INSTRUCTION };

  // Build enriched user prompt (financial context + question)
  const enrichedPrompt = financialContext
    ? `${financialContext}\n\nUser Question: "${userMessage}"`
    : userMessage;

  // Convert stored history (last 10 turns) to OpenAI message format
  const historyMessages = conversationHistory.slice(-10).map((msg) => ({
    role: msg.role === 'model' ? 'assistant' : 'user',
    content: msg.message,
  }));

  const messages = [
    systemMessage,
    ...historyMessages,
    { role: 'user', content: enrichedPrompt },
  ];

  try {
    const data = await callOpenRouter(messages);

    const text = data?.choices?.[0]?.message?.content;
    if (!text) {
      throw new Error('Empty response received from FinBot');
    }
    return text.trim();
  } catch (error) {
    throw parseError(error);
  }
};

module.exports = { sendMessageToGemini };
