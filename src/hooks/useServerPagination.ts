import { useState, useCallback } from 'react';

interface UseServerPaginationReturn {
  currentPage: number;
  pageSize: number;
  from: number;
  to: number;
  setPage: (page: number) => void;
  resetPage: () => void;
  // Call paginationProps(totalCount) to get DataPagination-compatible props
  paginationProps: (totalItems: number) => {
    currentPage: number;
    totalPages: number;
    totalItems: number;
    pageSize: number;
    goToPage: (page: number) => void;
    nextPage: () => void;
    prevPage: () => void;
    hasNextPage: boolean;
    hasPrevPage: boolean;
  };
}

export function useServerPagination(pageSize = 25): UseServerPaginationReturn {
  const [currentPage, setCurrentPage] = useState(1);

  const from = (currentPage - 1) * pageSize;
  const to = from + pageSize - 1;

  const setPage = useCallback((page: number) => {
    setCurrentPage(Math.max(1, page));
  }, []);

  const resetPage = useCallback(() => setCurrentPage(1), []);

  const paginationProps = useCallback((totalItems: number) => {
    const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));
    const safePage = Math.min(currentPage, totalPages);
    return {
      currentPage: safePage,
      totalPages,
      totalItems,
      pageSize,
      goToPage: setPage,
      nextPage: () => setPage(safePage + 1),
      prevPage: () => setPage(safePage - 1),
      hasNextPage: safePage < totalPages,
      hasPrevPage: safePage > 1,
    };
  }, [currentPage, pageSize, setPage]);

  return { currentPage, pageSize, from, to, setPage, resetPage, paginationProps };
}
