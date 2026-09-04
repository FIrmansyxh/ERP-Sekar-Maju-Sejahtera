import re

with open('src/components/transaksi/SortirPageView.tsx', 'r') as f:
    content = f.read()

# Add UserType to imports
content = re.sub(r"import\s*{\s*TransaksiPembelian,\s*Petani,\s*TabelHarga,\s*Barang,\s*Gudang,\s*TransaksiItemBal,\s*UserRole\s*}\s*from\s*'\.\./\.\./types';", "import { TransaksiPembelian, Petani, TabelHarga, Barang, Gudang, TransaksiItemBal, UserRole, User as UserType } from '../../types';", content)

# Update Props
props_replacement = """interface SortirPageViewProps {
  petaniList: Petani[];
  hargaList: TabelHarga[];
  transaksiList: TransaksiPembelian[];
  barangList?: Barang[];
  gudangList?: Gudang[];
  userRole: UserRole;
  currentUser?: UserType | null;
  onSaveTransaksi: (newTx: TransaksiPembelian, generatedBarang: Barang | Barang[]) => void;
  onNavigateToTimbangan: (kuponNo?: string, txId?: string, balNo?: string) => void;
}"""
content = re.sub(r"interface SortirPageViewProps \{[\s\S]*?\}", props_replacement, content, count=1)

# Update Signature
sig = """export const SortirPageView: React.FC<SortirPageViewProps> = ({
  petaniList = [],
  hargaList = [],
  transaksiList = [],
  barangList = [],
  gudangList = [],
  userRole,
  currentUser,
  onSaveTransaksi,
  onNavigateToTimbangan,
}) => {"""
content = re.sub(r"export const SortirPageView: React\.FC<SortirPageViewProps> = \(\{[\s\S]*?\}\) => \{", sig, content, count=1)

# Initialize petugasSortirNama with currentUser
content = re.sub(r"const \[petugasSortirNama,\s*setPetugasSortirNama\]\s*=\s*useState\('Grader QC Lab'\);", "const [petugasSortirNama, setPetugasSortirNama] = useState(currentUser?.nama_lengkap || 'Sistem');", content)

# Modify input
input_pattern = r"""<input\s*type="text"\s*value=\{petugasSortirNama\}\s*onChange=\{\(e\)\s*=>\s*setPetugasSortirNama\(e\.target\.value\)\}\s*className="w-full bg-white border border-slate-200 rounded-sm px-3 py-2 text-sm text-slate-900 focus:outline-none focus:border-emerald-500"\s*placeholder="Nama petugas\.\.\."\s*\/>"""
new_input = """<input
                  type="text"
                  value={petugasSortirNama}
                  readOnly
                  disabled
                  className="w-full bg-slate-50 border border-slate-200 rounded-sm px-3 py-2 text-sm text-slate-500 cursor-not-allowed"
                />"""
content = re.sub(input_pattern, new_input, content)

with open('src/components/transaksi/SortirPageView.tsx', 'w') as f:
    f.write(content)
print("Patched Props and Petugas in SortirPageView")
