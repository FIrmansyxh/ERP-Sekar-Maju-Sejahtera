const fs = require('fs');
const file = 'src/components/laporan/LaporanGradeView.tsx';
let code = fs.readFileSync(file, 'utf8');

code = code.replace(
`  )}
          {gradeMetrics.map((m) => (`,
`  )}
          </div>
        </div>

        {/* Quick Filter Grade Pills */}
        <div className="flex flex-wrap items-center gap-2 pt-1 text-[11px]">
          <span className="text-gray-500 font-medium">Filter Tampilan Grade:</span>
          <button
            onClick={() => setSelectedGradeCode('ALL')}
            className={\`px-2.5 py-1 border text-xs cursor-pointer transition rounded-sm \${
              selectedGradeCode === 'ALL'
                ? 'bg-gray-900 text-white font-bold border-gray-900 shadow-xs'
                : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'
            }\`}
          >
            Semua Grade ({gradeMetrics.length})
          </button>
          {gradeMetrics.map((m) => (`
);

fs.writeFileSync(file, code);
