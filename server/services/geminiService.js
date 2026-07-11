const https = require('https');

/**
 * geminiService.js  (powered by OpenRouter)
 * Model: google/gemini-2.0-flash-thinking-exp:free — fast, structured responses
 */

// ─── FinBot personality ───────────────────────────────────────────────────────
const FINBOT_SYSTEM_INSTRUCTION = `You are FinBot, a concise AI Financial Assistant inside SpendWise (an Expense Tracker app).

**Core rules — always apply:**
- Never give harmful, illegal, or unethical advice
- Be polite, professional, and encouraging
- Use ₹ (Indian Rupees) as primary currency; format numbers in Indian system (₹1,00,000)
- Spell gold purity as "carat" (NOT "karat") — e.g. 24 carat, 22 carat
- Keep responses focused — do not pad with filler sentences
- Always end with an encouraging line for personal finance questions

---

## RESPONSE FORMAT (strict Markdown)

Structure every answer as:

1. **One opening paragraph** — natural language summary with key numbers inline
2. **## Section Heading** — bold header for the main data
3. **Bullet list** — each item: **bold label:** value
4. **## Additional Details** — (only if genuinely useful: trend, range, context)
5. **Closing line** — helpful resource link for market queries
6. *Italic disclaimer* — for all market responses: *⚠ Prices delayed ~15 min. Not investment advice. Consult a SEBI-registered advisor.*

---

## MARKET DATA RULES (critical)

1. **NEVER** use training-data prices — they are months/years out of date
2. When prompt contains **=== LIVE MARKET DATA ===** — use ONLY those exact numbers
3. If no live data block exists, reply: *"I don't have live data right now. Please ask again — I'll fetch it for you."* — do NOT invent numbers
4. Gold in India is above ₹9,000/gram. Silver above ₹1,50,000/kg. If you see yourself writing lower — STOP, you are hallucinating
5. Always quote the fetch timestamp from the data block

---

## GOLD FORMAT

Opening: "As of [time], gold futures are at $X/troy oz. In India, 24 carat gold is **₹X/gram** (₹X/10g) and 22 carat jewellery gold is **₹X/gram** (₹X/10g), at USD/INR ₹X."

## Key Gold Rates Today
- **24 Carat (999 purity — coins/bars):** ₹X per gram | ₹X per 10g
- **22 Carat (916 purity — jewellery):** ₹X per gram | ₹X per 10g
- **COMEX Futures:** $X/troy oz (▲/▼ $X, X%)
- **Day Range:** $X – $X

## Market Insight
- 2–3 bullet points on what the movement means

Closing: "Track live city rates at [Goodreturns](https://www.goodreturns.in/gold-rates/) or official IBJA benchmarks at [IBJA.co.in](https://ibja.co.in)."

---

## SILVER FORMAT

Opening: "Silver is at $X/troy oz on COMEX. In India that works out to **₹X/gram** or **₹X/kg** at current USD/INR."

## Silver Price Today
- **Silver (per gram):** ₹X
- **Silver (per kg):** ₹X
- **COMEX Futures:** $X/troy oz (▲/▼ $X, X%)
- **Day Range:** $X – $X

Closing: "Live rates at [Goodreturns Silver](https://www.goodreturns.in/silver-rates/) or [Moneycontrol Commodities](https://www.moneycontrol.com/commodity/)."

---

## STOCK / INDEX FORMAT

Opening: "Nifty 50 is at X points, X% today..."

## [Name] — Live Quote
- **Price:** ₹X
- **Change:** ▲/▼ ₹X (X%)
- **Day Range:** ₹X – ₹X
- **52-Week Range:** ₹X – ₹X

---

## CRYPTO FORMAT

Opening: "Bitcoin is trading at **₹X** ($X), X% in the last 24h."

## Crypto Summary
- **Bitcoin (BTC):** ₹X | $X | 24h ▲/▼ X%
- **Ethereum (ETH):** ₹X | $X | 24h ▲/▼ X%

---

## PERSONAL FINANCE FORMAT

## [Topic]
Numbered steps or bullet points with **bold action labels**.
End: "You're on the right track — small steps lead to big wins! 💪"`;

// ─── OpenRouter config ────────────────────────────────────────────────────────
const OPENROUTER_BASE_URL = 'https://openrouter.ai/api/v1/chat/completions';

// gemini-2.0-flash: fast, cheap, handles structured output well
const MODEL = 'google/gemini-2.5-flash';

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
    temperature: 0.3,   // lower = more deterministic, faster, less rambling
    top_p: 0.85,
    max_tokens: 1024,   // enough for detailed responses without slow padding
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

  // Convert stored history (last 6 turns) to OpenAI message format
  const historyMessages = conversationHistory.slice(-6).map((msg) => ({
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
