const fs = require('fs');
const file = 'src/components/petani/PetaniDetailDrawer.tsx';
let code = fs.readFileSync(file, 'utf8');

// Add import for TransaksiPembelian if needed (already imported?)
// Let's check imports
code = code.replace(
  "import { Petani, UserRole } from '../../types';",
  "import { Petani, UserRole, TransaksiPembelian } from '../../types';"
);

// Add to interface
const targetInterface = `interface PetaniDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  petani: Petani | null;
  userRole: UserRole;`;
const newInterface = `interface PetaniDetailDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  petani: Petani | null;
  userRole: UserRole;
  transaksiList?: TransaksiPembelian[];`;
code = code.replace(targetInterface, newInterface);

// Add to Component props
const targetProps = `export const PetaniDetailDrawer: React.FC<PetaniDetailDrawerProps> = ({
  isOpen,
  onClose,
  petani,
  userRole,`;
const newProps = `export const PetaniDetailDrawer: React.FC<PetaniDetailDrawerProps> = ({
  isOpen,
  onClose,
  petani,
  userRole,
  transaksiList = [],`;
code = code.replace(targetProps, newProps);

// Compute real transactions and statistics
const mockDataReplace = `const mockTransactions = [
    {
      no_bal: 'BAL-WRA-8821',
      tanggal: petani.statistik?.kunjungan_terakhir || '2026-08-10',
      grade: petani.statistik?.grade_dominan || 'Grade A',
      berat_kg: 46.5,
      potongan: '2.0 Kg',
      status: 'Selesai Dibayar',
    },
    {
      no_bal: 'BAL-WRA-8790',
      tanggal: '2026-08-08',
      grade: 'Grade B',
      berat_kg: 52.0,
      potongan: '2.5 Kg',
      status: 'Selesai Dibayar',
    },
  ];`;
  
const computeRealData = `const realTransactions = transaksiList
    .filter((tx) => tx.petani_id === petani.petani_id)
    .sort((a, b) => new Date(b.tanggal_transaksi).getTime() - new Date(a.tanggal_transaksi).getTime());

  const totalBalComputed = realTransactions.reduce((acc, tx) => acc + (tx.items ? tx.items.length : 1), 0);
  const totalBeratComputed = realTransactions.reduce((acc, tx) => acc + (tx.berat_kg || 0), 0);
  const gradeDominanComputed = realTransactions.length > 0 ? realTransactions[0].kode_grade : 'N/A';
`;
code = code.replace(mockDataReplace, computeRealData);

// Update title dynamically for the tab
const targetTabTitle = `<button
            onClick={() => setActiveTab('transaksi')}
            className={\`px-4 py-2 text-xs font-bold transition cursor-pointer border-b-2 -mb-px \${
              activeTab === 'transaksi'
                ? 'border-gray-800 text-gray-900 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }\`}
          >
            Riwayat Setoran (0 Bal)
          </button>`;
const newTabTitle = `<button
            onClick={() => setActiveTab('transaksi')}
            className={\`px-4 py-2 text-xs font-bold transition cursor-pointer border-b-2 -mb-px \${
              activeTab === 'transaksi'
                ? 'border-gray-800 text-gray-900 bg-white'
                : 'border-transparent text-gray-500 hover:text-gray-800'
            }\`}
          >
            Riwayat Setoran ({totalBalComputed} Bal)
          </button>`;
code = code.replace(targetTabTitle, newTabTitle);

// Use computed values in Statistics Card
code = code.replace(
  `{petani.statistik?.total_setoran_bal || 0}`,
  `{totalBalComputed}`
);
code = code.replace(
  `{petani.statistik?.total_berat_kg || 0} kg`,
  `{totalBeratComputed.toLocaleString('id-ID')} kg`
);
code = code.replace(
  `{petani.statistik?.grade_dominan || 'Grade A'}`,
  `{gradeDominanComputed}`
);

// Update Render for Transaksi
const targetRenderTx = `              <div className="border border-gray-200 divide-y divide-gray-200">
                {mockTransactions.map((tx, idx) => (
                  <div key={idx} className="p-3 hover:bg-gray-50 flex items-center justify-between text-xs">
                    <div>
                      <span className="font-mono font-bold text-gray-900 block">{tx.no_bal}</span>
                      <span className="text-[11px] text-gray-500">Tgl: {tx.tanggal} • Grade: {tx.grade}</span>
                    </div>
                    <div className="text-right">
                      <span className="font-mono font-bold text-gray-900 block">{tx.berat_kg} kg</span>
                      <span className="text-[10px] text-emerald-700 font-semibold">{tx.status}</span>
                    </div>
                  </div>
                ))}
              </div>`;

const newRenderTx = `              <div className="border border-gray-200 divide-y divide-gray-200">
                {realTransactions.map((tx, idx) => {
                  const items = tx.items || [];
                  const subtotal = tx.total_harga_beli || (tx.berat_kg * tx.harga_per_kg);
                  const jmlBayar = tx.harga_final || (subtotal - (tx.total_potongan || 7000));
                  const isLunas = tx.status_pembayaran === 'lunas';

                  return (
                    <div key={idx} className="p-3 hover:bg-gray-50 flex items-center justify-between text-xs">
                      <div>
                        <div className="flex items-center space-x-1.5 mb-0.5">
                          <span className="font-mono font-bold text-gray-900">Kupon: {tx.no_kupon || '-'}</span>
                          <span className="text-gray-300">|</span>
                          <span className="font-semibold text-gray-700">{items.length} Bal</span>
                        </div>
                        <div className="text-[11px] text-gray-500">
                          Tgl: {formatDateIndo(tx.tanggal_transaksi)} • Grade: {tx.kode_grade}
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="flex items-center justify-end space-x-2">
                          <span className="font-mono font-bold text-blue-800">{tx.berat_kg} kg</span>
                          <span className="font-mono font-bold text-[#b81d24]">Rp {jmlBayar.toLocaleString('id-ID')}</span>
                        </div>
                        <span className={\`text-[10px] font-semibold mt-0.5 inline-block px-1.5 py-0.5 rounded-xs \${isLunas ? 'bg-emerald-50 text-emerald-700 border border-emerald-200' : 'bg-amber-50 text-amber-700 border border-amber-200'}\`}>
                          {isLunas ? '✓ Sudah Dibayar' : '⏳ Belum Dibayar'}
                        </span>
                      </div>
                    </div>
                  );
                })}
                {realTransactions.length === 0 && (
                  <div className="p-4 text-center text-gray-500 text-xs">
                    Belum ada riwayat transaksi.
                  </div>
                )}
              </div>`;

code = code.replace(targetRenderTx, newRenderTx);

fs.writeFileSync(file, code);
