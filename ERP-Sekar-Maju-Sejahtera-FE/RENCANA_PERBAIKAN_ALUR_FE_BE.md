# Rencana Perbaikan Alur FE → BE → Local Storage

Tanggal review: 2026-09-18 (status diperbarui 2026-09-21)  
Scope: alur aplikasi **saat ini** (bukan redesign `newplan-db.md`).  
Dokumen terkait DB redesign ditahan sampai perintah: `lanjut rencana mapping db`.

---

## Status implementasi

| Fase | Status | Catatan |
|------|--------|---------|
| **A (P0)** | **Selesai (2026-09-18)** | `PUT /transaksi/{id}/sortir-items`, `PUT /sample-batch/{id}`, DO stok=`keluar`, sync FE API-first + refetch barang setelah bayar/sample/DO |
| **D (keandalan simpan)** | **Selesai FE (2026-09-20)** | Antrean sinkron kupon, verifikasi hasil server, percobaan ulang, muat ulang server tidak menimpa perubahan tertunda, lencana status di Header. Perlu dukungan BE: lihat `DOKUMENTASI_DATABASE.md` bagian 6 |
| **E (antrean mutasi non-kupon)** | **Selesai FE (2026-09-21)** | Hapus batch sample/Surat Jalan/kupon, edit petani/harga/batch/Surat Jalan, status bal dan akun kini lewat `antrianMutasi` (dicoba ulang, diverifikasi, ditimpakan ke daftar server dua kali). Perlu dukungan BE: `DOKUMENTASI_DATABASE.md` bagian 5.3 |
| **F (audit menyeluruh)** | **Selesai FE (2026-09-21)** | Daftar sample lama yang hanya lokal dihapus (laporan sample dari batch server), Jumlah Bayar Kasir = Laporan Pembelian, bal karangan di payload kupon dihapus, status Draft batch dikirim ke server dengan fallback, jalur mati `/koreksi` dan `/dashboard/stats` dilepas, `deploy.yml` yang rusak (konflik merge) dipulihkan. Rincian: `LAPORAN_AUDIT_2026-09-21.md` |
| B (P1) | Sebagian | Delete harga tidak ada di UI. Delete transaksi/batch/DO dan wire update barang sudah di FE; endpoint BE menunggu (5.3). auth:sanctum belum |
| **C3 laporan** | **Selesai sebagian (2026-09-18)** | Refresh list saat buka `modul-6-*`, `getDashboardStats` + fallback SQL, mapper DO isi `total_berat_kg`/`total_nilai_deal`, laporan valuasi pakai `barangLunasList` |
| C (P2 sisanya) | Belum | RBAC BE, deprecate sample legacy |
| **G (server satu-satunya sumber data)** | **Selesai FE + BE (2026-09-24)** | Keluhan: tambah tidak bertambah, edit tidak berganti, hapus muncul lagi antar perangkat/akun. Antrean lokal yang "menang" diganti: perubahan non-kupon langsung ke server, kupon sebagai operasi per bal (`POST/PATCH/DELETE /transaksi/{id}/bal`), sinkron inkremental tiap 3 detik (`GET /sync/perubahan`, trigger `updated_at` + `sync_hapus`), relasi Surat Jalan ↔ batch dihitung server, sesi 401 = login ulang. Uji: `SinkronRelasiTest` (BE) dan `scripts/uji-dua-perangkat` (57 pemeriksaan lulus). Rincian: `DOKUMENTASI_DATABASE.md` bagian 5.5 |

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

> Matriks dan temuan di bagian 2–3 adalah kondisi saat review 2026-09-18 dan disimpan sebagai riwayat.
> Kondisi terkini per menu (baca/tambah/ubah/hapus dan endpoint yang masih ditunggu dari backend) ada di
> `DOKUMENTASI_DATABASE.md` bagian 5.3.

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

---

## 6. Fase D: keandalan simpan kupon (2026-09-20)

Temuan pemakaian produksi 3 hari (ganti tikar dan berat timbang kadang tidak tersimpan di DB) berakar pada
frontend, bukan hanya backend:

| Temuan | Perbaikan FE |
|--------|--------------|
| `syncTransaksi` menelan galat, data hanya lokal, tanpa percobaan ulang | Galat dilempar; `antrianSinkron` menyimpan tugas di localStorage dan mengulang otomatis |
| `refreshOperationalLists` dan `getTransaksiList` mengganti data lokal dengan data server, menghapus perubahan yang belum terkirim | Data server ditimpa dulu dengan tugas tertunda (`terapkanKeDaftar`) |
| Cek `/health` 3 detik; sekali gagal = offline 10 detik | Batas 6 detik; simpanan mencoba permintaan sungguhan tanpa menunggu cek |
| Simpanan beruntun ke satu kupon berjalan bersamaan (salinan lama bisa menimpa) | Satu permintaan per kupon, simpanan berikutnya digabung jadi keadaan terbaru |
| Tidak ada tanda saat simpanan gagal | Lencana di Header + peringatan saat menutup halaman |
| Kupon lama hanya tersimpan lokal (404 saat diubah) atau sudah ada (duplikat saat dibuat) | Jalur ubah dan buat saling menggantikan otomatis |
| Bayar bisa mendahului bal yang baru ditimbang (permintaan digabung) | Bal dikirim dulu, baru `bayar` |

**Yang masih perlu dari BE** (bukan FE): `DOKUMENTASI_DATABASE.md` bagian 6, terutama PUT idempoten, tulis ganti
tikar bersama berat dalam satu transaksi, jawaban memuat `items` lengkap, dan kode status 404/409/401 yang jelas.
