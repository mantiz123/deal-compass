import { useState, useMemo } from 'react';

interface UsePaginationOptions {
  pageSize?: number;
}

export function usePagination<T>(items: T[] | undefined, options: UsePaginationOptions = {}) {
  const { pageSize = 25 } = options;
  const [currentPage, setCurrentPage] = useState(1);

  const totalItems = items?.length || 0;
  const totalPages = Math.max(1, Math.ceil(totalItems / pageSize));

  // Reset to page 1 if current page exceeds total
  const safePage = Math.min(currentPage, totalPages);
  if (safePage !== currentPage) {
    setCurrentPage(safePage);
  }

  const paginatedItems = useMemo(() => {
    if (!items) return [];
    const start = (safePage - 1) * pageSize;
    return items.slice(start, start + pageSize);
  }, [items, safePage, pageSize]);

  const goToPage = (page: number) => {
    setCurrentPage(Math.max(1, Math.min(page, totalPages)));
  };

  return {
    paginatedItems,
    currentPage: safePage,
    totalPages,
    totalItems,
    pageSize,
    goToPage,
    nextPage: () => goToPage(safePage + 1),
    prevPage: () => goToPage(safePage - 1),
    hasNextPage: safePage < totalPages,
    hasPrevPage: safePage > 1,
  };
}
