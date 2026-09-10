const fs = require('fs');

let code = fs.readFileSync('src/components/transaksi/TimbanganPageView.tsx', 'utf8');

// 1. Fix the locking bug
code = code.replace(
/  const handleToggleGantiTikar = \(itemId: string\) => \{[\s\S]*?    \);\n  \};\n/m,
`  const handleToggleGantiTikar = (itemId: string) => {
    setWorkingItems((prev) =>
      prev.map((it) => {
        if (it.item_id === itemId) {
          return {
            ...it,
            ganti_tikar: !it.ganti_tikar,
          };
        }
        return it;
      })
    );
  };
`
);

// 2. Add custom potTikarInput state
if (!code.includes('const [potTikarInput')) {
  code = code.replace('const [lokasiBlok, setLokasiBlok] = useState', 'const [potTikarInput, setPotTikarInput] = useState<number>(75000);\n  const [lokasiBlok, setLokasiBlok] = useState');
}

// 3. Update livePotTikar logic
code = code.replace(
  /const livePotTikar = isGantiTikarActive \? 75000 : 0;/g,
  `const livePotTikar = isGantiTikarActive ? potTikarInput : 0;`
);

// 4. Update handleApplyWeightForActiveBal to use livePotTikar
code = code.replace(
  /potongan_tikar: livePotTikar,/g,
  `potongan_tikar: livePotTikar,\n            potongan_tikar_rp: livePotTikar,`
);

fs.writeFileSync('src/components/transaksi/TimbanganPageView.tsx', code);
