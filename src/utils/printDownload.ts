import jsPDF from 'jspdf';
import { toPng } from 'html-to-image';

/**
 * Utility for downloading ready-to-print formatted documents (PDF/CSV/Excel)
 * with high-fidelity styling matching the web preview.
 */

// Universal CSV Exporter with UTF-8 BOM for Microsoft Excel & Google Sheets compatibility
export function downloadCsvFile(
  filename: string,
  headers: string[],
  rows: (string | number | boolean | null | undefined)[][]
): void {
  const escapeCell = (val: string | number | boolean | null | undefined): string => {
    if (val === null || val === undefined) return '""';
    const str = String(val);
    if (str.includes('"') || str.includes(',') || str.includes('\n') || str.includes('\r')) {
      return `"${str.replace(/"/g, '""')}"`;
    }
    return `"${str}"`;
  };

  const headerLine = headers.map(escapeCell).join(',');
  const rowLines = rows.map((r) => r.map(escapeCell).join(','));
  const csvContent = '\uFEFF' + [headerLine, ...rowLines].join('\r\n');

  const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanFilename = filename.endsWith('.csv') ? filename : `${filename}.csv`;
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

/**
 * DIRECT HIGH-FIDELITY PDF DOWNLOADER
 * Captures HTML elements with native browser rendering (supporting OKLCH & Tailwind v4).
 * For multi-page tables/reports, it intelligently paginates along table row & section boundaries
 * so NO row or text is ever sliced across the middle of a page, with NO page limit.
 */
export async function downloadElementAsPdf(
  element: HTMLElement | null,
  filename: string,
  options: { orientation?: 'portrait' | 'landscape'; format?: string } = {}
): Promise<void> {
  if (!element) {
    console.error('downloadElementAsPdf: Element target is null');
    return;
  }

  const cleanFilename = filename.endsWith('.pdf') ? filename : `${filename}.pdf`;

  // Detect orientation
  const isLandscape = 
    options.orientation === 'landscape' || 
    (!options.orientation && element.scrollWidth > 820);
  const orientation = isLandscape ? 'landscape' : 'portrait';

  // Target page width in CSS pixels
  // A4 Portrait: 210mm x 297mm (printable width with 8mm margins: 194mm => ~760px)
  // A4 Landscape: 297mm x 210mm (printable width with 8mm margins: 281mm => ~1080px)
  const targetWidth = isLandscape ? 1080 : 760;

  // Create isolated off-screen sandbox
  const sandbox = document.createElement('div');
  sandbox.style.position = 'fixed';
  sandbox.style.left = '-99999px';
  sandbox.style.top = '0';
  sandbox.style.width = `${targetWidth}px`;
  sandbox.style.zIndex = '-9999';
  sandbox.style.background = '#ffffff';
  sandbox.style.color = '#111827';
  sandbox.style.fontFamily = "'Plus Jakarta Sans', sans-serif";
  document.body.appendChild(sandbox);

  try {
    // Clone target element
    const clone = element.cloneNode(true) as HTMLElement;
    clone.style.width = `${targetWidth}px`;
    clone.style.maxWidth = 'none';
    clone.style.maxHeight = 'none';
    clone.style.height = 'auto';
    clone.style.overflow = 'visible';
    clone.style.border = 'none';
    clone.style.boxShadow = 'none';
    clone.style.margin = '0';
    clone.style.padding = '0';

    // Remove any inner scrollbars or max heights
    const allDescendants = clone.querySelectorAll('*');
    allDescendants.forEach((node) => {
      const el = node as HTMLElement;
      if (el.style) {
        el.style.maxHeight = 'none';
        el.style.overflow = 'visible';
      }
    });

    sandbox.appendChild(clone);

    // Ensure fonts and styles are fully loaded and computed
    if (document.fonts) {
      await document.fonts.ready;
    }
    await new Promise((r) => setTimeout(r, 60));

    // Capture the complete element with native visual fidelity
    const pixelRatio = 2.5;
    const imgData = await toPng(clone, {
      quality: 1,
      pixelRatio: pixelRatio,
      backgroundColor: '#ffffff',
      cacheBust: true,
    });

    const img = new Image();
    img.src = imgData;
    await new Promise((resolve, reject) => {
      img.onload = () => resolve(true);
      img.onerror = (e) => reject(e);
    });

    // Initialize jsPDF instance
    const pdf = new jsPDF({
      orientation: orientation,
      unit: 'mm',
      format: options.format || 'a4',
      compress: true,
    });

    const pdfWidth = pdf.internal.pageSize.getWidth();
    const pdfHeight = pdf.internal.pageSize.getHeight();
    const margin = 8; // 8mm margin
    const imgWidthMm = pdfWidth - margin * 2;
    const pageAvailableHeightMm = pdfHeight - margin * 2;

    const imgWidthPx = img.naturalWidth || img.width;
    const imgHeightPx = img.naturalHeight || img.height;

    const totalHeightMm = (imgHeightPx * imgWidthMm) / imgWidthPx;

    // CASE 1: Single page document (fits on 1 page with slight tolerance)
    if (totalHeightMm <= pageAvailableHeightMm + 8) {
      const finalHeightMm = Math.min(totalHeightMm, pageAvailableHeightMm);
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidthMm, finalHeightMm, undefined, 'FAST');
      pdf.save(cleanFilename);
      return;
    }

    // CASE 2: Multi-Page Document
    // Uses smart row-boundary slicing so NO row or text is cut in half,
    // preserves 100% of Kop, metadata, tables, deductions, totals, terbilang, and signatures,
    // and cleanly repeats table header on continuation pages.
    const cloneRect = clone.getBoundingClientRect();
    const domHeight = clone.scrollHeight || clone.offsetHeight || 1;
    const scale = imgHeightPx / domHeight;

    // Detect primary table and its thead for continuation repeating
    const primaryTable = clone.querySelector('table');
    let theadSlice: { yStart: number; height: number } | null = null;
    let tableBottomPx = 0;

    if (primaryTable) {
      const thead = primaryTable.querySelector('thead');
      if (thead) {
        const theadRect = thead.getBoundingClientRect();
        const yStart = Math.round((theadRect.top - cloneRect.top) * scale);
        const yEnd = Math.round((theadRect.bottom - cloneRect.top) * scale);
        theadSlice = { yStart, height: yEnd - yStart };
      }
      const tRect = primaryTable.getBoundingClientRect();
      tableBottomPx = Math.round((tRect.bottom - cloneRect.top) * scale);
    }

    // Gather safe horizontal break points (bottoms of table rows and sections)
    const safeBreaksDom: number[] = [];

    clone.querySelectorAll('tr').forEach((tr) => {
      const rect = tr.getBoundingClientRect();
      const bottom = rect.bottom - cloneRect.top;
      if (bottom > 0 && bottom < domHeight) {
        safeBreaksDom.push(bottom);
      }
    });

    clone.querySelectorAll('div, table, section, form, h1, h2, h3, p').forEach((el) => {
      const rect = el.getBoundingClientRect();
      const bottom = rect.bottom - cloneRect.top;
      if (bottom > 0 && bottom < domHeight) {
        safeBreaksDom.push(bottom);
      }
    });

    const safeBreaksImg = Array.from(new Set(safeBreaksDom))
      .map((y) => Math.round(y * scale))
      .filter((y) => y > 0 && y < imgHeightPx)
      .sort((a, b) => a - b);

    const maxSliceHeightPx = Math.floor(pageAvailableHeightMm * (imgWidthPx / imgWidthMm));

    let currentY = 0;
    const pageCanvases: HTMLCanvasElement[] = [];

    while (currentY < imgHeightPx) {
      // Check if this page starts inside the primary table body
      const isInsideTable =
        Boolean(theadSlice) &&
        currentY > ((theadSlice?.yStart || 0) + (theadSlice?.height || 0)) &&
        currentY < tableBottomPx - 20;

      const theadRepeatHeight = isInsideTable && theadSlice ? theadSlice.height : 0;
      const availableHeightPx = maxSliceHeightPx - theadRepeatHeight;
      const targetBottom = currentY + availableHeightPx;

      let cutY = targetBottom;
      if (targetBottom >= imgHeightPx) {
        cutY = imgHeightPx;
      } else {
        // Find best break point between 60% and 100% of available page height
        const candidates = safeBreaksImg.filter(
          (b) => b <= targetBottom && b >= currentY + availableHeightPx * 0.60
        );
        if (candidates.length > 0) {
          cutY = candidates[candidates.length - 1];
        } else {
          // Fallback: any safe break <= targetBottom
          const fallbackCandidates = safeBreaksImg.filter(
            (b) => b <= targetBottom && b > currentY + 40
          );
          if (fallbackCandidates.length > 0) {
            cutY = fallbackCandidates[fallbackCandidates.length - 1];
          }
        }
      }

      const sliceHeight = cutY - currentY;
      if (sliceHeight <= 0) break;

      // Construct canvas slice for this page
      const pageCanvas = document.createElement('canvas');
      pageCanvas.width = imgWidthPx;
      pageCanvas.height = sliceHeight + theadRepeatHeight;

      const ctx = pageCanvas.getContext('2d');
      if (ctx) {
        ctx.fillStyle = '#ffffff';
        ctx.fillRect(0, 0, pageCanvas.width, pageCanvas.height);

        let drawOffsetY = 0;
        // Repeat table header cleanly at the top of continued table pages
        if (theadRepeatHeight > 0 && theadSlice) {
          ctx.drawImage(
            img,
            0, theadSlice.yStart, imgWidthPx, theadSlice.height,
            0, 0, imgWidthPx, theadSlice.height
          );
          drawOffsetY = theadSlice.height;
        }

        // Draw the slice content
        ctx.drawImage(
          img,
          0, currentY, imgWidthPx, sliceHeight,
          0, drawOffsetY, imgWidthPx, sliceHeight
        );
      }

      pageCanvases.push(pageCanvas);
      currentY = cutY;
    }

    const totalPages = pageCanvases.length;

    for (let i = 0; i < totalPages; i++) {
      if (i > 0) {
        pdf.addPage();
      }

      const pCanvas = pageCanvases[i];
      const pImgData = pCanvas.toDataURL('image/png');
      const sliceHeightMm = (pCanvas.height * imgWidthMm) / imgWidthPx;

      pdf.addImage(pImgData, 'PNG', margin, margin, imgWidthMm, sliceHeightMm, undefined, 'FAST');

      // Add subtle footer page number for multi-page documents
      if (totalPages > 1) {
        pdf.setFontSize(8);
        pdf.setTextColor(140, 140, 140);
        pdf.text(
          `Halaman ${i + 1} dari ${totalPages}`,
          pdfWidth - margin,
          pdfHeight - 4,
          { align: 'right' }
        );
      }
    }

    pdf.save(cleanFilename);
  } catch (err) {
    console.error('Failed to generate high-fidelity PDF:', err);
    // Fallback: trigger print dialog directly
    printHtmlElementDirectly(element, filename.replace(/\.pdf$/i, ''));
  } finally {
    if (document.body.contains(sandbox)) {
      document.body.removeChild(sandbox);
    }
  }
}

/**
 * DIRECT ELEMENT PRINTER
 * Prints an HTML element directly using an isolated iframe with complete print CSS rules.
 */
export function printHtmlElementDirectly(element: HTMLElement | null, docTitle: string = 'Dokumen'): void {
  if (!element) {
    window.print();
    return;
  }

  const isLandscape = element.scrollWidth > 820;

  const iframe = document.createElement('iframe');
  iframe.style.position = 'fixed';
  iframe.style.right = '0';
  iframe.style.bottom = '0';
  iframe.style.width = '0';
  iframe.style.height = '0';
  iframe.style.border = '0';
  document.body.appendChild(iframe);

  const doc = iframe.contentWindow?.document;
  if (!doc) {
    window.print();
    return;
  }

  // Clone element content
  const clone = element.cloneNode(true) as HTMLElement;
  clone.style.maxHeight = 'none';
  clone.style.overflow = 'visible';
  clone.style.border = 'none';
  clone.style.boxShadow = 'none';

  const content = clone.outerHTML;

  doc.open();
  doc.write(`
    <!DOCTYPE html>
    <html lang="id">
    <head>
      <meta charset="UTF-8">
      <title>${docTitle}</title>
      <script src="https://cdn.tailwindcss.com"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
        * {
          box-sizing: border-box;
          -webkit-print-color-adjust: exact !important;
          print-color-adjust: exact !important;
        }
        body {
          font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
          margin: 0;
          padding: 8mm;
          background: #ffffff;
          color: #111827;
          -webkit-font-smoothing: antialiased;
        }
        table {
          page-break-inside: auto;
          width: 100%;
        }
        tr {
          page-break-inside: avoid;
          break-inside: avoid;
        }
        thead {
          display: table-header-group;
        }
        tfoot {
          display: table-footer-group;
        }
        @page {
          size: ${isLandscape ? 'landscape' : 'portrait'};
          margin: 8mm;
        }
        @media print {
          body {
            padding: 0 !important;
          }
        }
      </style>
    </head>
    <body>
      ${content}
    </body>
    </html>
  `);
  doc.close();

  iframe.contentWindow?.focus();
  setTimeout(() => {
    iframe.contentWindow?.print();
    setTimeout(() => {
      if (document.body.contains(iframe)) {
        document.body.removeChild(iframe);
      }
    }, 1500);
  }, 400);
}

// Fallback HTML downloader if ever explicitly requested
export function downloadHtmlDocument(
  filename: string,
  title: string,
  bodyHtml: string,
  extraCss: string = ''
): void {
  const fullHtml = `<!DOCTYPE html>
<html lang="id">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <script src="https://cdn.tailwindcss.com"></script>
  <style>
    @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800&family=JetBrains+Mono:wght@500;700&display=swap');
    * {
      box-sizing: border-box;
      -webkit-print-color-adjust: exact !important;
      print-color-adjust: exact !important;
    }
    body {
      font-family: 'Plus Jakarta Sans', -apple-system, BlinkMacSystemFont, sans-serif;
      background-color: #f3f4f6;
      color: #111827;
      margin: 0;
      padding: 24px;
      display: flex;
      flex-direction: column;
      align-items: center;
      min-height: 100vh;
    }
    .doc-container {
      background: #ffffff;
      border: 1px solid #e5e7eb;
      padding: 32px;
      max-width: 860px;
      width: 100%;
    }
    @page {
      size: auto;
      margin: 10mm;
    }
    @media print {
      body {
        background: #ffffff !important;
        padding: 0 !important;
      }
      .doc-container {
        border: none !important;
        padding: 0 !important;
      }
    }
    ${extraCss}
  </style>
</head>
<body>
  <div class="doc-container">
    <div>${bodyHtml}</div>
  </div>
</body>
</html>`;

  const blob = new Blob([fullHtml], { type: 'text/html;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  const cleanFilename = filename.endsWith('.html') ? filename : `${filename}.html`;
  link.setAttribute('download', cleanFilename);
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}

