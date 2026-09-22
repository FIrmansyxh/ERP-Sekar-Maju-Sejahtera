import { Component, ErrorInfo, ReactNode } from 'react';
import { AlertTriangle, RefreshCw } from 'lucide-react';

interface Props {
  children: ReactNode;
  /** Judul singkat area yang dilindungi, mis. nama menu; hanya untuk pesan galat. */
  area?: string;
}

interface State {
  galat: Error | null;
}

/** Galat saat mengunduh potongan kode setelah aplikasi diperbarui di server (nama berkas berubah). */
export const isGalatMuatPotongan = (galat: Error): boolean =>
  /Failed to fetch dynamically imported module|Importing a module script failed|error loading dynamically imported module|ChunkLoadError/i.test(
    `${galat.name} ${galat.message}`
  );

/**
 * Menangkap galat saat menampilkan halaman agar satu kesalahan tidak mengosongkan seluruh aplikasi.
 * Data yang sudah tersimpan tidak terpengaruh; operator dapat mencoba lagi atau memuat ulang halaman.
 */
export class ErrorBoundary extends Component<Props, State> {
  state: State = { galat: null };

  static getDerivedStateFromError(galat: Error): State {
    return { galat };
  }

  componentDidCatch(galat: Error, info: ErrorInfo) {
    console.error(`Galat pada tampilan${this.props.area ? ` ${this.props.area}` : ''}:`, galat, info.componentStack);
  }

  private cobaLagi = () => this.setState({ galat: null });
  private muatUlang = () => window.location.reload();

  render() {
    const { galat } = this.state;
    if (!galat) return this.props.children;

    const versiBaru = isGalatMuatPotongan(galat);
    return (
      <div role="alert" className="max-w-xl mx-auto mt-10 bg-white border border-red-200 rounded-sm shadow-xs p-6 text-center space-y-3">
        <div className="mx-auto w-10 h-10 rounded-full bg-red-50 border border-red-100 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-[#b81d24]" />
        </div>
        <h2 className="text-sm font-bold text-gray-900">
          {versiBaru ? 'Versi baru aplikasi tersedia' : 'Halaman tidak dapat ditampilkan'}
        </h2>
        <p className="text-xs text-gray-600 leading-relaxed">
          {versiBaru
            ? 'Aplikasi baru saja diperbarui. Muat ulang halaman untuk melanjutkan; data yang sudah tersimpan tidak hilang.'
            : 'Terjadi kesalahan saat menampilkan halaman ini. Data yang sudah tersimpan tidak terpengaruh. Coba lagi, atau muat ulang halaman bila masalah berlanjut.'}
        </p>
        {!versiBaru && <p className="text-[11px] font-mono text-gray-400 break-words">{galat.message}</p>}
        <div className="flex items-center justify-center space-x-2 pt-1">
          {!versiBaru && (
            <button
              type="button"
              onClick={this.cobaLagi}
              className="px-3.5 py-1.5 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 rounded-sm cursor-pointer"
            >
              Coba Lagi
            </button>
          )}
          <button
            type="button"
            onClick={this.muatUlang}
            className="px-3.5 py-1.5 text-xs font-bold text-white bg-[#b81d24] hover:bg-[#a0181e] rounded-sm cursor-pointer flex items-center space-x-1.5"
          >
            <RefreshCw className="w-3.5 h-3.5" />
            <span>Muat Ulang Halaman</span>
          </button>
        </div>
      </div>
    );
  }
}
