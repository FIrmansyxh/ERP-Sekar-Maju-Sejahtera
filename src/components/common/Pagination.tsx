import React from 'react';

interface PaginationProps {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  totalItems?: number;
  itemsPerPage?: number;
  className?: string;
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
}) => {
  const safeTotalPages = Math.max(1, totalPages);
  const pageItems = getPaginationWindow(currentPage, safeTotalPages);

  const startItem = totalItems !== undefined && itemsPerPage !== undefined && totalItems > 0
    ? (currentPage - 1) * itemsPerPage + 1
    : undefined;
  const endItem = totalItems !== undefined && itemsPerPage !== undefined
    ? Math.min(currentPage * itemsPerPage, totalItems)
    : undefined;

  return (
    <div className={`flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-gray-600 ${className}`}>
      {totalItems !== undefined ? (
        <div>
          Menampilkan <span className="font-semibold text-gray-800">{totalItems > 0 ? startItem : 0}</span> sampai{' '}
          <span className="font-semibold text-gray-800">{endItem}</span> dari{' '}
          <span className="font-semibold text-gray-800">{totalItems}</span> data
        </div>
      ) : (
        <div />
      )}

      <div className="flex items-center space-x-1">
        <button
          type="button"
          onClick={() => onPageChange(Math.max(currentPage - 1, 1))}
          disabled={currentPage <= 1}
          className="px-2.5 py-1 border border-gray-300 rounded-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium cursor-pointer transition shadow-2xs"
        >
          Sebelumnya
        </button>

        {pageItems.map((item, index) => {
          if (item === '...') {
            return (
              <span key={`ellipsis-${index}`} className="px-2 py-1 text-gray-400 font-bold select-none">
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
              className={`min-w-[28px] px-2.5 py-1 rounded-sm text-xs font-bold transition cursor-pointer ${
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
          className="px-2.5 py-1 border border-gray-300 rounded-sm bg-white hover:bg-gray-50 disabled:opacity-50 disabled:cursor-not-allowed text-xs font-medium cursor-pointer transition shadow-2xs"
        >
          Selanjutnya
        </button>
      </div>
    </div>
  );
};
