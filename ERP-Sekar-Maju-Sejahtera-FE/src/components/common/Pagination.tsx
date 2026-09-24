import React, { useState } from 'react';
import { ChevronsLeft, ChevronsRight, ChevronLeft, ChevronRight } from 'lucide-react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  className?: string;
  showQuickJumper?: boolean;
  showFirstLast?: boolean;
}

export function getPaginationWindow(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 0) return [1];
  if (totalPages <= 6) {
    return Array.from({ length: totalPages }, (_, i) => i + 1);
  }

  const pages: (number | string)[] = [];
  
  // 1 is always sticky at start
  pages.push(1);

  let start = Math.max(2, currentPage - 1);
  let end = Math.min(totalPages - 1, currentPage + 1);

  if (currentPage <= 3) {
    start = 2;
    end = Math.min(totalPages - 1, 4);
  } else if (currentPage >= totalPages - 2) {
    start = Math.max(2, totalPages - 3);
    end = totalPages - 1;
  }

  if (start > 2) {
    pages.push('...');
  }

  for (let i = start; i <= end; i++) {
    pages.push(i);
  }

  if (end < totalPages - 1) {
    pages.push('...');
  }

  if (totalPages > 1) {
    pages.push(totalPages); // Last page sticky at end
  }

  return pages;
}

export const Pagination: React.FC<PaginationProps> = ({
  currentPage,
  totalPages,
  onPageChange,
  totalItems,
  itemsPerPage,
  className = '',
  showQuickJumper = false,
  showFirstLast = false,
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const pageItems = getPaginationWindow(currentPage, safeTotalPages);
  const [jumpInput, setJumpInput] = useState<string>('');

  const startItem = totalItems !== undefined && itemsPerPage !== undefined && totalItems > 0
    ? (currentPage - 1) * itemsPerPage + 1
    : undefined;
  const endItem = totalItems !== undefined && itemsPerPage !== undefined
    ? Math.min(currentPage * itemsPerPage, totalItems)
    : undefined;

  const handleJumpSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const target = parseInt(jumpInput, 10);
    if (!isNaN(target) && target >= 1 && target <= safeTotalPages) {
      onPageChange(target);
      setJumpInput('');
    }
  };

  return (
    <div className={`flex flex-col lg:flex-row lg:items-center justify-between gap-2.5 text-xs text-gray-600 ${className}`}>
      {totalItems !== undefined ? (
        <div className="flex items-center space-x-1.5">
          <span>Menampilkan</span>
          <span className="font-semibold text-gray-800">{totalItems > 0 ? startItem : 0}</span>
          <span>sampai</span>
          <span className="font-semibold text-gray-800">{endItem}</span>
          <span>dari</span>
          <span className="font-semibold text-gray-800">{totalItems}</span>
          <span>data</span>
          {safeTotalPages > 1 && (
            <span className="text-gray-400 font-mono text-[11px] ml-1">
              (Hal. {currentPage} / {safeTotalPages})
            </span>
          )}
        </div>
      ) : (
        <div />
      )}

      <div className="flex flex-wrap items-center gap-2">
        {/* Navigation Buttons */}
        <div className="flex items-center space-x-1">
          {showFirstLast && safeTotalPages > 3 && (
            <button
              type="button"
              onClick={() => onPageChange(1)}
              disabled={currentPage <= 1}
              className="p-1 border border-gray-300 rounded-sm bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 cursor-pointer transition shadow-2xs"
              title="Halaman Pertama"
            >
              <ChevronsLeft className="w-3.5 h-3.5" />
            </button>
          )}

          <button
            type="button"
            onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
            disabled={currentPage <= 1}
            className="px-2 py-1 border border-gray-300 rounded-sm bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium cursor-pointer transition shadow-2xs flex items-center space-x-1"
          >
            <ChevronLeft className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Sebelumnya</span>
          </button>

          {pageItems.map((item, index) => {
            if (item === '...') {
              return (
                <span key={`ellipsis-${index}`} className="px-1.5 py-1 text-gray-400 font-bold select-none">
                  ...
                </span>
              );
            }
            const page = Number(item);
            const isActive = page === currentPage;
            return (
              <button
                key={page}
                type="button"
                onClick={() => onPageChange(page)}
                className={`min-w-[28px] px-2 py-1 rounded-sm text-xs font-bold transition cursor-pointer ${
                  isActive
                    ? 'bg-[#b81d24] text-white shadow-xs'
                    : 'bg-white border border-gray-300 text-gray-700 hover:bg-gray-50'
                }`}
              >
                {page}
              </button>
            );
          })}

          <button
            type="button"
            onClick={() => onPageChange(Math.min(currentPage + 1, safeTotalPages))}
            disabled={currentPage >= safeTotalPages || totalPages === 0}
            className="px-2 py-1 border border-gray-300 rounded-sm bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-xs font-medium cursor-pointer transition shadow-2xs flex items-center space-x-1"
          >
            <span className="hidden sm:inline">Selanjutnya</span>
            <ChevronRight className="w-3.5 h-3.5" />
          </button>

          {showFirstLast && safeTotalPages > 3 && (
            <button
              type="button"
              onClick={() => onPageChange(safeTotalPages)}
              disabled={currentPage >= safeTotalPages || totalPages === 0}
              className="p-1 border border-gray-300 rounded-sm bg-white hover:bg-gray-50 disabled:opacity-40 disabled:cursor-not-allowed text-gray-600 cursor-pointer transition shadow-2xs"
              title="Halaman Terakhir"
            >
              <ChevronsRight className="w-3.5 h-3.5" />
            </button>
          )}
        </div>

        {/* Quick Jumper for Large Datasets */}
        {showQuickJumper && safeTotalPages > 2 && (
          <form onSubmit={handleJumpSubmit} className="flex items-center space-x-1 border-l border-gray-200 pl-2">
            <span className="text-gray-500 text-[11px]">Ke hal:</span>
            <input
              type="number"
              min={1}
              max={safeTotalPages}
              value={jumpInput}
              onChange={(e) => setJumpInput(e.target.value)}
              placeholder={`${currentPage}`}
              className="w-12 px-1.5 py-0.5 border border-gray-300 rounded-sm text-xs text-center font-mono focus:outline-none focus:border-[#b81d24] bg-white"
            />
            <button
              type="submit"
              className="px-2 py-0.5 bg-gray-100 hover:bg-gray-200 border border-gray-300 rounded-sm text-[11px] font-semibold text-gray-700 cursor-pointer transition"
            >
              Go
            </button>
          </form>
        )}
      </div>
    </div>
  );
};
