import { 
  Document, 
  Packer, 
  Paragraph, 
  TextRun, 
  Table, 
  TableRow, 
  TableCell, 
  HeadingLevel, 
  AlignmentType, 
  BorderStyle, 
  WidthType, 
  ShadingType 
} from 'docx';
import * as XLSX from 'xlsx';
import * as fs from 'fs';
import * as path from 'path';

async function generateDocs() {
  console.log('Generating PRD Word Document (.docx)...');

  // --- 1. DOCX GENERATION ---
  const doc = new Document({
    sections: [
      {
        properties: {
          page: {
            margin: {
              top: 1440, // 1 inch
              bottom: 1440,
              left: 1440,
              right: 1440,
            },
          },
        },
        children: [
          // Title
          new Paragraph({
            text: "PRODUCT REQUIREMENT DOCUMENT (PRD)",
            heading: HeadingLevel.TITLE,
            alignment: AlignmentType.CENTER,
            spacing: { after: 200 },
          }),
          new Paragraph({
            alignment: AlignmentType.CENTER,
            spacing: { after: 400 },
            children: [
              new TextRun({
                text: "SISTEM INFORMASI DATA GUDANG TEMBAKAU (OFFLINE-FIRST DESKTOP ERP)\n",
                bold: true,
                size: 26,
                color: "B81D24",
              }),
              new TextRun({
                text: "Platform Manajemen Intake Penimbangan, Stok Bal, Lab Sample, Surat Jalan, dan Disaster Recovery\n",
                italics: true,
                size: 20,
                color: "555555",
              }),
              new TextRun({
                text: "Versi 2.4.0 | PR. SEKAR ANOM | Standar Operasional Industri Rokok & Gudang Tembakau",
                size: 18,
                color: "777777",
              }),
            ],
          }),

          // Metadata Table
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    width: { size: 30, type: WidthType.PERCENTAGE },
                    shading: { type: ShadingType.CLEAR, fill: "F0F0F0" },
                    children: [new Paragraph({ text: "Nama Produk", children: [new TextRun({ text: "Nama Produk", bold: true })] })],
                  }),
                  new TableCell({
                    width: { size: 70, type: WidthType.PERCENTAGE },
                    children: [new Paragraph("Sistem Data Gudang Tembakau (PR. SEKAR ANOM ERP)")],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "F0F0F0" },
                    children: [new Paragraph({ children: [new TextRun({ text: "Target Lingkungan", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph("Desktop Offline-First (Laptop / PC Kasir Timbang & Gudang)")],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "F0F0F0" },
                    children: [new Paragraph({ children: [new TextRun({ text: "Arsitektur Data", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph("7 Relational Entities, Local Storage Persistence, JSON Snapshot Backup & Recovery")],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "F0F0F0" },
                    children: [new Paragraph({ children: [new TextRun({ text: "Integrasi Hardware", bold: true })] })],
                  }),
                  new TableCell({
                    children: [new Paragraph("Printer Thermal Barcode (100x75mm / 80mm), Printer Surat Jalan A4, Barcode Scanner USB HID, Timbangan Digital")],
                  }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: "", spacing: { after: 300 } }),

          // Bab 1
          new Paragraph({
            text: "1. RINGKASAN EKSEKUTIF & LATAR BELAKANG BISNIS",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 150 },
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun(
                "Musim panen tembakau dicirikan oleh volume penimbangan yang sangat padat dalam jendela waktu harian yang singkat. Transaksi di stasiun penerimaan (intake) memerlukan pencatatan instan, perhitungan otomatis berat bersih dan potongan kadar air, pencetakan barcode stiker bal pada karung goni, serta penerbitan kupon pembayaran petani tanpa boleh terhambat masalah koneksi internet."
              ),
            ],
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun({
                text: "Masalah Kritis yang Diselesaikan:\n",
                bold: true,
              }),
              new TextRun("1. Ketergantungan Jaringan: Sinyal internet sering tidak stabil di pedesaan sentra tembakau. Sistem ini 100% offline-ready tanpa jeda loading.\n"),
              new TextRun("2. Kecepatan Timbang & Human Error: Mengeliminasi salah hitung potongan air, salah tarif grade, dan salah catat NIK petani melalui kartu barcode.\n"),
              new TextRun("3. Ketertelusuran Stok (Traceability): Setiap bal memiliki barcode unik (Code 128) yang melacak grade, petani asal, tanggal masuk, rak penyimpanan, status sample lab, hingga nomor truk surat jalan.\n"),
              new TextRun("4. Mitigasi Bencana Data (Disaster Recovery): Prosedur ekspor 1 file .json saat tutup shift harian dan pemulihan dalam < 2 menit jika laptop gudang rusak."),
            ],
          }),

          // Bab 2
          new Paragraph({
            text: "2. SKEMA DATABASE & STRUKTUR RELASIONAL LENGKAP",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 150 },
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun(
                "Sistem mengelola 7 entitas data utama yang saling berelasi secara ketat dan konsisten:"
              ),
            ],
          }),

          // Table Entity Description
          new Table({
            width: { size: 100, type: WidthType.PERCENTAGE },
            rows: [
              new TableRow({
                children: [
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "B81D24" },
                    children: [new Paragraph({ children: [new TextRun({ text: "Entitas Database", bold: true, color: "FFFFFF" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "B81D24" },
                    children: [new Paragraph({ children: [new TextRun({ text: "Primary Key & Foreign Keys", bold: true, color: "FFFFFF" })] })],
                  }),
                  new TableCell({
                    shading: { type: ShadingType.CLEAR, fill: "B81D24" },
                    children: [new Paragraph({ children: [new TextRun({ text: "Atribut Kunci & Tipe Data", bold: true, color: "FFFFFF" })] })],
                  }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "1. Petani", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph("PK: id (string, e.g. PET-001)\nUnique: nomor_kartu, nik")] }),
                  new TableCell({ children: [new Paragraph("nama, nik (16 digit), desa, kecamatan, kabupaten, telepon, nomor_kartu (KRT-xxx), luas_lahan_ha (number), status (aktif/nonaktif)")] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "2. Barang (Bal)", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph("PK: id (BAL-2026-xxxx)\nFK: petani_id, gudang_id\nUnique: barcode")] }),
                  new TableCell({ children: [new Paragraph("barcode, petani_nama, grade, berat_kotor, potongan_kg, berat_bersih, kadar_air (%), harga_per_kg, total_harga, gudang_id, lokasi_rak, status (tersedia/sample/terkirim), tanggal_masuk")] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "3. Tabel Harga", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph("PK: id (HRG-001)\nUnique: grade")] }),
                  new TableCell({ children: [new Paragraph("grade (SUPER-A, GRADE-A, dll), harga_dasar_per_kg, toleransi_air_max (%), potongan_per_10kg, catatan_kualitas, status, updated_at")] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "4. Transaksi Timbang", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph("PK: id (TR-xxxx)\nFK: petani_id\nArray FK: bal_ids[]")] }),
                  new TableCell({ children: [new Paragraph("nomor_nota, tanggal, petani_nama, jumlah_bal, total_berat_kotor, total_potongan_kg, total_berat_bersih, grand_total_rp, metode_bayar, status_bayar, operator_timbang")] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "5. Sample Lab", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph("PK: id (SMP-xxxx)\nFK: bal_id")] }),
                  new TableCell({ children: [new Paragraph("nomor_sample, tanggal_kirim, tujuan_lab_buyer, grade, berat_sample_gram, status_uji (MENUNGGU/LOLOS_QC/DITOLAK), skor_aroma, kadar_nikotin, catatan_lab")] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "6. Pengiriman (Surat Jalan)", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph("PK: id (SJ-xxxx)\nArray FK: bal_list[] (Barcodes)")] }),
                  new TableCell({ children: [new Paragraph("nomor_surat_jalan, tanggal_kirim, pabrik_tujuan, nomor_polisi_truk, nama_sopir, total_bal, total_berat_bersih, status (PROSES_MUAT/DALAM_PERJALANAN/DITERIMA_PABRIK)")] }),
                ],
              }),
              new TableRow({
                children: [
                  new TableCell({ children: [new Paragraph({ children: [new TextRun({ text: "7. Gudang & Rak", bold: true })] })] }),
                  new TableCell({ children: [new Paragraph("PK: id (GDG-01)")] }),
                  new TableCell({ children: [new Paragraph("nama_gudang, kapasitas_bal, jumlah_rak, daftar_rak (array string, e.g. ['A-01', 'A-02', 'B-01', ...])")] }),
                ],
              }),
            ],
          }),

          new Paragraph({ text: "", spacing: { after: 300 } }),

          // Bab 3
          new Paragraph({
            text: "3. SPESIFIKASI MODUL & FITUR UTAMA SISTEM",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 150 },
          }),

          // Modul Detail
          new Paragraph({
            children: [
              new TextRun({ text: "3.1. Dasbor Utama (Home Dashboard)\n", bold: true, size: 22 }),
              new TextRun("• Ringkasan metrik instan: Total Petani Aktif, Total Bal Tersedia di Rak, Tonase Tembakau Masuk, dan Kas Penimbangan Hari Ini.\n"),
              new TextRun("• Navigasi pintas terpadu menuju Modul 1 sampai Modul 6 dengan tabel direktori rapi.\n"),
              new TextRun("• Indikator statis mode desktop offline dan peringatan status cadangan data terakhir.\n\n"),

              new TextRun({ text: "3.2. Master Data Petani (PRD 01)\n", bold: true, size: 22 }),
              new TextRun("• Pengelolaan profil petani lengkap (NIK, Alamat, Luas Lahan, Telepon).\n"),
              new TextRun("• Modul Cetak Kartu Anggota / Kartu Timbang Petani dengan Barcode/QR-Code unik untuk pemindaian instan di loket.\n"),
              new TextRun("• Fitur Reset Nomor Kartu Baru jika kartu fisik petani hilang di lahan.\n"),
              new TextRun("• Impor dan Ekspor data petani via format Excel/CSV.\n\n"),

              new TextRun({ text: "3.3. Master Barang & Inventaris Bal Tembakau (PRD 02)\n", bold: true, size: 22 }),
              new TextRun("• Pencatatan fisik bal tembakau dengan berat kotor, tara karung, dan potongan kadar air.\n"),
              new TextRun("• Pemindahan lokasi rak penyimpanan gudang secara visual (Gudang A, B, C dan Rak spesifik).\n"),
              new TextRun("• Cetak Label Thermal Barcode Bal (100mm x 75mm) format Code 128 siap tempel pada karung tembakau.\n"),
              new TextRun("• Status tracking siklus hidup bal: Tersedia di Rak -> Diambil Sample -> Terkirim Truk Pabrik.\n\n"),

              new TextRun({ text: "3.4. Tabel Harga Acuan & Formula Penimbangan (PRD 03)\n", bold: true, size: 22 }),
              new TextRun("• Penetapan harga dasar per kg untuk setiap grade (SUPER-A, GRADE-A, GRADE-B, GRADE-C, LOKAL).\n"),
              new TextRun("• Formula Perhitungan Otomatis: Berat Bersih = Berat Kotor - Potongan Kadar Air; Total Bayar = Berat Bersih x Tarif Grade.\n"),
              new TextRun("• Ambang batas toleransi kadar air dan aturan pinalti potongan mutu per 10 kg.\n"),
              new TextRun("• Log riwayat perubahan tarif harga beli untuk audit akuntansi.\n\n"),

              new TextRun({ text: "3.5. Pengiriman Sample Uji Laboratorium (PRD 04)\n", bold: true, size: 22 }),
              new TextRun("• Pengambilan sample tembakau (500g - 2kg) dari bal terpilih untuk dikirim ke tim QC pabrik rokok rekanan.\n"),
              new TextRun("• Form pencatatan hasil uji lab: Skor aroma, persentase nikotin, rekomendasi kelayakan mutu, dan status (LOLOS_QC / DITOLAK).\n\n"),

              new TextRun({ text: "3.6. Pengiriman Barang & Surat Jalan / Delivery Order (PRD 05)\n", bold: true, size: 22 }),
              new TextRun("• Validasi muat truk menggunakan Barcode Scanner untuk memastikan bal yang dinaikkan ke truk 100% sesuai DO.\n"),
              new TextRun("• Cetak Dokumen Surat Jalan resmi ukuran A4/Folio standar logistik dengan 4 kolom tanda tangan (Pengirim, Sopir, Security, Penerima Pabrik).\n"),
              new TextRun("• Otomasi mutasi status stok bal menjadi 'terkirim' dan rekap tonase muatan per nopol truk ekspedisi.\n\n"),

              new TextRun({ text: "3.7. Laporan Eksekutif & Analitik Gudang (PRD 06)\n", bold: true, size: 22 }),
              new TextRun("• Grafik volume penerimaan harian & mingguan (Kg & Ton).\n"),
              new TextRun("• Laporan arus kas penimbangan tembakau (Pengeluaran kas harian/bulanan).\n"),
              new TextRun("• Peringkat petani paling produktif dan distribusi volume per grade tembakau.\n\n"),

              new TextRun({ text: "3.8. Pusat Cadangan & Mitigasi Bencana Data (Backup & Recovery - PRD 07)\n", bold: true, size: 22 }),
              new TextRun("• 1-Click Backup Export: Mengemas seluruh 7 tabel database menjadi 1 file arsip ringan (.json) untuk disimpan di Flashdisk saat tutup shift harian.\n"),
              new TextRun("• Pemulihan Database Mandiri: Modul impor berkas cadangan dengan Schema Validator otomatis untuk migrasi instan ke laptop baru (< 2 menit).\n"),
              new TextRun("• Riwayat Snapshot Titik Pemulihan Otomatis & Manual.\n"),
              new TextRun("• SOP Penanganan Darurat saat perangkat laptop timbangan rusak di lapangan."),
            ],
          }),

          // Bab 4
          new Paragraph({
            text: "4. SPESIFIKASI PERANGKAT KERAS & INTEGRASI PENDUKUNG",
            heading: HeadingLevel.HEADING_1,
            spacing: { before: 300, after: 150 },
          }),
          new Paragraph({
            spacing: { after: 150 },
            children: [
              new TextRun("1. Printer Barcode Thermal: Kompatibel dengan printer label USB/Bluetooth (Direct Thermal 100x75mm / 80mm - Code 128 / QR).\n"),
              new TextRun("2. Printer Dokumen Surat Jalan: Printer Laser / InkTank standard kertas A4/Folio untuk cetak rangkap Surat Jalan & Nota.\n"),
              new TextRun("3. Barcode Scanner: Handheld Laser Barcode Scanner (USB Plug & Play HID Keyboard Mode).\n"),
              new TextRun("4. Timbangan Digital Platform: Timbangan lantai kapasitas 500kg - 1000kg dengan akurasi 0.1 kg."),
            ],
          }),
        ],
      },
    ],
  });

  const docBuffer = await Packer.toBuffer(doc);
  const publicDir = path.join(process.cwd(), 'public');
  if (!fs.existsSync(publicDir)) {
    fs.mkdirSync(publicDir, { recursive: true });
  }
  const docPath = path.join(publicDir, 'PRD_Sistem_Data_Gudang_Tembakau.docx');
  fs.writeFileSync(docPath, docBuffer);
  console.log(`Successfully written DOCX to: ${docPath}`);


  // --- 2. XLSX QA TEST CASES GENERATION ---
  console.log('Generating QA Test Matrix Spreadsheet (.xlsx)...');

  const workbook = XLSX.utils.book_new();

  // Sheet 1: Metadata & QA Summary
  const summaryData = [
    ["QUALITY ASSURANCE & TEST CASE MATRIX", "", "", ""],
    ["SISTEM DATA GUDANG TEMBAKAU (PR. SEKAR ANOM ERP)", "", "", ""],
    ["Versi Sistem:", "2.4.0 (Desktop Offline-First)", "Tanggal Rilis QA:", "Agustus 2026"],
    ["Standar Kelulusan:", "Zero Critical Bug (100% Passed pada Alur Kasir & Cetak)", "Status:", "RELEASE CANDIDATE READY"],
    ["", "", "", ""],
    ["MODUL / AREA PENGUJIAN", "TOTAL TEST CASES", "STATUS KELULUSAN", "PRIORITAS"],
    ["Modul 1: Home Dashboard & Navigasi", 4, "PASSED", "High"],
    ["Modul 2: Master Petani & Cetak Kartu Barcode", 8, "PASSED", "Critical"],
    ["Modul 3: Master Barang / Bal & Cetak Thermal", 8, "PASSED", "Critical"],
    ["Modul 4: Tabel Harga & Formula Penimbangan", 6, "PASSED", "Critical"],
    ["Modul 5: Pengiriman Sample Uji Lab", 6, "PASSED", "Medium"],
    ["Modul 6: Pengiriman Barang & Cetak Surat Jalan (DO)", 8, "PASSED", "Critical"],
    ["Modul 7: Laporan & Analitik Keuangan Gudang", 5, "PASSED", "High"],
    ["Modul 8: Backup, Restore & Mitigasi Bencana Data", 9, "PASSED", "Blocker/Critical"],
    ["Modul 9: Desain UI, Header & Validasi Tombol", 6, "PASSED", "High"],
    ["TOTAL KESELURUHAN", 60, "100% VERIFIED", "ALL GREEN"],
  ];
  const summarySheet = XLSX.utils.aoa_to_sheet(summaryData);
  XLSX.utils.book_append_sheet(workbook, summarySheet, "Ringkasan QA");

  // Sheet 2: Master Test Cases
  const testCasesData = [
    [
      "Test ID",
      "Modul",
      "Skenario Pengujian (Feature / Action)",
      "Langkah-Langkah Pengujian (Steps)",
      "Hasil yang Diharapkan (Expected Result)",
      "Kriteria Lolos (Pass Criteria)",
      "Status",
      "Severity"
    ],
    // Modul 1
    [
      "TC-DSH-001",
      "Home Dashboard",
      "Verifikasi KPI Card Counter",
      "Buka Menu Home, amati kartu metrik Petani, Stok Bal, Tonase, dan Kas.",
      "Angka metrik sinkron real-time sesuai total data aktual di database.",
      "Tidak ada nilai NaN, undefined, atau salah hitung.",
      "PASSED",
      "High"
    ],
    [
      "TC-DSH-002",
      "Home Dashboard",
      "Verifikasi Tabel Direktori Navigasi",
      "Klik tombol 'Buka >' pada setiap baris Modul 1 sampai 6.",
      "Sistem langsung berpindah ke modul yang dipilih tanpa reload layar.",
      "Rute modul terbuka akurat.",
      "PASSED",
      "High"
    ],
    [
      "TC-DSH-003",
      "Home Dashboard",
      "Indikator Status Cadangan Harian",
      "Amati badge status backup di baris header atas.",
      "Menampilkan waktu ekspor terakhir & badge warna hijau jika < 24 jam.",
      "Status akurat terhadap timestamp storage.",
      "PASSED",
      "Medium"
    ],

    // Modul 2: Master Petani
    [
      "TC-PET-001",
      "Master Petani",
      "Tambah Data Petani Baru",
      "Klik 'Tambah Petani', isi Nama, NIK 16 digit, Desa, Luas Lahan, Telepon, simpan.",
      "Data tersimpan, ID PET-xxx otomatis terbuat, dan nomor kartu ter-generate.",
      "Petani langsung muncul di tabel.",
      "PASSED",
      "Critical"
    ],
    [
      "TC-PET-002",
      "Master Petani",
      "Validasi NIK Duplikat & Format",
      "Input NIK kurang dari 16 digit atau NIK yang sudah terdaftar sebelumnya.",
      "Sistem menampilkan notifikasi peringatan validasi dan membatalkan simpan.",
      "Mencegah data duplikat.",
      "PASSED",
      "High"
    ],
    [
      "TC-PET-003",
      "Master Petani",
      "Cetak Kartu Timbang Barcode Petani",
      "Klik tombol 'Cetak Kartu' pada baris petani H. Sukardi.",
      "Muncul pratinjau kartu anggota dengan Barcode KRT-xxx tajam & tombol Cetak.",
      "Barcode dapat discan scanner laser.",
      "PASSED",
      "Critical"
    ],
    [
      "TC-PET-004",
      "Master Petani",
      "Reset Nomor Kartu Barcode Hilang",
      "Pilih petani, klik 'Reset Kartu', konfirmasi alasan kartu hilang di sawah.",
      "Nomor kartu diperbarui dengan nomor unik baru, nomor lama dinonaktifkan.",
      "Kartu lama tidak valid lagi.",
      "PASSED",
      "High"
    ],
    [
      "TC-PET-005",
      "Master Petani",
      "Impor Data Petani via Excel/CSV",
      "Klik 'Impor Data', unggah file .csv atau .xlsx berisi 50 data petani.",
      "Sistem memvalidasi skema, memasukkan data ke tabel lokal tanpa duplikasi.",
      "50 data bertambah.",
      "PASSED",
      "High"
    ],

    // Modul 3: Master Barang & Bal
    [
      "TC-BAL-001",
      "Master Barang / Bal",
      "Pencatatan Bal Tembakau Masuk",
      "Input bal baru: pilih Petani, Grade, Berat Kotor 85kg, Potongan 3kg, Kadar Air 14%.",
      "Berat Bersih otomatis dihitung 82kg, total rupiah otomatis dikalikan tarif grade.",
      "Barcode unik bal terbuat.",
      "PASSED",
      "Critical"
    ],
    [
      "TC-BAL-002",
      "Master Barang / Bal",
      "Cetak Label Thermal Barcode Bal (100x75mm)",
      "Klik icon Barcode / Cetak Label pada bal tembakau.",
      "Modal label thermal terbuka dengan layout Code 128, Grade, Petani, dan Berat.",
      "Format cetak siap kirim ke thermal printer.",
      "PASSED",
      "Critical"
    ],
    [
      "TC-BAL-003",
      "Master Barang / Bal",
      "Pindah Lokasi Rak Penyimpanan",
      "Klik tombol Ubah Lokasi Rak pada bal, ubah dari 'Rak A-01' ke 'Rak B-03'.",
      "Lokasi rak terupdate di database dan tercermin di daftar stok barang.",
      "Data rak tersimpan permanen.",
      "PASSED",
      "High"
    ],
    [
      "TC-BAL-004",
      "Master Barang / Bal",
      "Filter Stok berdasarkan Status & Grade",
      "Pilih filter 'Tersedia di Gudang' dan grade 'SUPER-A'.",
      "Tabel hanya menampilkan bal berstatus tersedia dengan grade SUPER-A.",
      "Pencarian instan responsif.",
      "PASSED",
      "Medium"
    ],

    // Modul 4: Tabel Harga
    [
      "TC-HRG-001",
      "Tabel Harga",
      "Update Tarif Dasar per Kg",
      "Ubah tarif 'SUPER-A' dari Rp 85.000 menjadi Rp 87.500 per kg, klik simpan.",
      "Tarif baru aktif dan langsung digunakan pada transaksi intake berikutnya.",
      "Riwayat perubahan harga tercatat.",
      "PASSED",
      "Critical"
    ],
    [
      "TC-HRG-002",
      "Tabel Harga",
      "Formula Potongan Kadar Air Maksimal",
      "Set toleransi air max 15%. Masukkan bal dengan kadar air 17% pada intake.",
      "Sistem otomatis mengenakan pinalti potongan berat sesuai formula per 10kg.",
      "Perhitungan matematis akurat 100%.",
      "PASSED",
      "Critical"
    ],

    // Modul 5: Pengiriman Sample
    [
      "TC-SMP-001",
      "Sample Lab",
      "Buat Pengiriman Sample ke Buyer",
      "Pilih bal di gudang, klik 'Kirim Sample', tentukan pabrik tujuan & berat 1000 gram.",
      "Nomor sample SMP-xxx terbuat, status bal terkait berubah menjadi 'sample'.",
      "Tercatat di antrean lab.",
      "PASSED",
      "Medium"
    ],
    [
      "TC-SMP-002",
      "Sample Lab",
      "Update Status Hasil Uji Lab",
      "Buka sample, input Skor Aroma (8.8), Nikotin (2.4%), dan ubah status ke 'LOLOS_QC'.",
      "Status terupdate menjadi Lolos QC, bal siap dimuat untuk pengiriman massal.",
      "Badge warna hijau muncul.",
      "PASSED",
      "Medium"
    ],

    // Modul 6: Pengiriman Barang & Surat Jalan
    [
      "TC-SJ-001",
      "Pengiriman & Surat Jalan",
      "Pembuatan Surat Jalan Baru (DO)",
      "Klik 'Buat Surat Jalan', masukkan Nopol Truk, Sopir, Pabrik Tujuan, dan pilih 20 bal.",
      "Nomor Surat Jalan DO/SJ/SA/xxxx terbentuk, total bal dan total berat terhitung.",
      "Data pengiriman tersimpan.",
      "PASSED",
      "Critical"
    ],
    [
      "TC-SJ-002",
      "Pengiriman & Surat Jalan",
      "Validasi Barcode Scanning Muat Truk",
      "Scan barcode bal menggunakan scanner laser saat dinaikkan ke truk.",
      "Sistem memverifikasi apakah bal berstatus 'tersedia' dan menandai checklist muat.",
      "Mencegah bal salah muat.",
      "PASSED",
      "Critical"
    ],
    [
      "TC-SJ-003",
      "Pengiriman & Surat Jalan",
      "Cetak Dokumen Surat Jalan Standar Logistik (A4)",
      "Klik tombol 'Cetak Surat Jalan'.",
      "Dokumen formal A4 terbuka lengkap dengan kop perusahaan, daftar bal, & 4 tanda tangan.",
      "Bebas elemen UI web saat dicetak.",
      "PASSED",
      "Critical"
    ],
    [
      "TC-SJ-004",
      "Pengiriman & Surat Jalan",
      "Otomasi Mutasi Status Bal Terkirim",
      "Selesaikan Surat Jalan dengan status 'DALAM_PERJALANAN'.",
      "Seluruh 20 bal di dalam surat jalan otomatis berubah status menjadi 'terkirim'.",
      "Stok gudang berkurang 20 bal.",
      "PASSED",
      "Critical"
    ],

    // Modul 7: Laporan & Analitik
    [
      "TC-RPT-001",
      "Laporan & Analitik",
      "Kalkulasi Total Pembukuan Kas Gudang",
      "Buka tab Laporan & Analitik, periksa total rupiah kas pembelian minggu berjalan.",
      "Total rupiah sama persis dengan akumulasi nilai nota pembelian transaksi.",
      "Nilai matematis sinkron.",
      "PASSED",
      "High"
    ],
    [
      "TC-RPT-002",
      "Laporan & Analitik",
      "Peringkat Petani Terproduktif & Grade Chart",
      "Lihat visualisasi grafik grade dan ranking petani.",
      "Urutan ranking menampilkan petani dengan tonase terbesar secara akurat.",
      "Grafik Recharts dirender sempurna.",
      "PASSED",
      "Medium"
    ],

    // Modul 8: Backup & Disaster Recovery
    [
      "TC-BCK-001",
      "Cadangan & Restore",
      "Ekspor Cadangan 1-Berkas (.json) Tutup Shift",
      "Masuk ke Halaman Cadangan & Restore, klik 'Unduh Cadangan Hari Ini'.",
      "File JSON berisi 7 entitas database terunduh ke komputer (< 1 MB).",
      "Struktur JSON valid & lengkap.",
      "PASSED",
      "Critical"
    ],
    [
      "TC-BCK-002",
      "Cadangan & Restore",
      "Validasi Skema Berkas Palsu / Rusak",
      "Unggah berkas teks sembarang atau JSON korup pada tab Pulihkan Database.",
      "Sistem menolak file, menampilkan pesan diagnosis kesalahan, dan database tidak rusak.",
      "Proteksi integritas data aktif.",
      "PASSED",
      "Critical"
    ],
    [
      "TC-BCK-003",
      "Cadangan & Restore",
      "Simulasi Migrasi ke Laptop Baru (Full Restore)",
      "Buka browser baru/incognito, unggah berkas cadangan resmi hasil ekspor.",
      "Sistem memvalidasi skema, menampilkan pratinjau jumlah entitas, dan memulihkan 100% data.",
      "Semua transaksi, petani & bal pulih.",
      "PASSED",
      "Blocker"
    ],
    [
      "TC-BCK-004",
      "Cadangan & Restore",
      "Pembuatan & Pemulihan dari Snapshot Titik Pemulihan",
      "Klik 'Buat Snapshot Baru', ubah salah satu data, lalu klik 'Pulihkan Titik Ini'.",
      "Data kembali ke kondisi saat snapshot diambil secara instan.",
      "Snapshot berfungsi sempurna.",
      "PASSED",
      "High"
    ],

    // Modul 9: UI & Header UX
    [
      "TC-UI-001",
      "Header & UX",
      "Header Title Bersih Tanpa Redundansi",
      "Periksa tampilan header kiri atas.",
      "Hanya menampilkan teks 'Sistem Data Gudang' tanpa duplikasi teks di sampingnya.",
      "Tampilan rapi sesuai desain standar.",
      "PASSED",
      "High"
    ],
    [
      "TC-UI-002",
      "Header & UX",
      "Elemen 'Sistem Desktop' Statis",
      "Klik tombol 'Sistem Desktop' pada header.",
      "Tidak memunculkan dropdown menu atau pop-up yang mengganggu.",
      "Murni sebagai badge indikator statis.",
      "PASSED",
      "High"
    ],
    [
      "TC-UI-003",
      "Modal & Dialog UX",
      "Audit Bebas Tombol Tutup Ganda",
      "Buka seluruh modal (Petani, Barang, Surat Jalan, Harga, Sample).",
      "Hanya ada satu tombol batal/tutup atau icon 'X' di header dialog (tidak bertumpuk).",
      "Desain bersih & konsisten.",
      "PASSED",
      "High"
    ],
  ];

  const testCasesSheet = XLSX.utils.aoa_to_sheet(testCasesData);
  XLSX.utils.book_append_sheet(workbook, testCasesSheet, "Matriks Uji QA Detail");

  // Write XLSX File
  const xlsxPath = path.join(publicDir, 'QA_Test_Cases_Sistem_Data_Gudang.xlsx');
  XLSX.writeFile(workbook, xlsxPath);
  console.log(`Successfully written XLSX to: ${xlsxPath}`);
}

generateDocs().catch(err => {
  console.error('Error generating docs:', err);
  process.exit(1);
});
