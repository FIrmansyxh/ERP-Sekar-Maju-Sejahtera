import { useEffect } from 'react';

/**
 * Menahan refresh atau penutupan tab selagi masih ada isian yang belum disimpan.
 *
 * Peramban modern hanya menampilkan konfirmasi bawaannya sendiri dan mengabaikan
 * teks khusus, jadi hook ini cukup menandai bahwa halaman punya perubahan.
 * Perpindahan antar modul di dalam aplikasi tidak ikut tertahan karena draf
 * sudah dipulihkan otomatis lewat useSessionDraft.
 */
export function useUnsavedChangesWarning(hasUnsavedChanges: boolean): void {
  useEffect(() => {
    if (!hasUnsavedChanges) return;

    const handleBeforeUnload = (e: BeforeUnloadEvent) => {
      e.preventDefault();
      e.returnValue = '';
    };

    window.addEventListener('beforeunload', handleBeforeUnload);
    return () => window.removeEventListener('beforeunload', handleBeforeUnload);
  }, [hasUnsavedChanges]);
}
