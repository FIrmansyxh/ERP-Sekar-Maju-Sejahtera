import re

with open('src/components/transaksi/Proses1SortirModal.tsx', 'r') as f:
    content = f.read()

# Add UserType to imports
content = re.sub(r"import { Petani, TabelHarga, TransaksiPembelian, TransaksiItemBal, Gudang } from '\.\./\.\./types';", "import { Petani, TabelHarga, TransaksiPembelian, TransaksiItemBal, Gudang, User as UserType, Barang } from '../../types';", content)

# Update Props interface
props_replacement = """interface Proses1SortirModalProps {
  isOpen: boolean;
  onClose: () => void;
  petaniList: Petani[];
  hargaList: TabelHarga[];
  gudangList?: Gudang[];
  barangList: Barang[];
  currentUser?: UserType | null;
  onSaveSortir: (newTx: TransaksiPembelian) => void;
}"""
content = re.sub(r"interface Proses1SortirModalProps \{[\s\S]*?\}", props_replacement, content, count=1)

# Update component signature
sig = """export const Proses1SortirModal: React.FC<Proses1SortirModalProps> = ({
  isOpen,
  onClose,
  petaniList,
  hargaList,
  gudangList = [],
  barangList,
  currentUser,
  onSaveSortir,
}) => {"""
content = re.sub(r"export const Proses1SortirModal: React\.FC<Proses1SortirModalProps> = \(\{[\s\S]*?\}\) => \{", sig, content, count=1)

# Initialize petugasSortirNama with currentUser
content = re.sub(r"const \[petugasSortirNama,\s*setPetugasSortirNama\]\s*=\s*useState\('Petugas Sortir & Grader QC'\);", "const [petugasSortirNama, setPetugasSortirNama] = useState(currentUser?.nama_lengkap || 'Sistem');", content)

# Make sure it updates if currentUser changes, though maybe not strictly needed.
# But we should also make the input readonly or just display text. Let's find the input.
input_pattern = r"""<input\s*type="text"\s*value=\{petugasSortirNama\}\s*onChange=\{\(e\)\s*=>\s*setPetugasSortirNama\(e\.target\.value\)\}\s*placeholder="Nama petugas\.\.\."\s*className="flex-1 min-w-0 block w-full px-3 py-2 sm:text-sm border-gray-300 rounded-md focus:ring-emerald-500 focus:border-emerald-500"\s*\/>"""
new_input = """<input
                  type="text"
                  value={petugasSortirNama}
                  readOnly
                  disabled
                  className="flex-1 min-w-0 block w-full px-3 py-2 sm:text-sm border-gray-200 bg-gray-50 text-gray-500 rounded-md"
                />"""
content = re.sub(input_pattern, new_input, content)

with open('src/components/transaksi/Proses1SortirModal.tsx', 'w') as f:
    f.write(content)
print("Patched Props and Petugas in Proses1SortirModal")
