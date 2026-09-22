/** Tampilan sementara saat potongan kode sebuah menu diunduh (React.lazy). */
export function MemuatHalaman() {
  return (
    <div role="status" className="flex items-center justify-center py-16 text-xs text-gray-500 space-x-2">
      <span className="w-4 h-4 border-2 border-gray-300 border-t-[#b81d24] rounded-full animate-spin" aria-hidden="true" />
      <span>Memuat halaman…</span>
    </div>
  );
}
