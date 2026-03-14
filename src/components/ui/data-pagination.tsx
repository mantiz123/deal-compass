import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, ChevronsLeft, ChevronsRight } from "lucide-react";

interface DataPaginationProps {
  currentPage: number;
  totalPages: number;
  totalItems: number;
  pageSize: number;
  goToPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  hasNextPage: boolean;
  hasPrevPage: boolean;
}

export function DataPagination({
  currentPage,
  totalPages,
  totalItems,
  pageSize,
  goToPage,
  nextPage,
  prevPage,
  hasNextPage,
  hasPrevPage,
}: DataPaginationProps) {
  if (totalPages <= 1) return null;

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers to show
  const getPageNumbers = () => {
    const pages: (number | 'ellipsis')[] = [];
    if (totalPages <= 7) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('ellipsis');
      for (let i = Math.max(2, currentPage - 1); i <= Math.min(totalPages - 1, currentPage + 1); i++) {
        pages.push(i);
      }
      if (currentPage < totalPages - 2) pages.push('ellipsis');
      pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="flex flex-col sm:flex-row items-center justify-between gap-3 px-4 py-3 border-t border-border">
      <p className="text-sm text-muted-foreground">
        {startItem}–{endItem} de {totalItems}
      </p>
      <div className="flex items-center gap-1">
        <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex" onClick={() => goToPage(1)} disabled={!hasPrevPage}>
          <ChevronsLeft className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={prevPage} disabled={!hasPrevPage}>
          <ChevronLeft className="h-4 w-4" />
        </Button>
        <div className="hidden sm:flex items-center gap-1">
          {getPageNumbers().map((page, i) =>
            page === 'ellipsis' ? (
              <span key={`e${i}`} className="px-2 text-muted-foreground">…</span>
            ) : (
              <Button
                key={page}
                variant={page === currentPage ? "default" : "ghost"}
                size="icon"
                className="h-8 w-8"
                onClick={() => goToPage(page)}
              >
                {page}
              </Button>
            )
          )}
        </div>
        <span className="sm:hidden text-sm text-muted-foreground px-2">
          {currentPage} / {totalPages}
        </span>
        <Button variant="ghost" size="icon" className="h-8 w-8" onClick={nextPage} disabled={!hasNextPage}>
          <ChevronRight className="h-4 w-4" />
        </Button>
        <Button variant="ghost" size="icon" className="h-8 w-8 hidden sm:flex" onClick={() => goToPage(totalPages)} disabled={!hasNextPage}>
          <ChevronsRight className="h-4 w-4" />
        </Button>
      </div>
    </div>
  );
}
