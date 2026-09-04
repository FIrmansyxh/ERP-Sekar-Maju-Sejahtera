import React from 'react';
import { 
  Package, 
  Tag, 
  FlaskConical, 
  Truck, 
  BarChart3, 
  ArrowRight, 
  Database,
  ArrowLeft,
  CheckCircle2
} from 'lucide-react';

interface UpcomingModulePlaceholderProps {
  moduleId: string;
  onGoToPetani: () => void;
}

export const UpcomingModulePlaceholder: React.FC<UpcomingModulePlaceholderProps> = ({
  moduleId,
  onGoToPetani,
}) => {
  const getDetails = (id: string) => {
    switch (id) {
      case 'modul-2-barang':
        return {
          icon: <Package className="w-8 h-8 text-gray-700" />,
          badge: 'PRD 02 (Urutan Berikutnya)',
          title: 'Modul Data Barang — Master Grade & Penataan Bal',
          desc: 'Modul untuk manajemen master tembakau per grade (Grade A s/d F), penomoran fisik tiap bal saat intake, pengurangan stok saat bal keluar gudang.',
          entities: [
            { field: 'barang_id', type: 'PK (UUID / Auto)', desc: 'Identitas unik master barang' },
            { field: 'kode_grade', type: 'string (A, B, C, D, E, F)', desc: 'Klasifikasi grade mutu tembakau' },
            { field: 'no_bal', type: 'string (Unik)', desc: 'Nomor bal saat penerimaan' },
            { field: 'berat_standar_kg', type: 'number (default 45 kg)', desc: 'Standar berat bal tembakau' },
            { field: 'status_stok', type: 'string', desc: 'di_gudang / dalam_pengiriman / keluar' },
            { field: 'lokasi_gudang', type: 'string', desc: 'Blok / Rak penyimpanan' },
          ],
          relations: 'No. bal pada modul ini menjadi kunci penghubung ke Pengiriman Sample dan Pengiriman Barang.',
        };
      case 'modul-3-harga':
        return {
          icon: <Tag className="w-8 h-8 text-gray-700" />,
          badge: 'PRD 03 (Menunggu Data Barang)',
          title: 'Modul Tabel Harga — Tarif Grade & Rate Potongan',
          desc: 'Modul pengelolaan tarif harga beli per kg per grade, versioning tanggal berlaku, serta konfigurasi rate potongan.',
          entities: [
            { field: 'harga_id', type: 'PK', desc: 'Identitas acuan harga' },
            { field: 'barang_id', type: 'FK → Barang.kode_grade', desc: 'Relasi ke Grade Barang' },
            { field: 'harga_per_kg', type: 'currency (IDR)', desc: 'Harga dasar per kilogram' },
            { field: 'tanggal_berlaku', type: 'date', desc: 'Masa aktif harga' },
            { field: 'rate_potongan_per_10kg', type: 'number (default 2000)', desc: 'Potongan standar kadar air/tara' },
          ],
          relations: 'Bergantung pada Grade yang didefinisikan di Modul Data Barang dan dipakai saat Transaksi Pembelian.',
        };
      case 'modul-4-sample':
        return {
          icon: <FlaskConical className="w-8 h-8 text-gray-700" />,
          badge: 'PRD 04 (Logistik & Lab)',
          title: 'Modul Pengiriman Sample — Uji Mutu & Approval Lab',
          desc: 'Pencatatan pengiriman sampel tembakau ke pabrik/laboratorium buyer, status approval (Diterima / Ditolak), dan referensi grade.',
          entities: [
            { field: 'sample_id', type: 'PK', desc: 'ID Pengiriman sample' },
            { field: 'barang_id', type: 'FK', desc: 'Grade tembakau yang diuji' },
            { field: 'sumber', type: 'string', desc: 'Gudang asal / Petani sumber' },
            { field: 'tujuan', type: 'string', desc: 'Lab / Pabrik / Buyer' },
            { field: 'tanggal_kirim', type: 'date', desc: 'Waktu kirim sample' },
            { field: 'status', type: 'dikirim | disetujui | ditolak', desc: 'Approval status' },
          ],
          relations: 'Menggunakan referensi Barang (Grade) dan Petani (petani_id). Pengiriman barang fisik menunggu approval sample ini.',
        };
      case 'modul-5-pengiriman':
        return {
          icon: <Truck className="w-8 h-8 text-gray-700" />,
          badge: 'PRD 05 (Logistik Bal Fisik)',
          title: 'Modul Pengiriman Barang — Surat Jalan Outbound',
          desc: 'Pengiriman bal tembakau fisik skala penuh keluar gudang menuju pabrik rokok/mitra, validasi nomor bal dan pembaruan status stok.',
          entities: [
            { field: 'pengiriman_id', type: 'PK', desc: 'Nomor surat jalan / DO' },
            { field: 'no_bal', type: 'FK → Barang.no_bal', desc: 'Nomor bal fisik yang keluar' },
            { field: 'sumber', type: 'string', desc: 'Gudang Temanggung' },
            { field: 'tujuan', type: 'string', desc: 'Pabrik Rokok Tujuan' },
            { field: 'tanggal_kirim', type: 'date', desc: 'Waktu keberangkatan truk' },
            { field: 'referensi_sample_id', type: 'FK (opsional)', desc: 'Tautan ke approval sample' },
          ],
          relations: 'Memvalidasi nomor bal fisik dan memperbarui status stok di Data Barang.',
        };
      case 'modul-6-laporan':
        return {
          icon: <BarChart3 className="w-8 h-8 text-gray-700" />,
          badge: 'PRD 06 (Konsumen Data & Analytic)',
          title: 'Modul Laporan & Analytic — Dashboard Ranking & Volume',
          desc: 'Modul analitik agregasi: ranking grade tembakau terlaris/tersedikit, ranking petani paling aktif/setoran terbanyak, tren volume panen per wilayah.',
          entities: [
            { field: 'agregasi_petani', type: 'Ranking Metric', desc: 'Top pemasok by volume bal & kg' },
            { field: 'agregasi_grade', type: 'Distribusi Mutu', desc: 'Persentase Grade A, B, C, D, E' },
            { field: 'agregasi_gudang', type: 'Kapasitas & Mutasi', desc: 'Stok masuk vs keluar' },
            { field: 'agregasi_pembelian', type: 'Rekap Finansial', desc: 'Total tonase & biaya beli' },
          ],
          relations: 'Mengkonsumsi data dari seluruh modul (Petani, Barang, Harga, Transaksi, Pengiriman).',
        };
      default:
        return {
          icon: <Database className="w-8 h-8 text-gray-700" />,
          badge: 'Modul Tambahan',
          title: 'Modul Sistem ERP Tembakau',
          desc: 'Modul dalam perencanaan arsitektur roadmap terpadu.',
          entities: [],
          relations: 'Terintegrasi dengan Master Petani.',
        };
    }
  };

  const details = getDetails(moduleId);

  return (
    <div className="p-4 sm:p-6 max-w-4xl mx-auto space-y-5 font-sans">
      
      {/* Top Banner Notice */}
      <div className="bg-[#f8f9fa] border border-gray-300 p-4 flex items-start space-x-3 text-xs text-gray-700">
        <div className="p-2 bg-white border border-gray-200 shrink-0">
          {details.icon}
        </div>
        <div className="space-y-1">
          <div className="flex items-center space-x-2">
            <span className="font-bold text-xs uppercase px-2 py-0.5 bg-gray-200 text-gray-800">
              {details.badge}
            </span>
          </div>
          <h1 className="text-base font-bold text-gray-900">{details.title}</h1>
          <p className="text-gray-600 text-xs leading-relaxed">{details.desc}</p>
        </div>
      </div>

      {/* Relational Foundation Notice */}
      <div className="border border-gray-200 p-4 bg-white space-y-3">
        <div className="flex items-center space-x-2 text-gray-900 font-bold text-xs">
          <CheckCircle2 className="w-4 h-4 text-emerald-600" />
          <span>Fondasi Master Data (PRD 01: Data Petani) Telah Siap</span>
        </div>
        <p className="text-xs text-gray-600 leading-relaxed">
          Arsitektur database relasional dirancang agar modul ini terhubung langsung dengan master data yang sudah aktif.
        </p>
      </div>

      {/* Entity Design Preview Table */}
      {details.entities.length > 0 && (
        <div className="border border-gray-200 bg-white">
          <div className="p-3 bg-[#f8f9fa] border-b border-gray-200 font-bold text-xs text-gray-900">
            Skema Relasi Data
          </div>
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs border-collapse">
              <thead>
                <tr className="bg-gray-50 border-b border-gray-200 font-bold text-gray-700">
                  <th className="py-2 px-3">Nama Field</th>
                  <th className="py-2 px-3">Tipe Data / Relasi</th>
                  <th className="py-2 px-3">Keterangan Fungsi</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-100">
                {details.entities.map((ent, idx) => (
                  <tr key={idx} className="hover:bg-gray-50/50">
                    <td className="py-2 px-3 font-mono font-bold text-gray-900">{ent.field}</td>
                    <td className="py-2 px-3 font-mono text-gray-600">{ent.type}</td>
                    <td className="py-2 px-3 text-gray-600">{ent.desc}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Relationship Note */}
      <div className="bg-gray-50 border border-gray-200 p-3 text-xs space-y-1">
        <span className="font-bold text-gray-900 block">Keterhubungan Antar Modul:</span>
        <p className="text-gray-600">{details.relations}</p>
      </div>

      {/* Action Button */}
      <div className="flex items-center justify-between pt-2">
        <button
          onClick={onGoToPetani}
          className="px-4 py-2 text-xs font-semibold text-gray-700 bg-white hover:bg-gray-100 border border-gray-300 transition flex items-center space-x-1.5 cursor-pointer shadow-xs"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Kembali ke Master Petani</span>
        </button>

        <span className="text-[11px] text-gray-500 font-mono">
          ERP Gudang Tembakau
        </span>
      </div>

    </div>
  );
};
