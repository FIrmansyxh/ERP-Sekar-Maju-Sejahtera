const fs = require('fs');
let content = fs.readFileSync('src/components/harga/HargaManagement.tsx', 'utf8');

const checkboxHtml = `
              {/* Status Aktif */}
              <div className="flex items-center space-x-2 pt-1">
                <input
                  type="checkbox"
                  id="chk-status-aktif-beli"
                  checked={formStatusAktif}
                  onChange={(e) => setFormStatusAktif(e.target.checked)}
                  className="rounded-xs text-[#b81d24] focus:ring-[#b81d24]"
                />
                <label htmlFor="chk-status-aktif-beli" className="text-xs text-gray-700 select-none cursor-pointer">
                  Aktifkan kode harga ini
                </label>
              </div>
`;

content = content.replace('{/* Modal Actions */}', checkboxHtml + '              {/* Modal Actions */}');
fs.writeFileSync('src/components/harga/HargaManagement.tsx', content);
