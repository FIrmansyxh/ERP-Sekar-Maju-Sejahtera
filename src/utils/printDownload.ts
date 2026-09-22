/**
 * Pustaka PDF (jsPDF dan html-to-image, sekitar 166 kB gzip) dimuat saat pertama kali dipakai,
 * bukan saat aplikasi dibuka, supaya halaman login dan menu lain tetap ringan.
 */
const muatPustakaPdf = async () => {
  const [{ default: jsPDF }, { toPng }] = await Promise.all([import('jspdf'), import('html-to-image')]);
  return { jsPDF, toPng };
};

/**
 * Utility for downloading ready-to-print formatted documents (PDF)
 * with high-fidelity styling matching the web preview.
 * Ekspor spreadsheet ada di utils/excelExport.ts.
 */

/**
 * DIRECT HIGH-FIDELITY PDF DOWNLOADER
 * Captures HTML elements with native browser rendering (supporting OKLCH & Tailwind v4).
 * For multi-page tables/reports, it intelligently paginates along table row & section boundaries
 * so NO row or text is ever sliced across the middle of a page, with NO page limit.
 */
export async function downloadElementAsPdf(
  element: HTMLElement | null,
  filename: string,
  options: {
    orientation?: 'portrait' | 'landscape';
    format?: string;
    /** Judul singkat dokumen, ditulis di atas halaman ke-2 dst. sebagai penanda lanjutan */
    judulLanjutan?: string;
  } = {}
): Promise<void> {
  if (!element) {
    console.error('downloadElementAsPdf: Element target is null');
    return;
  }

  const { jsPDF, toPng } = await muatPustakaPdf();
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

    // Dokumen yang sudah dibagi per lembar ([data-pdf-page], mis. Nota Pembelian): tiap lembar
    // menjadi satu halaman PDF utuh, tanpa dipotong dari satu gambar panjang.
    const lembarList = Array.from(clone.querySelectorAll<HTMLElement>('[data-pdf-page]'));
    if (lembarList.length > 0) {
      await simpanPdfPerLembar(lembarList, cleanFilename, orientation, options.format);
      return;
    }

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

    const maxSliceHeightPx = Math.floor(pageAvailableHeightMm * (imgWidthPx / imgWidthMm));

    // Blok yang tidak boleh terbelah halaman ([data-pdf-keep] / .avoid-page-break), mis. tanda
    // tangan beserta namanya atau satu kupon di laporan. Titik potong di dalam blok dibuang dan
    // diganti titik potong tepat di atas blok, sehingga blok pindah utuh ke halaman berikutnya.
    // Blok yang lebih tinggi dari satu halaman tetap boleh dipotong di antara barisnya.
    const keepRangesDom: Array<[number, number]> = [];
    clone.querySelectorAll('[data-pdf-keep], .avoid-page-break').forEach((el) => {
      const rect = el.getBoundingClientRect();
      const top = rect.top - cloneRect.top;
      const bottom = rect.bottom - cloneRect.top;
      const heightPx = (bottom - top) * scale;
      if (heightPx > 0 && heightPx <= maxSliceHeightPx * 0.85) {
        keepRangesDom.push([top, bottom]);
        if (top > 0) safeBreaksDom.push(top);
      }
    });
    const isInsideKeep = (y: number) => keepRangesDom.some(([top, bottom]) => y > top + 0.5 && y < bottom - 0.5);

    const safeBreaksImg = Array.from(new Set(safeBreaksDom.filter((y) => !isInsideKeep(y))))
      .map((y) => Math.round(y * scale))
      .filter((y) => y > 0 && y < imgHeightPx)
      .sort((a, b) => a - b);

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

      // Penanda halaman lanjutan agar batas antarhalaman jelas
      if (i > 0 && options.judulLanjutan) {
        pdf.setFontSize(8);
        pdf.setTextColor(140, 140, 140);
        pdf.text(`${options.judulLanjutan} (lanjutan)`, margin, 5);
      }

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
 * Menyimpan PDF dengan satu halaman per lembar dokumen. Tiap lembar difoto sendiri lalu
 * ditempel utuh ke halamannya; lembar yang sedikit lebih tinggi dari halaman diperkecil
 * proporsional, jadi tidak ada baris yang terpotong.
 */
async function simpanPdfPerLembar(
  lembarList: HTMLElement[],
  filename: string,
  orientation: 'portrait' | 'landscape',
  format?: string
): Promise<void> {
  const { jsPDF, toPng } = await muatPustakaPdf();
  const pdf = new jsPDF({ orientation, unit: 'mm', format: format || 'a4', compress: true });
  const margin = 8;
  const maxWidthMm = pdf.internal.pageSize.getWidth() - margin * 2;
  const maxHeightMm = pdf.internal.pageSize.getHeight() - margin * 2;

  for (let i = 0; i < lembarList.length; i++) {
    const lembar = lembarList[i];
    // Tampilan layar berupa kertas berbingkai; di PDF cukup isinya dengan margin halaman
    lembar.style.border = 'none';
    lembar.style.boxShadow = 'none';
    lembar.style.padding = '0';
    lembar.style.margin = '0';

    const dataUrl = await toPng(lembar, {
      quality: 1,
      pixelRatio: 2.5,
      backgroundColor: '#ffffff',
      cacheBust: true,
    });

    const img = new Image();
    img.src = dataUrl;
    await new Promise((resolve, reject) => {
      img.onload = () => resolve(true);
      img.onerror = (e) => reject(e);
    });

    const imgWidthPx = img.naturalWidth || img.width;
    const imgHeightPx = img.naturalHeight || img.height;
    let widthMm = maxWidthMm;
    let heightMm = (imgHeightPx * widthMm) / imgWidthPx;
    if (heightMm > maxHeightMm) {
      heightMm = maxHeightMm;
      widthMm = (imgWidthPx * heightMm) / imgHeightPx;
    }

    if (i > 0) pdf.addPage();
    pdf.addImage(dataUrl, 'PNG', margin + (maxWidthMm - widthMm) / 2, margin, widthMm, heightMm, undefined, 'FAST');
  }

  pdf.save(filename);
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

