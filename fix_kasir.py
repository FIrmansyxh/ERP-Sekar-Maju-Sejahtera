with open('src/components/transaksi/KasirPageView.tsx', 'r') as f:
    content = f.read()

# Add sort state
sort_state = """  const [filterStatusBayar, setFilterStatusBayar] = useState('all'); // all, lunas, belum_lunas
  const [filterStatusNota, setFilterStatusNota] = useState('all'); // all, sudah_cetak, belum_cetak
  const [sortOrderKupon, setSortOrderKupon] = useState<'desc' | 'asc'>('desc');
"""

content = content.replace(
    "  const [filterStatusBayar, setFilterStatusBayar] = useState('all'); // all, lunas, belum_lunas\n  const [filterStatusNota, setFilterStatusNota] = useState('all'); // all, sudah_cetak, belum_cetak",
    sort_state
)

# Apply sort inside filteredList useMemo
filtered_list_end = """
      return true;
    });
  }, [transaksiList, startDate, endDate, filterKupon, filterPetaniId, filterStatusBayar, filterStatusNota, localPrintedTxIds]);
"""

filtered_list_repl = """
      return true;
    });

    // Sort by Kupon
    return filtered.sort((a, b) => {
      // Extract numeric part of kupon for correct sorting (e.g. KUP-10 < KUP-100)
      const aMatch = a.no_kupon.match(/\\d+/);
      const bMatch = b.no_kupon.match(/\\d+/);
      
      let valA = aMatch ? parseInt(aMatch[0], 10) : 0;
      let valB = bMatch ? parseInt(bMatch[0], 10) : 0;

      // fallback to string compare if both have no numbers (rare)
      if (valA === 0 && valB === 0) {
          const strA = a.no_kupon.toLowerCase();
          const strB = b.no_kupon.toLowerCase();
          if (strA < strB) valA = -1;
          if (strA > strB) valA = 1;
          valB = 0;
      }
      
      if (sortOrderKupon === 'asc') {
        return valA - valB;
      } else {
        return valB - valA;
      }
    });
  }, [transaksiList, startDate, endDate, filterKupon, filterPetaniId, filterStatusBayar, filterStatusNota, localPrintedTxIds, sortOrderKupon]);
"""

content = content.replace(filtered_list_end, filtered_list_repl)

# Update reset filter to also reset sort
reset_filter_orig = """    setFilterStatusNota('all');
    setCurrentPage(1);
  };"""

reset_filter_repl = """    setFilterStatusNota('all');
    setSortOrderKupon('desc');
    setCurrentPage(1);
  };"""

content = content.replace(reset_filter_orig, reset_filter_repl)

# Update the UI for sort button next to the filters
filter_toolbar_end = """          {/* Reset Button */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleResetFilter}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-sm px-3 py-1.5 text-xs font-semibold transition flex items-center justify-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>"""

filter_toolbar_repl = """          {/* Reset Button */}
          <div className="flex items-center space-x-2">
            <button
              type="button"
              onClick={handleResetFilter}
              className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 border border-slate-300 rounded-sm px-3 py-1.5 text-xs font-semibold transition flex items-center justify-center space-x-1"
            >
              <RefreshCw className="w-3.5 h-3.5" />
              <span>Reset</span>
            </button>
          </div>
        </div>
        
        {/* Sort by Kupon Feature */}
        <div className="flex items-center space-x-2 pt-1">
          <span className="text-xs font-semibold text-slate-700">Urutkan Kupon:</span>
          <button 
            type="button"
            onClick={() => setSortOrderKupon(prev => prev === 'desc' ? 'asc' : 'desc')}
            className="flex items-center space-x-1 px-2.5 py-1 text-[11px] font-medium border border-slate-300 rounded-sm bg-white hover:bg-slate-50 transition"
          >
            {sortOrderKupon === 'desc' ? 'Tertinggi - Terendah' : 'Terendah - Tertinggi'}
            <ArrowUpDown className="w-3.5 h-3.5 ml-1 text-slate-500" />
          </button>
        </div>"""

content = content.replace(filter_toolbar_end, filter_toolbar_repl)

with open('src/components/transaksi/KasirPageView.tsx', 'w') as f:
    f.write(content)
