#!/bin/bash

# PengirimanManagement.tsx
perl -0777 -pi -e 's/<p className="text-xs text-gray-500">\s*Tarik bal yang telah di-ACC dari Batch Sample atau pilih dari stok gudang, scan verifikasi muatan fisik, dan terbitkan Surat Jalan resmi\.\s*<\/p>//g' src/components/pengiriman/PengirimanManagement.tsx
perl -0777 -pi -e 's/<p className="text-xs text-gray-500">\s*Dokumentasi resmi pengiriman bal tembakau ke pabrik rokok mitra, integrasi hasil deal sample, dan cetak Surat Jalan & Invoice\.\s*<\/p>//g' src/components/pengiriman/PengirimanManagement.tsx
perl -0777 -pi -e 's/<p className="text-xs text-gray-500">\s*Arahkan <strong>barcode scanner alat<\/strong> atau ketik <strong>No Bal<\/strong> pada kolom input di atas untuk memasukkan bal ke dalam pengiriman ini\.\s*<\/p>//g' src/components/pengiriman/PengirimanManagement.tsx

# StatusBatchPengirimanManagement.tsx
perl -0777 -pi -e 's/<p className="text-xs text-gray-500">\s*Pusat monitoring sortir sample pembeli \(ACC, Nego, Tolak, Edit Harga\) & status operasional pengiriman reguler \(Akan, Sedang, Selesai\)\.\s*<\/p>//g' src/components/pengiriman/StatusBatchPengirimanManagement.tsx

# SampleManagement.tsx
perl -0777 -pi -e 's/<p className="text-xs text-gray-500">\s*Kirim batch sample tembakau sesuai permintaan buyer, sortir ACC\/tolak\/nego di gudang pabrik, & tarik bal deal ke DO\.\s*<\/p>//g' src/components/sample/SampleManagement.tsx
perl -0777 -pi -e 's/<p className="text-xs text-gray-500">\s*Pilih target buyer, masukkan spesifikasi grade & harga yang diinginkan, pilih bal, dan atur harga penawaran per bal\.\s*<\/p>//g' src/components/sample/SampleManagement.tsx
perl -0777 -pi -e 's/<p className="text-xs text-gray-500">\s*Gunakan Mode Scan 3 Langkah pada input di atas untuk memasukkan bal ke batch ini\.\s*<\/p>//g' src/components/sample/SampleManagement.tsx

