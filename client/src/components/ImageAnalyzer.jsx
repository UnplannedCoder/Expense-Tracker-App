import React, { useState, useRef, useCallback } from 'react';
import {
  FaUpload, FaCamera, FaTimes, FaSpinner, FaCheckCircle,
  FaExclamationTriangle, FaChevronDown, FaChevronUp,
  FaWallet, FaArrowUp, FaArrowDown, FaPiggyBank, FaRedo,
  FaFileImage, FaFilePdf,
} from 'react-icons/fa';
import api from '../services/api';
import { pdfToText } from '../utils/pdfToText';

/**
 * ImageAnalyzer
 * ─────────────────────────────────────────────────────────────────────────────
 * Accepts a photo of a bank statement, payslip, or expense document.
 * Sends it as base64 to POST /api/v1/image/analyze (Gemini Vision).
 * Displays: Net Balance, Total Income, Total Expense, Savings Ratio + transaction list.
 * ─────────────────────────────────────────────────────────────────────────────
 */

const MAX_FILE_MB = 10;

// ── Helpers ──────────────────────────────────────────────────────────────────

const fileToBase64 = (file) =>
  new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload  = (e) => resolve(e.target.result); // full data-URI
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });

const formatINR = (amount) =>
  new Intl.NumberFormat('en-IN', {
    style: 'currency',
    currency: 'INR',
    maximumFractionDigits: 2,
  }).format(Math.abs(amount));

const DOC_TYPE_LABELS = {
  bank_statement: 'Bank Statement',
  payslip:        'Payslip / Salary Slip',
  receipt:        'Receipt / Bill',
  handwritten:    'Handwritten Note',
  other:          'Financial Document',
};

// ── Summary Card ─────────────────────────────────────────────────────────────

const SummaryCard = ({ label, value, icon: Icon, colorClass, bgClass }) => (
  <div className={`rounded-2xl border p-4 flex flex-col gap-2 ${bgClass}`}>
    <div className="flex items-center justify-between">
      <span className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
        {label}
      </span>
      <div className={`p-2 rounded-xl ${colorClass} bg-opacity-10`}>
        <Icon size={14} className={colorClass} />
      </div>
    </div>
    <p className={`text-2xl font-extrabold ${colorClass}`}>{value}</p>
  </div>
);

// ── Main Component ────────────────────────────────────────────────────────────

const ImageAnalyzer = () => {
  const [isOpen,     setIsOpen]     = useState(false);
  const [status,     setStatus]     = useState('idle'); // idle | uploading | done | error
  const [previewUrl, setPreviewUrl] = useState(null);
  const [isPdf,      setIsPdf]      = useState(false);
  const [pdfName,    setPdfName]    = useState('');
  const [result,     setResult]     = useState(null);
  const [errorMsg,   setErrorMsg]   = useState('');
  const [showTxns,   setShowTxns]   = useState(false);

  const fileInputRef   = useRef(null);
  const pdfInputRef    = useRef(null);
  const cameraInputRef = useRef(null);

  // ── Process selected file ───────────────────────────────────────────────
  const processFile = useCallback(async (file) => {
    if (!file) return;

    // Size check
    if (file.size > MAX_FILE_MB * 1024 * 1024) {
      setErrorMsg(`File is too large. Please use a file under ${MAX_FILE_MB}MB.`);
      setStatus('error');
      return;
    }

    const filePdf = file.type === 'application/pdf';
    setIsPdf(filePdf);
    setPdfName(filePdf ? file.name : '');
    setPreviewUrl(filePdf ? null : null); // will be set below for images
    setStatus('uploading');
    setErrorMsg('');
    setResult(null);

    try {
      if (filePdf) {
        // ── PDF path: extract text client-side, send as plain text ──────
        // This avoids the OpenRouter paid-tier requirement for file uploads
        let extractedText;
        try {
          extractedText = await pdfToText(file);
        } catch {
          throw new Error('Could not read this PDF. Make sure it contains selectable text (not a scanned image).');
        }

        if (!extractedText || extractedText.trim().length < 20) {
          throw new Error('This PDF appears to be a scanned image with no text layer. Please take a photo of it using "Take Photo" or "Upload Image" instead.');
        }

        const res = await api.post('/image/analyze-text', {
          text: extractedText,
          filename: file.name,
        });

        if (res.data.success) {
          setResult(res.data.data);
          setStatus('done');
        } else {
          throw new Error(res.data.message || 'Analysis failed');
        }
      } else {
        // ── Image path: base64 encode and send as vision request ─────────
        const dataUrl = await fileToBase64(file);
        setPreviewUrl(dataUrl);

        const [header, base64] = dataUrl.split(',');
        const mimeType = header.match(/data:([^;]+)/)?.[1] || 'image/jpeg';

        const res = await api.post('/image/analyze', { image: base64, mimeType });

        if (res.data.success) {
          setResult(res.data.data);
          setStatus('done');
        } else {
          throw new Error(res.data.message || 'Analysis failed');
        }
      }
    } catch (err) {
      const msg = err.response?.data?.message || err.message || 'Something went wrong. Please try again.';
      setErrorMsg(msg);
      setStatus('error');
    }
  }, []);

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    if (file) processFile(file);
    // Reset input so same file can be re-selected
    e.target.value = '';
  };

  const handleReset = () => {
    setStatus('idle');
    setPreviewUrl(null);
    setIsPdf(false);
    setPdfName('');
    setResult(null);
    setErrorMsg('');
    setShowTxns(false);
  };

  // ── Savings ratio colour ────────────────────────────────────────────────
  const savingsColor = (ratio) => {
    if (ratio >= 20) return 'text-emerald-600 dark:text-emerald-400';
    if (ratio >= 10) return 'text-amber-500 dark:text-amber-400';
    return 'text-rose-600 dark:text-rose-400';
  };

  return (
    <div className="bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 rounded-2xl shadow-sm overflow-hidden">

      {/* ── Collapsible Header ─────────────────────────────────────────── */}
      <button
        onClick={() => setIsOpen((v) => !v)}
        className="w-full flex items-center justify-between px-6 py-4 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition"
      >
        <div className="flex items-center gap-3">
          <div className="p-2 rounded-xl bg-violet-500/10 text-violet-600 dark:text-violet-400">
            <FaFileImage size={16} />
          </div>
          <div className="text-left">
            <p className="font-bold text-slate-800 dark:text-slate-100 text-sm">
              Smart Expense Analyzer
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500">
              Upload a bank statement, payslip, or receipt to auto-extract your financials
            </p>
          </div>
        </div>
        <span className="text-slate-400 dark:text-slate-500 flex-shrink-0 ml-4">
          {isOpen ? <FaChevronUp size={14} /> : <FaChevronDown size={14} />}
        </span>
      </button>

      {/* ── Expandable Body ────────────────────────────────────────────── */}
      {isOpen && (
        <div className="border-t border-slate-100 dark:border-slate-800 p-6 space-y-5 animate-fade-in">

          {/* IDLE — upload buttons */}
          {status === 'idle' && (
            <>
              <p className="text-sm text-slate-500 dark:text-slate-400">
                Upload a photo of your bank statement, salary slip, or a bundle of receipts.
                Our AI will extract all income and expense data automatically.
              </p>
              <div className="grid grid-cols-3 gap-3">
                {/* Camera */}
                <button
                  onClick={() => cameraInputRef.current?.click()}
                  className="flex flex-col items-center gap-2.5 py-7 rounded-2xl border-2 border-dashed border-violet-200 dark:border-violet-800 text-violet-600 dark:text-violet-400 hover:bg-violet-50 dark:hover:bg-violet-950/30 transition text-sm font-medium"
                >
                  <FaCamera size={22} />
                  <span>Take Photo</span>
                </button>
                <input ref={cameraInputRef} type="file" accept="image/*" capture="environment" className="hidden" onChange={handleFileChange} />

                {/* Image upload */}
                <button
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2.5 py-7 rounded-2xl border-2 border-dashed border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition text-sm font-medium"
                >
                  <FaUpload size={22} />
                  <span>Upload Image</span>
                </button>
                <input ref={fileInputRef} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={handleFileChange} />

                {/* PDF upload */}
                <button
                  onClick={() => pdfInputRef.current?.click()}
                  className="flex flex-col items-center gap-2.5 py-7 rounded-2xl border-2 border-dashed border-rose-200 dark:border-rose-800 text-rose-500 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition text-sm font-medium"
                >
                  <FaFilePdf size={22} />
                  <span>Upload PDF</span>
                </button>
                <input ref={pdfInputRef} type="file" accept="application/pdf" className="hidden" onChange={handleFileChange} />
              </div>
              <p className="text-xs text-center text-slate-400 dark:text-slate-500">
                Supports JPG, PNG, WebP, PDF · Max {MAX_FILE_MB}MB · Powered by Gemini Vision AI
              </p>
            </>
          )}

          {/* UPLOADING — spinner */}
          {status === 'uploading' && (
            <div className="space-y-4 text-center py-4">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="mx-auto max-h-44 w-full object-contain rounded-xl border border-slate-200 dark:border-slate-700" />
              ) : isPdf && (
                <div className="mx-auto flex flex-col items-center justify-center gap-2 max-h-44 h-32 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400">
                  <FaFilePdf size={36} />
                  <p className="text-xs font-medium truncate max-w-[200px]">{pdfName}</p>
                </div>
              )}
              <div className="flex items-center justify-center gap-2 text-violet-600 dark:text-violet-400 font-medium text-sm">
                <FaSpinner className="animate-spin" size={16} />
                <span>Analysing your document with AI...</span>
              </div>
              <p className="text-xs text-slate-400 dark:text-slate-500">This usually takes 5–15 seconds</p>
            </div>
          )}

          {/* ERROR */}
          {status === 'error' && (
            <div className="space-y-4">
              {previewUrl ? (
                <img src={previewUrl} alt="Preview" className="mx-auto max-h-44 w-full object-contain rounded-xl border border-slate-200 dark:border-slate-700" />
              ) : isPdf && (
                <div className="mx-auto flex flex-col items-center justify-center gap-2 max-h-44 h-32 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400">
                  <FaFilePdf size={36} />
                  <p className="text-xs font-medium truncate max-w-[200px]">{pdfName}</p>
                </div>
              )}
              <div className="flex items-start gap-2 text-rose-600 dark:text-rose-400 text-sm font-medium bg-rose-50 dark:bg-rose-950/30 border border-rose-100 dark:border-rose-900/30 rounded-xl px-4 py-3">
                <FaExclamationTriangle size={14} className="mt-0.5 flex-shrink-0" />
                <span>{errorMsg}</span>
              </div>
              <button onClick={handleReset} className="w-full py-2.5 rounded-xl text-sm font-semibold bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 hover:bg-slate-200 dark:hover:bg-slate-700 transition flex items-center justify-center gap-2">
                <FaRedo size={12} /> Try Again
              </button>
            </div>
          )}

          {/* DONE — results */}
          {status === 'done' && result && (
            <div className="space-y-5">
              {/* Document info */}
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-emerald-600 dark:text-emerald-400 text-xs font-semibold">
                  <FaCheckCircle size={13} />
                  <span>Analysis complete — {DOC_TYPE_LABELS[result.documentType] || 'Document'}</span>
                  {result.period && (
                    <span className="text-slate-400 dark:text-slate-500 font-normal">· {result.period}</span>
                  )}
                </div>
                <button
                  onClick={handleReset}
                  title="Analyse another image"
                  className="text-slate-400 hover:text-slate-600 dark:hover:text-slate-200 transition p-1"
                >
                  <FaTimes size={14} />
                </button>
              </div>

              {/* Preview thumbnail */}
              {previewUrl ? (
                <img src={previewUrl} alt="Analysed document" className="w-full max-h-36 object-contain rounded-xl border border-slate-200 dark:border-slate-700" />
              ) : isPdf && (
                <div className="flex items-center gap-3 px-4 py-3 rounded-xl border border-rose-200 dark:border-rose-800 bg-rose-50 dark:bg-rose-950/20 text-rose-500 dark:text-rose-400">
                  <FaFilePdf size={22} className="flex-shrink-0" />
                  <p className="text-xs font-medium truncate">{pdfName}</p>
                </div>
              )}

              {/* 4 summary cards */}
              <div className="grid grid-cols-2 gap-3">
                <SummaryCard
                  label="Total Income"
                  value={formatINR(result.totalIncome)}
                  icon={FaArrowUp}
                  colorClass="text-emerald-600 dark:text-emerald-400"
                  bgClass="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
                <SummaryCard
                  label="Total Expense"
                  value={formatINR(result.totalExpense)}
                  icon={FaArrowDown}
                  colorClass="text-rose-600 dark:text-rose-400"
                  bgClass="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
                <SummaryCard
                  label="Net Balance"
                  value={formatINR(result.netBalance)}
                  icon={FaWallet}
                  colorClass={result.netBalance >= 0 ? 'text-indigo-600 dark:text-indigo-400' : 'text-rose-600 dark:text-rose-400'}
                  bgClass="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
                <SummaryCard
                  label="Savings Ratio"
                  value={`${result.savingsRatio.toFixed(1)}%`}
                  icon={FaPiggyBank}
                  colorClass={savingsColor(result.savingsRatio)}
                  bgClass="bg-white dark:bg-slate-800 border-slate-200 dark:border-slate-700"
                />
              </div>

              {/* Note from AI */}
              {result.note && (
                <p className="text-xs text-slate-400 dark:text-slate-500 italic bg-slate-50 dark:bg-slate-800/60 px-4 py-2.5 rounded-xl border border-slate-100 dark:border-slate-700">
                  💡 {result.note}
                </p>
              )}

              {/* Transactions accordion */}
              {result.transactions?.length > 0 && (
                <div>
                  <button
                    onClick={() => setShowTxns((v) => !v)}
                    className="w-full flex items-center justify-between text-sm font-semibold text-slate-700 dark:text-slate-200 py-2 border-t border-slate-100 dark:border-slate-800"
                  >
                    <span>Extracted Transactions ({result.transactions.length})</span>
                    {showTxns ? <FaChevronUp size={12} /> : <FaChevronDown size={12} />}
                  </button>

                  {showTxns && (
                    <div className="mt-2 space-y-2 max-h-64 overflow-y-auto pr-1">
                      {result.transactions.map((tx, idx) => (
                        <div
                          key={idx}
                          className="flex items-center justify-between py-2.5 px-3 rounded-xl bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-700"
                        >
                          <div className="flex items-center gap-2.5 min-w-0">
                            <div className={`p-1.5 rounded-lg flex-shrink-0 ${tx.type === 'income' ? 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400' : 'bg-rose-500/10 text-rose-600 dark:text-rose-400'}`}>
                              {tx.type === 'income' ? <FaArrowUp size={10} /> : <FaArrowDown size={10} />}
                            </div>
                            <div className="min-w-0">
                              <p className="text-xs font-semibold text-slate-700 dark:text-slate-200 truncate">{tx.description || tx.category}</p>
                              <p className="text-xs text-slate-400 dark:text-slate-500">{tx.category}{tx.date ? ` · ${tx.date}` : ''}</p>
                            </div>
                          </div>
                          <span className={`text-xs font-bold flex-shrink-0 ml-2 ${tx.type === 'income' ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-600 dark:text-rose-400'}`}>
                            {tx.type === 'income' ? '+' : '-'}{formatINR(tx.amount)}
                          </span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              )}

              {/* Analyse another */}
              <button
                onClick={handleReset}
                className="w-full py-2.5 rounded-xl text-sm font-semibold border border-slate-200 dark:border-slate-700 text-slate-500 dark:text-slate-400 hover:bg-slate-50 dark:hover:bg-slate-800 transition flex items-center justify-center gap-2"
              >
                <FaRedo size={12} /> Analyse Another Document
              </button>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default ImageAnalyzer;
