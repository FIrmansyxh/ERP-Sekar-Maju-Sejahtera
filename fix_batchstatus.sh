sed -i "s/let batchStatus: any = 'sedang_evaluasi';/let batchStatus: any = 'sample';/g" src/components/pengiriman/StatusBatchPengirimanManagement.tsx
sed -i "s/if (countAcc === batchItems.length) batchStatus = 'selesai_deal';/if (countAcc > 0) batchStatus = 'diproses';/g" src/components/pengiriman/StatusBatchPengirimanManagement.tsx
sed -i "s/else if (countTolak === batchItems.length) batchStatus = 'ditolak_semua';/else if (countTolak === batchItems.length) batchStatus = 'dibatalkan';/g" src/components/pengiriman/StatusBatchPengirimanManagement.tsx
sed -i "s/else if (countAcc > 0 && countAcc + countTolak === batchItems.length) batchStatus = 'deal_sebagian';//g" src/components/pengiriman/StatusBatchPengirimanManagement.tsx
