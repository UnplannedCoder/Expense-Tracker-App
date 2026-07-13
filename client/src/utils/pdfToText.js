/**
 * pdfToText.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Extracts all text content from a PDF File object using pdfjs-dist.
 * Returns a plain string with all page text concatenated.
 * ─────────────────────────────────────────────────────────────────────────────
 */

import * as pdfjsLib from 'pdfjs-dist';

// Point the worker at the bundled asset via Vite's asset handling
import workerUrl from 'pdfjs-dist/build/pdf.worker.mjs?url';
pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

/**
 * @param {File} file  — a PDF File object from an <input type="file">
 * @returns {Promise<string>}  — full extracted text, pages separated by newlines
 */
export const pdfToText = async (file) => {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(' ');
    pageTexts.push(pageText);
  }

  return pageTexts.join('\n\n');
};
