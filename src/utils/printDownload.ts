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

  // Target page width & height in CSS pixels
  // A4 Portrait: 210mm x 297mm (printable ~ 194mm x 281mm => ~760px x 1050px)
  // A4 Landscape: 297mm x 210mm (printable ~ 281mm x 194mm => ~1080px x 710px)
  const targetWidth = isLandscape ? 1080 : 760;
  const maxPageHeight = isLandscape ? 700 : 1020;

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
    clone.style.padding = '0';
    clone.style.margin = '0';

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
    // Allow layout to compute
    await new Promise((r) => setTimeout(r, 40));

    const totalHeight = clone.scrollHeight || clone.offsetHeight;

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
    const imgWidth = pdfWidth - margin * 2;

    // CASE 1: Single page document (e.g. Nota Timbang, Surat Jalan, Kartu, Label)
    if (totalHeight <= maxPageHeight + 60) {
      const imgData = await toPng(clone, {
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      const img = new Image();
      img.src = imgData;
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(true);
        img.onerror = (e) => reject(e);
      });

      const singlePageImgHeight = (img.height * imgWidth) / img.width;
      const finalHeight = Math.min(singlePageImgHeight, pdfHeight - margin * 2);
      pdf.addImage(imgData, 'PNG', margin, margin, imgWidth, finalHeight, undefined, 'FAST');
      pdf.save(cleanFilename);
      return;
    }

    // CASE 2: Multi-Page Document (Laporan Pembelian, Laporan Gudang, Large Tables)
    // We build discrete DOM pages chunked cleanly by table rows & sections
    sandbox.removeChild(clone);

    const pagesContainer: HTMLElement[] = [];
    const docTitle = cleanFilename.replace(/_/g, ' ').replace(/\.pdf$/i, '');

    const makeNewPage = (pageNum: number): HTMLElement => {
      const pageEl = document.createElement('div');
      pageEl.style.width = `${targetWidth}px`;
      pageEl.style.minHeight = `${maxPageHeight}px`;
      pageEl.style.padding = '24px 28px';
      pageEl.style.background = '#ffffff';
      pageEl.style.boxSizing = 'border-box';
      pageEl.style.display = 'flex';
      pageEl.style.flexDirection = 'column';
      pageEl.style.justifyContent = 'space-between';
      pageEl.style.position = 'relative';

      // Header on Page 2 and later
      if (pageNum > 1) {
        const headerEl = document.createElement('div');
        headerEl.className = 'border-b border-gray-400 pb-2 mb-3 flex items-center justify-between text-[10px] text-gray-600 font-semibold';
        headerEl.innerHTML = `
          <span>PR. SEKAR MAJU SEJAHTERA • ${docTitle}</span>
          <span class="font-mono">Halaman ${pageNum}</span>
        `;
        pageEl.appendChild(headerEl);
      }

      const bodyEl = document.createElement('div');
      bodyEl.className = 'flex-1 space-y-4 page-body';
      pageEl.appendChild(bodyEl);

      // Running page footer
      const footerEl = document.createElement('div');
      footerEl.className = 'border-t border-gray-200 pt-2 mt-4 flex items-center justify-between text-[9px] text-gray-500 font-medium';
      footerEl.innerHTML = `
        <span>Dicetak melalui Sistem Gudang & Pengadaan PR. SEKAR MAJU SEJAHTERA</span>
        <span class="font-mono">Halaman ${pageNum}</span>
      `;
      pageEl.appendChild(footerEl);

      sandbox.appendChild(pageEl);
      return pageEl;
    };

    let currentPageNum = 1;
    let currentPage = makeNewPage(currentPageNum);
    pagesContainer.push(currentPage);

    const getPageBody = (p: HTMLElement): HTMLElement => {
      return (p.querySelector('.page-body') as HTMLElement) || p;
    };

    // Iterate through top level child nodes of clone
    const childNodes = Array.from(clone.children) as HTMLElement[];

    for (const child of childNodes) {
      // Check if this child contains a large table
      const table = child.tagName === 'TABLE' ? child : child.querySelector('table');

      if (table && table.querySelector('tbody') && (table.querySelector('tbody')?.children.length || 0) > 8) {
        // Handle big table pagination
        const thead = table.querySelector('thead');
        const tbody = table.querySelector('tbody');
        const tfoot = table.querySelector('tfoot');
        const heading = child.tagName === 'TABLE' ? null : child.querySelector('h1, h2, h3, h4, h5, p, span');

        // Append heading to current page if exists
        if (heading) {
          const headingClone = heading.cloneNode(true) as HTMLElement;
          getPageBody(currentPage).appendChild(headingClone);
        }

        // Start table on current page
        let currentTable = document.createElement('table');
        currentTable.className = table.className || 'w-full text-left border-collapse border border-gray-300 text-[10px]';
        if (thead) {
          currentTable.appendChild(thead.cloneNode(true));
        }
        let currentTbody = document.createElement('tbody');
        currentTbody.className = tbody?.className || 'divide-y divide-gray-300';
        currentTable.appendChild(currentTbody);
        getPageBody(currentPage).appendChild(currentTable);

        const rows = Array.from(tbody ? tbody.children : []) as HTMLElement[];

        for (const row of rows) {
          currentTbody.appendChild(row.cloneNode(true));

          // Check if page height exceeded
          if (currentPage.offsetHeight > maxPageHeight + 40) {
            // Remove row from current page
            currentTbody.removeChild(currentTbody.lastChild as Node);

            // Start new page
            currentPageNum++;
            currentPage = makeNewPage(currentPageNum);
            pagesContainer.push(currentPage);

            // Re-create table on new page with cloned thead
            currentTable = document.createElement('table');
            currentTable.className = table.className || 'w-full text-left border-collapse border border-gray-300 text-[10px]';
            if (thead) {
              currentTable.appendChild(thead.cloneNode(true));
            }
            currentTbody = document.createElement('tbody');
            currentTbody.className = tbody?.className || 'divide-y divide-gray-300';
            currentTable.appendChild(currentTbody);
            getPageBody(currentPage).appendChild(currentTable);

            // Append row to new page
            currentTbody.appendChild(row.cloneNode(true));
          }
        }

        // Append tfoot if present
        if (tfoot) {
          const tfootClone = tfoot.cloneNode(true) as HTMLElement;
          currentTable.appendChild(tfootClone);
          if (currentPage.offsetHeight > maxPageHeight + 40) {
            currentTable.removeChild(tfootClone);
            currentPageNum++;
            currentPage = makeNewPage(currentPageNum);
            pagesContainer.push(currentPage);

            const newTable = document.createElement('table');
            newTable.className = table.className || 'w-full text-left border-collapse border border-gray-300 text-[10px]';
            newTable.appendChild(tfootClone);
            getPageBody(currentPage).appendChild(newTable);
          }
        }
      } else {
        // Normal non-table block or small block (Kop surat, metadata, signature)
        const blockClone = child.cloneNode(true) as HTMLElement;
        getPageBody(currentPage).appendChild(blockClone);

        if (currentPage.offsetHeight > maxPageHeight + 40 && getPageBody(currentPage).children.length > 1) {
          // Move to next page
          getPageBody(currentPage).removeChild(blockClone);
          currentPageNum++;
          currentPage = makeNewPage(currentPageNum);
          pagesContainer.push(currentPage);
          getPageBody(currentPage).appendChild(blockClone);
        }
      }
    }

    // Render each constructed page cleanly to high-DPI canvas & add to jsPDF
    for (let i = 0; i < pagesContainer.length; i++) {
      const pageEl = pagesContainer[i];
      const pageImgData = await toPng(pageEl, {
        quality: 1,
        pixelRatio: 2.5,
        backgroundColor: '#ffffff',
        cacheBust: true,
      });

      const img = new Image();
      img.src = pageImgData;
      await new Promise((resolve, reject) => {
        img.onload = () => resolve(true);
        img.onerror = (e) => reject(e);
      });

      const pageImgHeight = (img.height * imgWidth) / img.width;
      const adjustedHeight = Math.min(pageImgHeight, pdfHeight - margin * 2);

      if (i > 0) {
        pdf.addPage();
      }

      pdf.addImage(pageImgData, 'PNG', margin, margin, imgWidth, adjustedHeight, undefined, 'FAST');
    }

    // Save final clean PDF
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

