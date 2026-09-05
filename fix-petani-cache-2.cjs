const fs = require('fs');
const file = 'src/App.tsx';
let code = fs.readFileSync(file, 'utf8');

const targetStr = "const [pengirimanList, setPengirimanList] = useState<PengirimanBarang[]>(() => loadPengirimanData());";

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

code = code.replace(targetStr, targetStr + "\n" + updateLogic);
fs.writeFileSync(file, code);
