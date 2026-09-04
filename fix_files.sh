#!/bin/bash

# Fix HargaManagement.tsx
# First get everything before the return block
awk 'BEGIN {p=1} /return \(/ {p=0; print; next} p' src/components/harga/HargaManagement.tsx > src/components/harga/HargaManagement.tsx.tmp
cat /tmp/harga_replacement.txt >> src/components/harga/HargaManagement.tsx.tmp
echo '      {/* Modal Add / Edit Form */}' >> src/components/harga/HargaManagement.tsx.tmp
# Then get everything from Modal Add / Edit form to the end
awk 'BEGIN {p=0} /\{\/\* Modal Add \/ Edit Form \*\// {if (p==0) {p=1; next}} p' src/components/harga/HargaManagement.tsx >> src/components/harga/HargaManagement.tsx.tmp
mv src/components/harga/HargaManagement.tsx.tmp src/components/harga/HargaManagement.tsx

# Fix HargaJualManagement.tsx
awk 'BEGIN {p=1} /return \(/ {p=0; print; next} p' src/components/harga_jual/HargaJualManagement.tsx > src/components/harga_jual/HargaJualManagement.tsx.tmp
cat /tmp/hargajual_replacement.txt >> src/components/harga_jual/HargaJualManagement.tsx.tmp
echo '      {/* Modal Add / Edit Form */}' >> src/components/harga_jual/HargaJualManagement.tsx.tmp
awk 'BEGIN {p=0} /\{\/\* Modal Add \/ Edit Form \*\// {if (p==0) {p=1; next}} p' src/components/harga_jual/HargaJualManagement.tsx >> src/components/harga_jual/HargaJualManagement.tsx.tmp
mv src/components/harga_jual/HargaJualManagement.tsx.tmp src/components/harga_jual/HargaJualManagement.tsx

