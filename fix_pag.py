with open('src/components/common/Pagination.tsx', 'r') as f:
    content = f.read()

# Modify the buttons to include Pertama and Terakhir
buttons_orig = """        <button
          type="button"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage <= 1}
          className="px-2.5 py-1 border border-gray-300 rounded-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium cursor-pointer transition shadow-2xs"
        >
          Sebelumnya
        </button>"""

buttons_repl = """        <button
          type="button"
          onClick={() => onPageChange(1)}
          disabled={currentPage <= 1}
          className="px-2.5 py-1 border border-gray-300 rounded-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium cursor-pointer transition shadow-2xs hidden sm:block"
        >
          Pertama
        </button>
        <button
          type="button"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage <= 1}
          className="px-2.5 py-1 border border-gray-300 rounded-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium cursor-pointer transition shadow-2xs"
        >
          Sebelumnya
        </button>"""
content = content.replace(buttons_orig, buttons_repl)

next_orig = """        <button
          type="button"
          onClick={() => onPageChange(Math.min(currentPage + 1, safeTotalPages))}
          disabled={currentPage >= safeTotalPages || totalPages === 0}
          className="px-2.5 py-1 border border-gray-300 rounded-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium cursor-pointer transition shadow-2xs"
        >
          Selanjutnya
        </button>"""

next_repl = """        <button
          type="button"
          onClick={() => onPageChange(Math.min(currentPage + 1, safeTotalPages))}
          disabled={currentPage >= safeTotalPages || totalPages === 0}
          className="px-2.5 py-1 border border-gray-300 rounded-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium cursor-pointer transition shadow-2xs"
        >
          Selanjutnya
        </button>
        <button
          type="button"
          onClick={() => onPageChange(safeTotalPages)}
          disabled={currentPage >= safeTotalPages || totalPages === 0}
          className="px-2.5 py-1 border border-gray-300 rounded-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium cursor-pointer transition shadow-2xs hidden sm:block"
        >
          Terakhir
        </button>"""

content = content.replace(next_orig, next_repl)

with open('src/components/common/Pagination.tsx', 'w') as f:
    f.write(content)
