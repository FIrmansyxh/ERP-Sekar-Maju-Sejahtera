#!/bin/bash

# SortirPageView.tsx
perl -0777 -pi -e 's/e\.target\.value\.replace\(\/-\/g, ""\)\.toUpperCase\(\)/formatNoKupon(e.target.value)/g' src/components/transaksi/SortirPageView.tsx
# Import helper
sed -i 's/import { formatRupiah, formatDateIndo } from/import { formatRupiah, formatDateIndo, formatNoKupon } from/g' src/components/transaksi/SortirPageView.tsx

# Proses1SortirModal.tsx
perl -0777 -pi -e 's/e\.target\.value\.replace\(\/-\/g, ""\)\.toUpperCase\(\)/formatNoKupon(e.target.value)/g' src/components/transaksi/Proses1SortirModal.tsx
# Import helper
sed -i 's/import { formatRupiah } from/import { formatRupiah, formatNoKupon } from/g' src/components/transaksi/Proses1SortirModal.tsx

# TimbanganPageView.tsx
perl -0777 -pi -e 's/e\.target\.value\.replace\(\/-\/g, ""\)\.toUpperCase\(\)/formatNoKupon(e.target.value)/g' src/components/transaksi/TimbanganPageView.tsx
# Import helper
sed -i 's/import { formatRupiah, formatDateIndo } from/import { formatRupiah, formatDateIndo, formatNoKupon } from/g' src/components/transaksi/TimbanganPageView.tsx

# KasirPageView.tsx
perl -0777 -pi -e 's/e\.target\.value\.replace\(\/-\/g, ""\)\.toUpperCase\(\)/formatNoKupon(e.target.value)/g' src/components/transaksi/KasirPageView.tsx
# Import helper
sed -i 's/import { formatRupiah, formatDateIndo } from/import { formatRupiah, formatDateIndo, formatNoKupon } from/g' src/components/transaksi/KasirPageView.tsx

