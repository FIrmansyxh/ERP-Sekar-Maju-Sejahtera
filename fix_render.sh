sed -i 's/style={{ width: `${Math.max(item.count > 0 ? 4 : 0, item.percentage)}%` }}/style={{ width: `${Math.max(item.count > 0 ? 4 : 0, item.relativePercentage)}%` }}/' src/components/laporan/DashboardAnalyticView.tsx

