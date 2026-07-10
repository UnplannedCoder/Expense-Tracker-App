import React, { useState, useRef, useCallback } from 'react';
import { createWorker } from 'tesseract.js';
import {
  FaCamera,
  FaUpload,
  FaTimes,
  FaSpinner,
  FaCheckCircle,
  FaReceipt,
  FaExclamationTriangle,
} from 'react-icons/fa';

/**
 * ReceiptScanner
 * Tesseract.js-powered OCR component.
 *
 * Props:
 *   onExtracted({ amount, description, date, category, rawText, imageDataUrl })
 *     — called when OCR finishes and data has been parsed
 *   onClose() — called when the scanner panel is dismissed
 *
 * The component tries to extract:
 *   - Total amount  (largest number near "total", "amount", "grand total", etc.)
 *   - Date          (common date patterns)
 *   - Description   (merchant name heuristic from first non-empty line)
 *   - Category      (keyword matching against category keywords)
 */

// ── OCR parsing helpers ───────────────────────────────────────────────────────

const CATEGORY_KEYWORDS = {
  Food:          ['restaurant', 'food', 'pizza', 'burger', 'cafe', 'coffee', 'bistro', 'diner', 'eat', 'meal', 'lunch', 'dinner', 'breakfast', 'swiggy', 'zomato'],
  Grocery:       ['grocery', 'supermarket', 'market', 'mart', 'fresh', 'vegetables', 'fruits', 'dmart', 'bigbasket', 'blinkit'],
  Shopping:      ['shop', 'store', 'mall', 'amazon', 'flipkart', 'myntra', 'retail', 'fashion', 'clothing', 'apparel'],
  Transport:     ['uber', 'ola', 'taxi', 'cab', 'transport', 'bus', 'metro', 'auto', 'ride', 'travel', 'rapido'],
  Fuel:          ['fuel', 'petrol', 'diesel', 'pump', 'hp', 'bharat petroleum', 'iocl', 'indian oil', 'gas station'],
  Bills:         ['bill', 'electricity', 'water', 'internet', 'broadband', 'wifi', 'airtel', 'jio', 'bsnl', 'vodafone', 'utility'],
  Healthcare:    ['pharmacy', 'medical', 'hospital', 'clinic', 'doctor', 'medicine', 'health', 'apollo', 'medplus'],
  Entertainment: ['cinema', 'movie', 'pvr', 'inox', 'netflix', 'spotify', 'concert', 'theatre', 'amusement'],
  Travel:        ['hotel', 'flight', 'airline', 'booking', 'airbnb', 'train', 'irctc', 'makemytrip'],
};

/**
 * Guesses a category by scanning the raw OCR text for keyword matches.
 */
const guessCategory = (text) => {
  const lower = text.toLowerCase();
  for (const [category, keywords] of Object.entries(CATEGORY_KEYWORDS)) {
    if (keywords.some((kw) => lower.includes(kw))) return category;
  }
  return 'Others';
};

/**
 * Extracts the most likely total amount from OCR text.
 * Looks for lines containing total/amount keywords then picks the number.
 * Falls back to the largest number found anywhere in the text.
 */
const extractAmount = (text) => {
  const lines = text.split('\n');

  // Priority: lines that contain total-related keywords
  const totalKeywords = /\b(total|grand total|amount|net amount|bill amount|to pay|payable|subtotal|sum)\b/i;
  const numberPattern = /[\d,]+\.?\d*/g;

  for (const line of lines) {
    if (totalKeywords.test(line)) {
      const numbers = (line.match(numberPattern) || [])
        .map((n) => parseFloat(n.replace(/,/g, '')))
        .filter((n) => !isNaN(n) && n > 0);
      if (numbers.length > 0) return Math.max(...numbers);
    }
  }

  // Fallback: largest number in the whole text (likely the bill total)
  const allNumbers = (text.match(numberPattern) || [])
    .map((n) => parseFloat(n.replace(/,/g, '')))
    .filter((n) => !isNaN(n) && n > 0 && n < 1_000_000);

  return allNumbers.length > 0 ? Math.max(...allNumbers) : 0;
};

/**
 * Extracts a date from OCR text. Tries common formats:
 *   DD/MM/YYYY, MM/DD/YYYY, DD-MM-YYYY, DD.MM.YYYY, "12 Jan 2024", ISO
 */
const extractDate = (text) => {
  const patterns = [
    // ISO: 2024-07-10
    { re: /\b(\d{4})-(\d{2})-(\d{2})\b/, fn: (m) => `${m[1]}-${m[2]}-${m[3]}` },
    // DD/MM/YYYY
    { re: /\b(\d{2})\/(\d{2})\/(\d{4})\b/, fn: (m) => `${m[3]}-${m[2]}-${m[1]}` },
    // MM/DD/YYYY
    { re: /\b(\d{2})\/(\d{2})\/(\d{4})\b/, fn: (m) => `${m[3]}-${m[1]}-${m[2]}` },
    // DD-MM-YYYY
    { re: /\b(\d{2})-(\d{2})-(\d{4})\b/, fn: (m) => `${m[3]}-${m[2]}-${m[1]}` },
    // DD.MM.YYYY
    { re: /\b(\d{2})\.(\d{2})\.(\d{4})\b/, fn: (m) => `${m[3]}-${m[2]}-${m[1]}` },
    // "12 Jan 2024" / "12 January 2024"
    {
      re: /\b(\d{1,2})\s+(Jan(?:uary)?|Feb(?:ruary)?|Mar(?:ch)?|Apr(?:il)?|May|Jun(?:e)?|Jul(?:y)?|Aug(?:ust)?|Sep(?:tember)?|Oct(?:ober)?|Nov(?:ember)?|Dec(?:ember)?)\s+(\d{4})\b/i,
      fn: (m) => {
        const months = { jan:1,feb:2,mar:3,apr:4,may:5,jun:6,jul:7,aug:8,sep:9,oct:10,nov:11,dec:12 };
        const mo = months[m[2].toLowerCase().slice(0, 3)];
        return `${m[3]}-${String(mo).padStart(2,'0')}-${String(m[1]).padStart(2,'0')}`;
      },
    },
  ];

  for (const { re, fn } of patterns) {
    const match = text.match(re);
    if (match) {
      const dateStr = fn(match);
      const d = new Date(dateStr);
      if (!isNaN(d.getTime())) return dateStr;
    }
  }

  return new Date().toISOString().split('T')[0]; // default today
};

/**
 * Guesses the merchant / description from the first meaningful line of text.
 */
const extractDescription = (text) => {
  const lines = text.split('\n').map((l) => l.trim()).filter((l) => l.length > 2);
  // Skip lines that look like just numbers or single words
  const candidate = lines.find((l) => /[a-zA-Z]/.test(l) && l.length > 4);
  if (candidate) return candidate.slice(0, 80);
  return 'Receipt';
};

// ── Component ─────────────────────────────────────────────────────────────────

const ReceiptScanner = ({ onExtracted, onClose }) => {
  const [status, setStatus]       = useState('idle'); // idle | scanning | done | error
  const [progress, setProgress]   = useState(0);
  const [previewUrl, setPreviewUrl] = useState(null);
  const [rawText, setRawText]     = useState('');
  const [parsed, setParsed]       = useState(null);
  const [errorMsg, setErrorMsg]   = useState('');

  const fileInputRef = useRef(null);
  const cameraInputRef = useRef(null);

  const processImage = useCallback(async (file) => {
    if (!file) return;

    // Show preview immediately
    const reader = new FileReader();
    reader.onload = (e) => setPreviewUrl(e.target.result);
    reader.readAsDataURL(file);

    setStatus('scanning');
    setProgress(0);
    setErrorMsg('');

    try {
      const worker = await createWorker('eng', 1, {
        logger: (m) => {
          if (m.status === 'recognizing text') {
            setProgress(Math.round(m.progress * 100));
          }
        },
      });

      const { data } = await worker.recognize(file);
      await worker.terminate();

      const text = data.text;
      setRawText(text);

      // Parse extracted data
      const amount      = extractAmount(text);
      const date        = extractDate(text);
      const description = extractDescription(text);
      const category    = guessCategory(text);

      const result = { amount, date, description, category, rawText: text };
      setParsed(result);
      setStatus('done');
    } catch (err) {
      console.error('OCR error:', err);
      setErrorMsg('Could not scan the image. Please try a clearer photo.');
      setStatus('error');
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processImage(file);
  };

  const handleUseData = () => {
    if (!parsed) return;
    onExtracted({ ...parsed, imageDataUrl: previewUrl });
  };

  const handleReset = () => {
    setStatus('idle');
    setPreviewUrl(null);
    setRawText('');
    setParsed(null);
    setErrorMsg('');
    setProgress(0);
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden animate-fade-in">
      {/* Header */}
      <div className="flex items-center justify-between px-5 py-3 border-b border-slate-100 dark:border-slate-800 bg-indigo-50 dark:bg-indigo-950/30">
        <div className="flex items-center gap-2 text-indigo-700 dark:text-indigo-300 font-semibold text-sm">
          <FaReceipt size={14} />
          <span>Receipt Scanner (OCR)</span>
        </div>
        <button
          onClick={onClose}
          className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition"
        >
          <FaTimes size={14} />
        </button>
      </div>

      <div className="p-5 space-y-4">
        {/* Upload buttons — always shown when idle or after reset */}
        {status === 'idle' && (
          <div className="flex gap-3">
            {/* Camera capture */}
            <button
              onClick={() => cameraInputRef.current?.click()}
              className="flex-1 flex flex-col items-center gap-2 py-6 border-2 border-dashed border-indigo-200 dark:border-indigo-800 rounded-xl text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/30 transition text-sm font-medium"
            >
              <FaCamera size={22} />
              <span>Take Photo</span>
            </button>
            <input
              ref={cameraInputRef}
              type="file"
              accept="image/*"
              capture="environment"
              className="hidden"
              onChange={handleFileChange}
            />

            {/* File upload */}
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex-1 flex flex-col items-center gap-2 py-6 border-2 border-dashed border-slate-200 dark:border-slate-700 rounded-xl text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-sm font-medium"
            >
              <FaUpload size={22} />
              <span>Upload Image</span>
            </button>
            <input
              ref={fileInputRef}
              type="file"
              accept="image/*"
              className="hidden"
              onChange={handleFileChange}
            />
          </div>
        )}

        {/* Scanning progress */}
        {status === 'scanning' && (
          <div className="space-y-3 text-center py-4">
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Receipt preview"
                className="w-full max-h-40 object-contain rounded-xl border border-slate-200 dark:border-slate-700"
              />
            )}
            <div className="flex items-center justify-center gap-2 text-indigo-600 dark:text-indigo-400 font-medium text-sm">
              <FaSpinner className="animate-spin" size={16} />
              <span>Scanning receipt... {progress}%</span>
            </div>
            <div className="w-full bg-slate-100 dark:bg-slate-800 rounded-full h-2 overflow-hidden">
              <div
                className="bg-indigo-500 h-full rounded-full transition-all duration-300"
                style={{ width: `${progress}%` }}
              />
            </div>
          </div>
        )}

        {/* Error state */}
        {status === 'error' && (
          <div className="space-y-3">
            <div className="flex items-center gap-2 text-rose-600 dark:text-rose-400 text-sm font-medium bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3">
              <FaExclamationTriangle size={14} />
              <span>{errorMsg}</span>
            </div>
            <button
              onClick={handleReset}
              className="w-full py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition"
            >
              Try Again
            </button>
          </div>
        )}

        {/* Done — show parsed results */}
        {status === 'done' && parsed && (
          <div className="space-y-3">
            {/* Preview thumbnail */}
            {previewUrl && (
              <img
                src={previewUrl}
                alt="Scanned receipt"
                className="w-full max-h-36 object-contain rounded-xl border border-slate-200 dark:border-slate-700"
              />
            )}

            <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
              <FaCheckCircle size={12} />
              <span>Scan complete — review extracted data below</span>
            </div>

            {/* Extracted fields — editable before applying */}
            <div className="space-y-2.5">
              <div>
                <label className="block text-xs text-slate-400 mb-1">Description</label>
                <input
                  type="text"
                  value={parsed.description}
                  onChange={(e) => setParsed({ ...parsed, description: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm outline-none transition"
                />
              </div>
              <div className="grid grid-cols-2 gap-2.5">
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Amount</label>
                  <input
                    type="number"
                    min="0"
                    step="0.01"
                    value={parsed.amount}
                    onChange={(e) => setParsed({ ...parsed, amount: parseFloat(e.target.value) || 0 })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm outline-none transition"
                  />
                </div>
                <div>
                  <label className="block text-xs text-slate-400 mb-1">Date</label>
                  <input
                    type="date"
                    value={parsed.date}
                    onChange={(e) => setParsed({ ...parsed, date: e.target.value })}
                    className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm outline-none transition"
                  />
                </div>
              </div>
              <div>
                <label className="block text-xs text-slate-400 mb-1">Category (auto-detected)</label>
                <input
                  type="text"
                  value={parsed.category}
                  onChange={(e) => setParsed({ ...parsed, category: e.target.value })}
                  className="w-full bg-slate-50 dark:bg-slate-950 border border-slate-200 dark:border-slate-800 focus:border-indigo-500 rounded-xl px-3 py-2 text-sm outline-none transition"
                />
              </div>
            </div>

            {/* Action buttons */}
            <div className="flex gap-2.5 pt-1">
              <button
                onClick={handleReset}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition"
              >
                Rescan
              </button>
              <button
                onClick={handleUseData}
                className="flex-1 py-2.5 rounded-xl text-sm font-semibold bg-indigo-600 hover:bg-indigo-500 text-white shadow-md shadow-indigo-600/20 transition"
              >
                Use This Data
              </button>
            </div>
          </div>
        )}

        <p className="text-xs text-slate-400 dark:text-slate-500 text-center">
          OCR powered by Tesseract.js · Results may need correction
        </p>
      </div>
    </div>
  );
};

export default ReceiptScanner;
