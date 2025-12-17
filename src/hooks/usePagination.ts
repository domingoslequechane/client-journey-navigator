import { useState, useCallback } from 'react';

interface UsePaginationConfig<T> {
  data: T[];
  itemsPerPage?: number;
}

interface UsePaginationReturn<T> {
  currentPage: number;
  totalPages: number;
  paginatedData: T[];
  setPage: (page: number) => void;
  nextPage: () => void;
  prevPage: () => void;
  isFirstPage: boolean;
  isLastPage: boolean;
  startIndex: number;
  endIndex: number;
  totalItems: number;
}

export function usePagination<T>({ 
  data, 
  itemsPerPage = 10 
}: UsePaginationConfig<T>): UsePaginationReturn<T> {
  const [currentPage, setCurrentPage] = useState(1);
  
  const totalItems = data.length;
  const totalPages = Math.max(1, Math.ceil(totalItems / itemsPerPage));
  
  // Reset to page 1 if current page is out of bounds
  const validPage = Math.min(Math.max(1, currentPage), totalPages);
  if (validPage !== currentPage) {
    setCurrentPage(validPage);
  }
  
  const startIndex = (validPage - 1) * itemsPerPage;
  const endIndex = Math.min(startIndex + itemsPerPage, totalItems);
  const paginatedData = data.slice(startIndex, endIndex);

  const setPage = useCallback((page: number) => {
    const newPage = Math.min(Math.max(1, page), totalPages);
    setCurrentPage(newPage);
  }, [totalPages]);

  const nextPage = useCallback(() => {
    setPage(currentPage + 1);
  }, [currentPage, setPage]);

  const prevPage = useCallback(() => {
    setPage(currentPage - 1);
  }, [currentPage, setPage]);

  return {
    currentPage: validPage,
    totalPages,
    paginatedData,
    setPage,
    nextPage,
    prevPage,
    isFirstPage: validPage === 1,
    isLastPage: validPage === totalPages,
    startIndex: startIndex + 1,
    endIndex,
    totalItems,
  };
}
