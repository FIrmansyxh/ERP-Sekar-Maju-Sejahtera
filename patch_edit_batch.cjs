const fs = require('fs');
let file = 'src/components/sample/SampleManagement.tsx';
let code = fs.readFileSync(file, 'utf8');

// 1. Remove EditBatchMetadataModal state and import
code = code.replace(/import \{ EditBatchMetadataModal \} from '\.\/EditBatchMetadataModal';\n/, '');
code = code.replace(/const \[editingBatchMetadata, setEditingBatchMetadata\] = useState<BatchPengirimanSample \| null>\(null\);/, 'const [editingBatchId, setEditingBatchId] = useState<string | null>(null);');

// 2. Remove EditBatchMetadataModal render
code = code.replace(/<EditBatchMetadataModal[\s\S]*?\/>\s*<BatchEvaluasi/, '<BatchEvaluasi');

// 3. Update the Edit button to populate the form
const editBtnPattern = /onClick=\{\(\) => setEditingBatchMetadata\(batch\)\}/;
const editBtnReplacement = `onClick={() => {
                                  // Populate the form
                                  setEditingBatchId(batch.batch_id);
                                  setTujuanBuyer(batch.tujuan_buyer || '');
                                  setPermintaanBuyer(batch.permintaan_buyer || '');
                                  setSumberGudang(batch.sumber_gudang || '');
                                  setTanggalKirim(batch.tanggal_kirim || '');
                                  setDikirimOleh(batch.dikirim_oleh || '');
                                  setCatatanBatchForm(batch.catatan || '');
                                  
                                  const items = batch.items?.map(it => ({
                                    barangId: it.barang_id,
                                    noBal: it.no_bal,
                                    kodeBalPembeli: it.kode_bal_pembeli || it.no_bal,
                                    grade: it.kode_grade,
                                    beratBalKg: it.berat_bal_kg,
                                    kodeHargaJual: it.kode_harga_jual || '-',
                                    hargaTawaranKg: it.harga_tawaran_kg
                                  })) || [];
                                  setSelectedBalItems(items);
                                  window.scrollTo({ top: 0, behavior: 'smooth' });
                                }}`;
code = code.replace(editBtnPattern, editBtnReplacement);

// 4. Update the save logic in handleSaveBatchForm
const savePattern = /const nextBatchId = generateBatchSampleId\(activeBatchSampleList\.length \+ 1\);[\s\S]*?if \(onSaveBatchSample\) \{[\s\S]*?onSaveBatchSample\(newBatch, updatedBarangs\);[\s\S]*?\} else \{/;

const saveReplacement = `const nextBatchId = editingBatchId || generateBatchSampleId(activeBatchSampleList.length + 1);
    const existingBatch = activeBatchSampleList.find(b => b.batch_id === editingBatchId);
    
    const items: SampleItemDetail[] = selectedBalItems.map((s, idx) => {
      const existingItem = existingBatch?.items.find(i => i.barang_id === s.barangId);
      return {
        sample_item_id: existingItem?.sample_item_id || generateSampleId(s.grade, null, idx + 1),
        barang_id: s.barangId,
        no_bal: s.noBal,
        kode_bal_pembeli: s.kodeBalPembeli,
        kode_grade: s.grade,
        kode_harga_jual: s.kodeHargaJual,
        berat_bal_kg: s.beratBalKg,
        harga_tawaran_kg: s.hargaTawaranKg,
        status_item: existingItem?.status_item || 'dikirim',
        sudah_dikirim_do: existingItem?.sudah_dikirim_do || false,
      };
    });

    const totalEstimasiNilai = items.reduce((sum, it) => sum + it.berat_bal_kg * it.harga_tawaran_kg, 0);

    const newBatch: BatchPengirimanSample = {
      ...existingBatch,
      batch_id: nextBatchId,
      kode_batch: existingBatch?.kode_batch || nextBatchId,
      tujuan_buyer: finalTujuan,
      permintaan_buyer: permintaanBuyer,
      sumber_gudang: sumberGudang,
      tanggal_kirim: tanggalKirim,
      status: existingBatch?.status || 'sample',
      dikirim_oleh: dikirimOleh.trim(),
      catatan: catatanBatchForm.trim(),
      items: items,
      total_sample_bal: items.length,
      total_bal_disetujui: existingBatch?.total_bal_disetujui || 0,
      total_bal_ditolak: existingBatch?.total_bal_ditolak || 0,
      total_bal_nego: existingBatch?.total_bal_nego || 0,
      total_estimasi_nilai: totalEstimasiNilai,
      total_nilai_deal: existingBatch?.total_nilai_deal || 0,
    };

    // Find removed items and restore to di_gudang
    const selectedIds = new Set(selectedBalItems.map((s) => s.barangId));
    let finalBarangList = [...barangList];
    
    if (existingBatch) {
      const removedItemIds = existingBatch.items
        .filter(it => !selectedIds.has(it.barang_id))
        .map(it => it.barang_id);
        
      if (removedItemIds.length > 0) {
        const removedSet = new Set(removedItemIds);
        finalBarangList = finalBarangList.map(b => {
          if (removedSet.has(b.barang_id)) {
            return {
              ...b,
              status_stok: 'di_gudang' as const,
              catatan_qc: b.catatan_qc?.replace(\`Sample Batch \${editingBatchId} dikirim ke \${existingBatch.tujuan_buyer}\`, '').trim()
            };
          }
          return b;
        });
      }
    }

    // Update new items to terkirim_sample
    const updatedBarangs = finalBarangList.map((b) => {
      if (selectedIds.has(b.barang_id)) {
        return {
          ...b,
          status_stok: 'terkirim_sample' as const,
          catatan_qc: \`Sample Batch \${nextBatchId} dikirim ke \${finalTujuan}\`,
        };
      }
      return b;
    });

    if (editingBatchId && onUpdateBatchSample) {
      onUpdateBatchSample(newBatch, updatedBarangs);
      setEditingBatchId(null);
    } else if (onSaveBatchSample) {
      onSaveBatchSample(newBatch, updatedBarangs);
    } else {`;
    
code = code.replace(savePattern, saveReplacement);

// Change button text when editing
code = code.replace(
  /<span>Simpan & Buat Batch Sample<\/span>/,
  '<span>{editingBatchId ? "Perbarui Batch Sample" : "Simpan & Buat Batch Sample"}</span>'
);

// Add Batal Edit button
const saveBtnSection = /<button\s*type="button"\s*disabled=\{selectedBalItems\.length === 0 \|\| \!tujuanBuyer\.trim\(\)\}\s*onClick=\{handleSaveBatchForm\}/;
const btnReplacement = `{editingBatchId && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditingBatchId(null);
                      handleDeselectAll();
                      setTujuanBuyer('');
                      setPermintaanBuyer('');
                      setCatatanBatchForm('');
                    }}
                    className="px-4 py-2 text-xs font-semibold text-gray-700 bg-gray-100 hover:bg-gray-200 rounded-sm transition cursor-pointer"
                  >
                    Batal Edit
                  </button>
                )}
                <button
                  type="button"
                  disabled={selectedBalItems.length === 0 || !tujuanBuyer.trim()}
                  onClick={handleSaveBatchForm}`;
code = code.replace(saveBtnSection, btnReplacement);

fs.writeFileSync(file, code);
console.log('Patched SampleManagement.tsx for Edit Batch');
