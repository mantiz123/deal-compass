import { useState } from 'react';

interface UseServerPaginationOptions {
  pageSize?: number;
}

export function useServerPagination(totalItems: number, options: UseServerPaginationOptions = {}) {
  const { pageSize = 25 } = options;
  const [currentPage, setCurrentPage] = useState(1);

  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
  const safePage = Math.min(currentPage, totalPages);

  const from = (safePage - 1) * pageSize;
  const to = from + pageSize - 1;

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  const resetPage = () => setCurrentPage(1);

  return {
    currentPage: safePage,
    totalPages,
    totalItems,
    pageSize,
    from,
    to,
    goToPage,
    resetPage,
    nextPage: () => goToPage(safePage + 1),
    prevPage: () => goToPage(safePage - 1),
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
}
