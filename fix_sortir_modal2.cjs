const fs = require('fs');

let code = fs.readFileSync('src/components/transaksi/Proses1SortirModal.tsx', 'utf8');

// Update SortirBalItem interface
code = code.replace(/  gantiTikar: boolean; \/\/ true = \+75.000 \(tara 2kg\), false = 0 \(tara 3kg\)\n/g, '');
code = code.replace(/  potonganTikar: number;\n/g, '');

// Update handleAddManualRow
code = code.replace(/gantiTikar: activeDefaultGantiTikar,\n/g, '');
code = code.replace(/potonganTikar: activeDefaultGantiTikar \? 75000 : 0,\n/g, '');

// Remove activeDefaultGantiTikar
code = code.replace(/const \[activeDefaultGantiTikar, setActiveDefaultGantiTikar\] = useState<boolean>\(true\);\n/g, '');

// Fix handleScannerSubmit
code = code.replace(/gantiTikar: activeDefaultGantiTikar,\n/g, '');
code = code.replace(/potonganTikar: activeDefaultGantiTikar \? 75000 : 0,\n/g, '');
code = code.replace(/\(Grade \$\{activeDefaultGrade\} • \$\{activeDefaultGantiTikar \? 'Ganti Tikar' : 'Tikar Standar'\}\)/g, '(Grade ${activeDefaultGrade})');

// Update totalPotonganItem
code = code.replace(/const totalPotonganItem = item\.potonganKuli \+ item\.potonganTali \+ item\.potonganTikar;/g, 'const totalPotonganItem = item.potonganKuli + item.potonganTali;');

// Update Tara display logic
code = code.replace(/const taraKg = item\.gantiTikar \? 2 : 3;/g, 'const taraKg = 2; // Default tara');
code = code.replace(/\{item\.gantiTikar \? '\+ Tikar 75rb' : ''\}/g, '');
code = code.replace(/\{item\.gantiTikar \? 'bg-amber-100 text-amber-800' : 'bg-blue-50 text-blue-800'\}/g, "'bg-blue-50 text-blue-800'");
code = code.replace(/\{item\.gantiTikar \? 'Tara Ganti Tikar' : 'Tara Standar'\}/g, "'Tara Standar'");

// Update mapping to DB
code = code.replace(/ganti_tikar: item\.gantiTikar,\n/g, 'ganti_tikar: false,\n');
code = code.replace(/potongan_tikar_rp: item\.potonganTikar,\n/g, 'potongan_tikar_rp: 0,\n');

// Remove header checkbox setting activeDefaultGantiTikar
// (Actually we already regexed part of it out, but let's just make sure)
code = code.replace(/<div className="flex items-center space-x-2">[\s\S]*?<\/div>/, '<div className="flex items-center space-x-2"></div>');

// Remove column headers
code = code.replace(/<th className="py-2 px-3 border-r border-gray-200 w-48 text-center">\s*Opsi Ganti Tikar\s*<\/th>/, '');

fs.writeFileSync('src/components/transaksi/Proses1SortirModal.tsx', code);
