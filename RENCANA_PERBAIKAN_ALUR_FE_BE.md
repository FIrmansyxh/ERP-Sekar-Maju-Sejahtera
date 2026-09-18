# Rencana Perbaikan Alur FE → BE → Local Storage

Tanggal review: 2026-09-18  
Scope: alur aplikasi **saat ini** (bukan redesign `newplan-db.md`).  
Dokumen terkait DB redesign ditahan sampai perintah: `lanjut rencana mapping db`.

---

## Status implementasi

| Fase | Status | Catatan |
|------|--------|---------|
| **A (P0)** | **Selesai (2026-09-18)** | `PUT /transaksi/{id}/sortir-items`, `PUT /sample-batch/{id}`, DO stok=`keluar`, sync FE API-first + refetch barang setelah bayar/sample/DO |
| B (P1) | Belum | Delete harga/transaksi, auth:sanctum, wire update barang UI |
| **C3 laporan** | **Selesai sebagian (2026-09-18)** | Refresh list saat buka `modul-6-*`, `getDashboardStats` + fallback SQL, mapper DO isi `total_berat_kg`/`total_nilai_deal`, laporan valuasi pakai `barangLunasList` |
| C (P2 sisanya) | Belum | RBAC BE, deprecate sample legacy |

---

## 1. Cara kerja sekarang (ringkas)

```
Login → health check
  ├─ Online: GET domain dari API → ganti React state → mirror ke localStorage (v40)
  └─ Offline / gagal: pakai localStorage (+ login lokal)

Mutasi menu:
  ├─ Ideal (baru mulai dipakai): API dulu / sync → lalu Local
  └─ Masih banyak: Local dulu → API async (atau Local saja)
```

**File inti**

| Layer | File |
|-------|------|
| Orkestrasi | `FE/src/App.tsx` |
| API + cache | `FE/src/services/erpApi.ts`, `apiClient.ts` |
| Local | `FE/src/utils/storage.ts` |
| Routes | `BE/routes/api.php` |

**Perubahan terkini (git):** harga beli + sync transaksi + load sample/pengiriman saat login sudah mendekati API. Sample/DO update-status, delete harga/transaksi, multi-bal sortir masih bermasalah.

---

## 2. Matriks menu: apa yang sudah pas vs tidak

| Menu | Read API | Create API | Update API | Delete API | Local | Status |
|------|----------|------------|------------|------------|-------|--------|
| Petani | ✅ | ✅ | ✅ | ✅ | cache | OK (import/statistik lokal saja) |
| Harga beli | ✅ | ✅ upsert | via POST | ❌ Local only | cache | **Delete hilang setelah refresh** |
| Harga jual | ✅ | ✅ | via POST | ❌ Local only | cache | sama |
| Sortir (kupon baru) | ✅ | ✅ POST sortir | — | ❌ | cache | OK untuk create pertama |
| Sortir (tambah bal) | — | ❌ | salah ke timbang | ❌ | Local menang | **P0 data hilang di BE** |
| Timbangan | ✅ | — | ✅ PUT timbang | — | cache | OK sebagian; `status_tahap` BE vs FE beda |
| Kasir / bayar | ✅ | — | ✅ PUT bayar | ❌ Local only | + buat `barang` | OK bayar; **delete transaksi Local only** |
| Barang / stok | ✅ | via bayar | PUT status (FE payload minim) | — | pre-kasir Local | `proses_sortir` FE-only; `handleUpdateBarang` belum ke UI |
| Sample batch | ✅ | ✅ POST | ❌ Local | ❌ Local | dual ID | **P0 QC/status hilang setelah refresh** |
| Pengiriman DO | ✅ | ✅ POST | ❌ Local | ❌ Local | dual ID + stok | **P0 ID/stok `keluar` vs `siap_kirim`** |
| Status batch | baca sample/DO | — | Local | Local | Local | hampir seluruhnya tidak ke BE |
| Users | ✅ | ✅ | ✅ | resource ada, FE jarang | cache | OK |
| Audit | ❌ | ❌ | — | — | **hanya Local** | hilang di device lain |
| Laporan / dashboard | ✅ refresh list + `/dashboard/stats` (fallback tabel) | — | — | — | cache mirror | **Lebih aman**: buka laporan → refetch; DO total kg/nilai dihitung; valuasi pakai bal lunas |

---

## 3. Temuan kritis (tidak pas)

### P0 — Salah / hilang data saat online

1. **Tambah bal ke kupon yang sudah ada**  
   `syncTransaksi`: jika `oldTx` ada → selalu jalur `updateTimbang`, **tidak menambah item sortir di BE**.  
   Setelah login/refresh, bal tambahan hilang dari server.

2. **Pengiriman: Local dulu, ID & stok beda dengan BE**  
   FE: `pengiriman_id` lokal, stok bal → `keluar`.  
   BE: ID `SJ-…`, stok → `siap_kirim`.  
   Response API tidak menggantikan state Local sepenuhnya.

3. **Sample batch: create OK, update status/QC Local only**  
   ID FE vs BE (`SPL####`) bisa drift; update batch di Status Batch tidak ke API → hilang setelah `getBatchSampleList()`.

4. **Setelah bayar: merge bal FE + bal BE**  
   Risiko duplikat / orphan sampai refetch penuh; sebaiknya trust list BE saja.

### P1 — Paritas API & enum

5. Hapus harga / transaksi / batch / DO: Local saja → muncul lagi dari API.  
6. `status_tahap` setelah timbang: BE `menunggu_timbang` vs FE `hitungUlangKupon` (`proses_sortir`). Merge sync bisa menimpa logika FE.  
7. `status_stok` `proses_sortir` hanya di FE; BE menolak.  
8. `updateBarang` FE belum kirim `lokasi_blok` / `gudang_id` (BE sudah siap); handler belum di-pass ke komponen.  
9. Route bisnis belum wajib `auth:sanctum` (token FE sering tidak “mengikat” mutasi).

### P2 — Konsistensi & utang teknis

10. RBAC dari `rbac.ts` hardcode; login BE kirim `capabilities`/`modules` tapi di-drop di mapper.  
11. Legacy `sampleList` masih Local; dashboard API mati.  
12. `item_id` sortir FE (`BAL-ITEM-…`) ≠ BE (`{TRX}-BAL-nn`); timbang sudah fallback `no_bal` (baik), tapi tetap rentan.

---

## 4. Rencana perbaikan (prioritas)

### Fase A — P0 Sync correctness (kerjakan dulu)

| # | Tugas | FE | BE |
|---|--------|----|----|
| A1 | Endpoint sync item sortir untuk kupon existing (replace/append items) | `syncTransaksi`: jika ada item baru / berubah grade → panggil endpoint ini, bukan hanya timbang | `PUT /transaksi/{id}/sortir-items` atau setara |
| A2 | Setelah create pengiriman/sample: **replace state** dengan `res.data` + refetch `barang` | Ubah `handleSaveNewPengiriman`, `saveBatchSample` | Pastikan response lengkap (header + items + stok) |
| A3 | Satukan aturan stok DO: pilih `keluar` **atau** `siap_kirim` di FE+BE | Sesuaikan status saat save DO | Sesuaikan `PengirimanController::store` |
| A4 | Setelah `bayar` sukses: jangan merge bal FE; pakai `getBarangList()` saja | `handleSaveTransaksi` | — |
| A5 | Wire update sample/batch status ke API | `handleUpdateBatchSample` + Status Batch | `PUT /sample-batch/{id}` (+ item status) |

**Definition of done A:** refresh/login online → isi Sortir multi-bal, Sample QC, dan DO sama dengan yang baru disimpan.

### Fase B — P1 API parity

| # | Tugas | Catatan |
|---|--------|---------|
| B1 | `DELETE` (atau nonaktif) harga beli & jual + wire FE | Hapus tidak “bangkit” lagi |
| B2 | `DELETE` / soft-delete transaksi + wire FE | Soft-delete lebih aman jika sudah ada barang |
| B3 | `PUT /pengiriman/{id}/status` (+ optional delete sesuai aturan) | Status Batch & Pengiriman |
| B4 | Wire `handleUpdateBarang` ke UI stok/laporan; payload lengkap | Manfaatkan BE yang sudah ada |
| B5 | Perbaiki `updateTimbang` → `status_tahap` selaras FE (`proses_sortir` / lengkap saat semua ditimbang) | Hindari clobber di merge |
| B6 | Pasang `auth:sanctum` di route mutasi | Health tetap public |

### Fase C — P2 Local & UX

| # | Tugas |
|---|--------|
| C1 | Kebijakan cache: setelah login sukses, server wins per domain (dokumentasikan konflik) |
| C2 | Deprecate `sampleList` legacy atau migrasi ke batch API |
| C3 | Pakai `/dashboard/stats` + refresh list saat buka laporan; mapper DO isi total kg/nilai; valuasi = bal lunas | **Done 2026-09-18** |
| C4 | RBAC dari BE (`/auth/me` / login capabilities) atau dokumentasikan bahwa hardcode sengaja |
| C5 | Samakan generator `item_id` / selalu match by `no_bal` |
| C6 | Audit trail API (opsional; sekarang Local-only) |

---

## 5. Urutan kerja yang disarankan

```
1. A1 Sortir multi-bal     ← paling merusak pembelian
2. A3 + A2 Pengiriman ID/stok
3. A5 + A2 Sample status
4. A4 Bayar → barang dari BE
5. B5 status_tahap timbang
6. B1–B3 delete/update parity
7. B4, B6, lalu Fase C
```

Jangan campur dengan cutover `newplan-db` sampai alur sync di atas stabil (kecuali diputuskan redesign dulu).

---

## 6. Checklist uji manual (setelah tiap fase)

- [ ] Online: buat kupon → tambah 2–3 bal → refresh → bal lengkap di Sortir & DB  
- [ ] Timbang semua bal → `status_tahap` FE=BE  
- [ ] Bayar → `barang` di DB = list FE; tidak dobel  
- [ ] Buat sample → ubah status item (nego/setuju) → refresh → status tetap  
- [ ] Buat DO → refresh → ID & stok bal konsisten  
- [ ] Hapus harga (setelah B1) → refresh → tetap hilang/nonaktif  
- [ ] Offline: simpan → online: perilaku sesuai kebijakan (tidak silent overwrite tanpa aturan)

---

## 7. Catatan

- Perubahan harga beli terkini (upsert + `HB-` sequence + `GradeMaster::firstOrCreate`) **sudah selaras** arah yang benar.  
- Masalah terbesar bukan “localStorage rusak”, melainkan **mutasi penting masih Local-authoritative** sementara login **menarik ulang dari BE** → Local kalah.  
- Perbaikan inti: **API complete untuk setiap aksi UI**, lalu Local hanya cache mirror.
