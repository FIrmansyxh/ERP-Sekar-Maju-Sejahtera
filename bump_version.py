with open('src/utils/storage.ts', 'r') as f:
    content = f.read()

# I want to bump BARANG, TRANSAKSI, SAMPLE, BATCH_SAMPLE, PENGIRIMAN to _v9

replacements = {
    "const KEY_BARANG = 'erp_tembakau_barang_v8';": "const KEY_BARANG = 'erp_tembakau_barang_v9';",
    "const KEY_TRANSAKSI = 'erp_tembakau_transaksi_v8';": "const KEY_TRANSAKSI = 'erp_tembakau_transaksi_v9';",
    "const KEY_SAMPLE = 'erp_tembakau_sample_v8';": "const KEY_SAMPLE = 'erp_tembakau_sample_v9';",
    "const KEY_BATCH_SAMPLE = 'erp_tembakau_batch_sample_v8';": "const KEY_BATCH_SAMPLE = 'erp_tembakau_batch_sample_v9';",
    "const KEY_PENGIRIMAN = 'erp_tembakau_pengiriman_v8';": "const KEY_PENGIRIMAN = 'erp_tembakau_pengiriman_v9';"
}

for k, v in replacements.items():
    content = content.replace(k, v)

with open('src/utils/storage.ts', 'w') as f:
    f.write(content)
print("Versions bumped")
