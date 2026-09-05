const fs = require('fs');
const path = require('path');

function walk(dir, callback) {
  fs.readdirSync(dir).forEach(f => {
    let dirPath = path.join(dir, f);
    let isDirectory = fs.statSync(dirPath).isDirectory();
    if (isDirectory) {
      walk(dirPath, callback);
    } else {
      callback(path.join(dir, f));
    }
  });
}

walk('./src', (file) => {
  if (file.endsWith('.tsx') || file.endsWith('.ts')) {
    let content = fs.readFileSync(file, 'utf8');
    let original = content;

    // We will do several Regex replacements.

    // 1. Types
    content = content.replace(/nomor_kartu\??:\s*string;\s*(\/\/.*)?\n?/g, '');

    // 2. Fallbacks in UI e.g., p.nomor_kartu || p.petani_id -> p.petani_id
    content = content.replace(/(?:tx|p|currentPetani|transaksi|petaniData|target|petani)\??\.nomor_kartu\s*\|\|\s*([a-zA-Z0-9_\?\.]+)\.petani_id/g, '$1.petani_id');
    content = content.replace(/([a-zA-Z0-9_\?\.]+)\.nomor_kartu\s*\|\|\s*([a-zA-Z0-9_\?\.]+)\.petani_id/g, '$2.petani_id');
    
    // 3. Fallbacks in reverse e.g. p.petani_id || p.nomor_kartu -> p.petani_id
    content = content.replace(/([a-zA-Z0-9_\?\.]+)\.petani_id\s*\|\|\s*([a-zA-Z0-9_\?\.]+)\.nomor_kartu/g, '$1.petani_id');

    // 4. Assignments like `nomor_kartu: p.nomor_kartu` or `nomor_kartu: ...`
    content = content.replace(/nomor_kartu\s*:\s*[^,]+,\n?/g, '');
    
    // 5. Template literals e.g., ${petani.nomor_kartu} -> ${petani.petani_id}
    content = content.replace(/\$\{([a-zA-Z0-9_\.]+)\.nomor_kartu\}/g, '${$1.petani_id}');
    
    // 6. Direct uses like p.nomor_kartu
    content = content.replace(/([a-zA-Z0-9_\.]+)\.nomor_kartu/g, '$1.petani_id');

    // 7. Text replacements: "Nomor Kartu", "Petani ID", "ID Petani"
    // "Petani ID" -> "ID Petani"
    content = content.replace(/Petani ID/g, 'ID Petani');
    content = content.replace(/ID\/No\. Kartu/gi, 'ID Petani');
    content = content.replace(/No\. Kartu/gi, 'ID Petani');
    content = content.replace(/Nomor Kartu/gi, 'ID Petani');
    content = content.replace(/nomor kartu/gi, 'ID Petani');

    if (content !== original) {
      fs.writeFileSync(file, content, 'utf8');
    }
  }
});
