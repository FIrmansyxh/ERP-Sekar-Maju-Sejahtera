#!/bin/bash
# Remove badge from DashboardAnalyticView.tsx
perl -0777 -pi -e 's/<span className="px-2 py-0\.5 text-\[10px\] font-bold tracking-wider uppercase bg-\[\#b81d24\] text-white">\s*PRD Bab 9\s*<\/span>//g' src/components/laporan/DashboardAnalyticView.tsx

# Remove badge from LaporanPembelianBarangView.tsx
perl -0777 -pi -e 's/<span className="px-2 py-0\.5 text-\[10px\] font-bold tracking-wider uppercase bg-\[\#b81d24\] text-white">\s*PRD Bab 8\s*<\/span>//g' src/components/laporan/LaporanPembelianBarangView.tsx

# Remove badge from LaporanGudangView.tsx
perl -0777 -pi -e 's/<span className="px-2 py-0\.5 text-\[10px\] font-bold rounded-xs bg-red-100 text-\[\#b81d24\] uppercase tracking-wider">\s*PRD Bab 4\.3 & 9\s*<\/span>//g' src/components/laporan/LaporanGudangView.tsx

# Fix TransaksiManagement.tsx
sed -i 's/(PRD Bab 5)//g' src/components/transaksi/TransaksiManagement.tsx

# Fix App.tsx comments
sed -i 's/(RBAC - PRD Bab 3)//g' src/App.tsx
sed -i 's/(PRD Bab 9 & Quick Access)//g' src/App.tsx
sed -i 's/PRD Bab 9://g' src/App.tsx
sed -i 's/PRD Bab 8://g' src/App.tsx
sed -i 's/PRD Bab 5://g' src/App.tsx
sed -i 's/PRD Bab 3://g' src/App.tsx
sed -i 's/--- PRD Bab 5:/---/g' src/App.tsx

# Remove comments containing PRD Bab in DashboardAnalyticView and LaporanPembelianBarangView
sed -i 's/(PRD Bab 9.4)//g' src/components/laporan/DashboardAnalyticView.tsx
sed -i 's/(PRD Bab 8.1)//g' src/components/laporan/LaporanPembelianBarangView.tsx
sed -i 's/(PRD Bab 8.3)//g' src/components/laporan/LaporanPembelianBarangView.tsx
sed -i 's/(PRD Bab 8.2 & Bab 8.3)//g' src/components/laporan/LaporanPembelianBarangView.tsx

