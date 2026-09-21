import { ComponentType, LazyExoticComponent, lazy } from 'react';

/**
 * React.lazy untuk komponen dengan ekspor bernama:
 *   const KasirPageView = lazyNamed(() => import('./components/transaksi/KasirPageView'), 'KasirPageView');
 * Tipe props komponen tetap terjaga.
 */
export function lazyNamed<M extends object, K extends keyof M>(
  pemuat: () => Promise<M>,
  nama: K
): LazyExoticComponent<Extract<M[K], ComponentType<any>>> {
  return lazy(() => pemuat().then((modul) => ({ default: modul[nama] as Extract<M[K], ComponentType<any>> })));
}
