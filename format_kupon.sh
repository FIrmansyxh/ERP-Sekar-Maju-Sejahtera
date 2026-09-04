#!/bin/bash

# SortirPageView.tsx
perl -0777 -pi -e 's/onChange=\{\(e\) => setNoKupon\(e\.target\.value\)\}/onChange={(e) => setNoKupon(e.target.value.replace(\/-\/g, "").toUpperCase())}/g' src/components/transaksi/SortirPageView.tsx

# Proses1SortirModal.tsx
perl -0777 -pi -e 's/onChange=\{\(e\) => setNoKupon\(e\.target\.value\.toUpperCase\(\)\)\}/onChange={(e) => setNoKupon(e.target.value.replace(\/-\/g, "").toUpperCase())}/g' src/components/transaksi/Proses1SortirModal.tsx

# TimbanganPageView.tsx
perl -0777 -pi -e 's/const val = e\.target\.value;/const val = e.target.value.replace(\/-\/g, "").toUpperCase();/g' src/components/transaksi/TimbanganPageView.tsx

