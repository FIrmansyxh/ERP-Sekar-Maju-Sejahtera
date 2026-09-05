const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

// We can add a useEffect that loops through petaniList and updates any name that starts with "Petani 20"
const importStr = "import { getInitialData, savePetaniData, saveTransaksiData, saveBarangData, savePengirimanData } from './utils/storage';";

const updateLogic = `
  useEffect(() => {
    // TEMPORARY MIGRATION: Update "Petani 20xx" to real names
    let needsUpdate = false;
    const names = [
      "Abdullah", "Ahmad", "Amin", "Amir", "Anwar", "Arifin", "Azis", "Bahrudin", "Basri", "Budi Santoso",
      "Dhofir", "Djumadi", "Fadil", "Faruq", "Fauzi", "Ghozali", "Habib", "Hadi", "Hafid", "Hasan Basri",
      "Hasyim", "Husen", "Ibrahim", "Imam", "Ismail", "Jalal", "Jamil", "Junaidi", "Kamarudin", "Kholil",
      "Lutfi", "Mahfud", "Mansyur", "Muis", "Mujib", "Mukhlis", "Munir", "Mustofa", "Nawawi", "Nurkholis",
      "Qosim", "Rahman", "Rasyid", "Rizal", "Romli", "Roni", "Saifuddin", "Samsudin", "Sanusi", "Sholeh",
      "Subaidi", "Sudar", "Supriyadi", "Syaiful", "Syukur", "Taufiq", "Tohir", "Wahab", "Wahid", "Wawan",
      "Yasin", "Yunus", "Yusuf", "Zainal", "Zaini"
    ];
    
    const newPetani = petaniList.map((p, i) => {
      if (p.nama_petani && p.nama_petani.startsWith('Petani 20')) {
        needsUpdate = true;
        return { ...p, nama_petani: names[i % names.length] };
      }
      return p;
    });

    if (needsUpdate) {
      savePetaniData(newPetani);
      setPetaniList(newPetani);

      // Also update transactions that might have cached the old name
      let txUpdated = false;
      const newTx = transaksiList.map(tx => {
        if (tx.nama_petani && tx.nama_petani.startsWith('Petani 20')) {
          txUpdated = true;
          const p = newPetani.find(p => p.petani_id === tx.petani_id);
          return { ...tx, nama_petani: p ? p.nama_petani : tx.nama_petani };
        }
        return tx;
      });
      if (txUpdated) {
        saveTransaksiData(newTx);
        setTransaksiList(newTx);
      }

      // Also update barang
      let brgUpdated = false;
      const newBrg = barangList.map(b => {
        if (b.nama_petani && b.nama_petani.startsWith('Petani 20')) {
          brgUpdated = true;
          const p = newPetani.find(p => p.petani_id === b.petani_id);
          return { ...b, nama_petani: p ? p.nama_petani : b.nama_petani };
        }
        return b;
      });
      if (brgUpdated) {
        saveBarangData(newBrg);
        setBarangList(newBrg);
      }
    }
  }, [petaniList, transaksiList, barangList]);
`;

code = code.replace(
  "  const [pengirimanList, setPengirimanList] = useState<PengirimanBarang[]>([]);",
  "  const [pengirimanList, setPengirimanList] = useState<PengirimanBarang[]>([]);" + updateLogic
);

fs.writeFileSync(file, code);
