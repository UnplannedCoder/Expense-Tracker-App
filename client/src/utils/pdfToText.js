/**
 * pdfToText.js
 * ─────────────────────────────────────────────────────────────────────────────
 * Extracts all text content from a PDF File object using pdfjs-dist.
 * Returns a plain string with all page text concatenated.
 *
 * pdfjs-dist is dynamically imported so it is NOT included in the initial
 * bundle — it is only downloaded the first time a user uploads a PDF file.
 * ─────────────────────────────────────────────────────────────────────────────
 */

/**
 * @param {File} file  — a PDF File object from an <input type="file">
 * @returns {Promise<string>}  — full extracted text, pages separated by newlines
 */
export const pdfToText = async (file) => {
  // Dynamic import: pdfjs-dist (~3 MB) is fetched on demand, not at startup
  const [pdfjsLib, { default: workerUrl }] = await Promise.all([
    import("pdfjs-dist"),
    import("pdfjs-dist/build/pdf.worker.mjs?url"),
  ]);

  pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

  const arrayBuffer = await file.arrayBuffer();
  const pdf = await pdfjsLib.getDocument({ data: arrayBuffer }).promise;

  const pageTexts = [];
  for (let i = 1; i <= pdf.numPages; i++) {
    const page = await pdf.getPage(i);
    const content = await page.getTextContent();
    const pageText = content.items.map((item) => item.str).join(" ");
    pageTexts.push(pageText);
  }

  return pageTexts.join("\n\n");
};
