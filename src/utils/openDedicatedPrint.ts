/**
 * Universal print trigger for Nota, Surat Jalan, and other documents.
 * Opens the in-app Print & PDF Preview popup modal directly in the same window,
 * avoiding popup blockers, navigation bugs, and iframe sandbox restrictions.
 */
export function openPrintDocument(
  type: 'nota' | 'surat_jalan' | 'sample' | 'bon_produksi',
  id: string
): void {
  try {
    window.dispatchEvent(
      new CustomEvent('erp-open-print-doc', {
        detail: { type, id },
      })
    );
  } catch (err) {
    console.error('Error dispatching erp-open-print-doc:', err);
  }
}

export function openDedicatedPrintPage(
  type: 'nota' | 'surat_jalan' | 'sample' | 'bon_produksi',
  id: string
): boolean {
  openPrintDocument(type, id);
  return true;
}
