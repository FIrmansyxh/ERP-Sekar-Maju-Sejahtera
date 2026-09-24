/**
 * Antrean simpanan versi aplikasi sebelumnya (disimpan per peramban). Versi itu menampilkan perubahan dulu di layar
 * lalu mengirimnya di belakang; yang tertinggal di antrean adalah perubahan yang TIDAK PERNAH diterima server
 * (umumnya karena ditolak), sehingga hanya terlihat di komputer ini. Isinya adalah salinan utuh data yang bisa
 * sudah basi, jadi tidak aman dikirim ulang: antrean dibuang dan operator diberi tahu apa saja yang perlu dicek.
 */
const KUNCI_LAMA = ['sms_antrian_sinkron_v1', 'sms_antrian_mutasi_v1', 'sms_antrian_mutasi_terhapus_v1', 'sms_bal_dihapus_v1'];

export function bersihkanAntreanLama(): string[] {
  const label: string[] = [];
  try {
    const kupon = localStorage.getItem('sms_antrian_sinkron_v1');
    if (kupon) {
      const isi = JSON.parse(kupon);
      if (Array.isArray(isi)) for (const t of isi) if (t?.tx?.no_kupon) label.push(`Kupon ${t.tx.no_kupon}`);
    }
    const mutasi = localStorage.getItem('sms_antrian_mutasi_v1');
    if (mutasi) {
      const isi = JSON.parse(mutasi);
      if (Array.isArray(isi)) for (const t of isi) if (t?.label) label.push(String(t.label));
    }
  } catch {
    // isi rusak: tetap dibersihkan
  }
  try {
    KUNCI_LAMA.forEach((k) => localStorage.removeItem(k));
  } catch {
    // penyimpanan tidak tersedia
  }
  return label;
}
