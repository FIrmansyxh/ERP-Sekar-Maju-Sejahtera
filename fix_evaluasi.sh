sed -i "s/let computedBatchStatus: StatusBatchSample = 'sedang_evaluasi';/let computedBatchStatus: StatusBatchSample = 'sample';/g" src/components/sample/BatchEvaluasiSortirModal.tsx
sed -i "s/computedBatchStatus = 'selesai_deal';/computedBatchStatus = 'diproses';/g" src/components/sample/BatchEvaluasiSortirModal.tsx
sed -i "s/computedBatchStatus = 'ditolak_semua';/computedBatchStatus = 'dibatalkan';/g" src/components/sample/BatchEvaluasiSortirModal.tsx
sed -i "s/computedBatchStatus = 'deal_sebagian';/computedBatchStatus = 'diproses';/g" src/components/sample/BatchEvaluasiSortirModal.tsx
sed -i "s/computedBatchStatus = 'sedang_evaluasi';/computedBatchStatus = 'sample';/g" src/components/sample/BatchEvaluasiSortirModal.tsx
