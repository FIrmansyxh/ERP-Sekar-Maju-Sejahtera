const fs = require('fs');
const file = 'src/components/laporan/DashboardAnalyticView.tsx';
let code = fs.readFileSync(file, 'utf8');

// Update trendPembelianBulanan calculation
code = code.replace(
`    transaksiList.forEach((trx) => {
      if (trx.tanggal_transaksi) {
        const month = trx.tanggal_transaksi.substring(0, 7); 
        const berat = trx.berat_kg || 0;
        if (monthlyData[month]) {
          monthlyData[month] += berat;
        } else {
          monthlyData[month] = berat;
        }
      }
    });

    return Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, totalKg]) => {
        const date = new Date(\`\${month}-01\`);
        const monthName = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
        return {
          month: monthName,
          totalKg: Math.round(totalKg),
          rawMonth: month,
        };
      });`,
`    transaksiList.forEach((trx) => {
      if (trx.tanggal_transaksi) {
        const month = trx.tanggal_transaksi.substring(0, 7); 
        const balCount = trx.total_bal || (trx.items ? trx.items.length : (trx.barang_ids ? trx.barang_ids.length : 1));
        if (monthlyData[month]) {
          monthlyData[month] += balCount;
        } else {
          monthlyData[month] = balCount;
        }
      }
    });

    return Object.entries(monthlyData)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([month, totalBal]) => {
        const date = new Date(\`\${month}-01\`);
        const monthName = date.toLocaleDateString('id-ID', { month: 'short', year: 'numeric' });
        return {
          month: monthName,
          totalBal: Math.round(totalBal),
          rawMonth: month,
        };
      });`
);

// Update chart display text
code = code.replace(
  `              <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                Tren Total Berat Pembelian Bulanan
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Total tonase masuk (kg) per bulan berdasarkan transaksi
              </p>`,
  `              <h3 className="text-sm font-bold text-gray-900 tracking-tight">
                Tren Total Bal Pembelian Bulanan
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Jumlah bal masuk per bulan berdasarkan transaksi
              </p>`
);

// Update Recharts tooltips & bars
code = code.replace(
  `                  <YAxis 
                    tick={{ fontSize: 10, fill: '#6B7280' }} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(value) => \`\${value} kg\`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#F3F4F6' }}
                    contentStyle={{ borderRadius: '4px', border: '1px solid #E5E7EB', fontSize: '11px', fontWeight: 'bold' }}
                    formatter={(value: number) => [\`\${value.toLocaleString('id-ID')} kg\`, 'Total Pembelian']}
                  />
                  <Bar dataKey="totalKg" fill="#b81d24" radius={[2, 2, 0, 0]} barSize={32} />`,
  `                  <YAxis 
                    tick={{ fontSize: 10, fill: '#6B7280' }} 
                    axisLine={false} 
                    tickLine={false}
                    tickFormatter={(value) => \`\${value} Bal\`}
                  />
                  <Tooltip 
                    cursor={{ fill: '#F3F4F6' }}
                    contentStyle={{ borderRadius: '4px', border: '1px solid #E5E7EB', fontSize: '11px', fontWeight: 'bold' }}
                    formatter={(value: number) => [\`\${value.toLocaleString('id-ID')} Bal\`, 'Total Pembelian']}
                  />
                  <Bar dataKey="totalBal" fill="#b81d24" radius={[2, 2, 0, 0]} barSize={32} />`
);

fs.writeFileSync(file, code);
