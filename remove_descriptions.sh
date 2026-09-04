#!/bin/bash

# LaporanGudangView.tsx
perl -0777 -pi -e 's/<p className="text-xs text-gray-500 mt-0\.5">\s*Monitoring real-time kapasitas daya tampung, jumlah bal masuk, % okupansi terisi, dan detail tembakau per fasilitas gudang\.\s*<\/p>//g' src/components/laporan/LaporanGudangView.tsx

# DashboardAnalyticView.tsx
perl -0777 -pi -e 's/<p className="text-xs text-gray-500 mt-0\.5">\s*Ringkasan eksekutif arus pergudangan tembakau, perputaran stok bal, dan pusat unduh dokumen audit\.\s*<\/p>//g' src/components/laporan/DashboardAnalyticView.tsx

# LaporanAnalytics.tsx
perl -0777 -pi -e 's/<p className="text-xs text-gray-500 mt-0\.5">\s*Pusat pemantauan tonase, sirkulasi mutu grade tembakau, dan ekspor data audit pembukuan\s*<\/p>//g' src/components/laporan/LaporanAnalytics.tsx

# LaporanPembelianBarangView.tsx
perl -0777 -pi -e 's/<p className="text-xs text-gray-500 mt-0\.5">\s*Laporan rekapitulasi setoran timbang tembakau dari petani dengan filter multi-parameter dinamis dan kalkulasi potongan otomatis\.\s*<\/p>//g' src/components/laporan/LaporanPembelianBarangView.tsx

# LaporanPengirimanView.tsx
perl -0777 -pi -e 's/<p className="text-xs text-gray-500 mt-0\.5">\s*Monitoring surat jalan DO pabrik rokok, pengiriman sample QC lab, realisasi tonase & armada logistik\s*<\/p>//g' src/components/laporan/LaporanPengirimanView.tsx

# LaporanPetaniView.tsx
perl -0777 -pi -e 's/<p className="text-xs text-gray-500 mt-0\.5">\s*Analisis performa penyetoran, riwayat transaksi timbang, volume bal & nilai pembayaran per petani mitra\s*<\/p>//g' src/components/laporan/LaporanPetaniView.tsx

# HargaManagement.tsx
perl -0777 -pi -e 's/<p className="text-xs text-gray-500 mt-0\.5">Kelola kode harga beli dan kriteria tembakau<\/p>//g' src/components/harga/HargaManagement.tsx

# HargaJualManagement.tsx
perl -0777 -pi -e 's/<p className="text-xs text-gray-500 mt-1">\s*Daftar penawaran harga jual dan status aktif\.\s*<\/p>//g' src/components/harga_jual/HargaJualManagement.tsx

# SampleManagement.tsx
perl -0777 -pi -e 's/<p className="text-xs text-gray-500 mt-0\.5">Silakan klik "Kirim 1 Batch Sample Baru" untuk membuat pengiriman sample\.<\/p>//g' src/components/sample/SampleManagement.tsx

# StatusBatchPengirimanManagement.tsx
perl -0777 -pi -e 's/<p className="text-xs text-gray-500 mt-1">Silakan cari dan pilih kode batch pengiriman sample di atas untuk melihat detail hasil sortir pembeli\.<\/p>//g' src/components/pengiriman/StatusBatchPengirimanManagement.tsx

# LoginView.tsx
perl -0777 -pi -e 's/<p className="text-xs text-gray-500 mt-0\.5">\s*Silakan autentikasi identitas akun staf Anda untuk melanjutkan\.\s*<\/p>//g' src/components/auth/LoginView.tsx

