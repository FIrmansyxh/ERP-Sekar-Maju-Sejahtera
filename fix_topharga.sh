sed -i 's/const maxCount = Math.max(...list.map(i => i.count), 1);/const totalCount = list.reduce((sum, i) => sum + i.count, 0) || 1;\n    const maxCount = Math.max(...list.map(i => i.count), 1);/' src/components/laporan/DashboardAnalyticView.tsx

sed -i 's/percentage: (item.count \/ maxCount) \* 100,/percentage: (item.count \/ totalCount) * 100,\n        relativePercentage: (item.count \/ maxCount) * 100,/' src/components/laporan/DashboardAnalyticView.tsx

