import { Dispatch, SetStateAction, useCallback, useEffect, useRef, useState } from 'react';
import { clearDraft, loadDraft, saveDraft } from '../utils/draftStorage';

/** Jeda tulis agar pengetikan cepat tidak membebani penyimpanan peramban. */
const WRITE_DELAY_MS = 400;

/**
 * Pengganti useState untuk isian yang belum disimpan.
 *
 * Nilainya dicerminkan ke sessionStorage, sehingga isian tetap utuh saat
 * operator berpindah modul atau halaman ter-refresh, lalu hilang sendiri
 * ketika tab ditutup atau pengguna logout.
 *
 * Nilai balik ketiga membuang draf dari penyimpanan sekaligus mengembalikan
 * state ke nilai awal; panggil itu setelah data berhasil disimpan permanen.
 */
export function useSessionDraft<T>(
  scope: string,
  userId: string | undefined,
  initialValue: T | (() => T),
): [T, Dispatch<SetStateAction<T>>, () => void] {
  // Nilai awal hanya dipakai saat draf belum ada, jadi cukup dihitung sekali.
  const initialRef = useRef<{ value: T } | null>(null);
  const resolveInitial = useCallback((): T => {
    if (!initialRef.current) {
      initialRef.current = {
        value: typeof initialValue === 'function' ? (initialValue as () => T)() : initialValue,
      };
    }
    return initialRef.current.value;
  }, [initialValue]);

  const [value, setValue] = useState<T>(() => {
    const draft = loadDraft<T>(scope, userId);
    return draft === null ? resolveInitial() : draft;
  });

  // Render pertama dilewati supaya draf yang baru dipulihkan tidak ditulis ulang.
  const isFirstRun = useRef(true);

  useEffect(() => {
    if (isFirstRun.current) {
      isFirstRun.current = false;
      return;
    }

    const timer = setTimeout(() => saveDraft(scope, userId, value), WRITE_DELAY_MS);
    return () => clearTimeout(timer);
  }, [scope, userId, value]);

  const reset = useCallback(() => {
    clearDraft(scope, userId);
    setValue(resolveInitial());
  }, [scope, userId, resolveInitial]);

  return [value, setValue, reset];
}
