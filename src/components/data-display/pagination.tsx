"use client";

type PaginationProps = {
  currentPage: number;
  totalPages: number;
  onPageChange: (page: number) => void;
  labels: {
    navigation: string;
    previous: string;
    next: string;
    page: (page: number) => string;
    pageNumber?: (page: number) => string;
  };
  disabled?: boolean;
};

function pageItems(currentPage: number, totalPages: number): (number | string)[] {
  if (totalPages <= 7) return Array.from({ length: totalPages }, (_, index) => index + 1);
  const visible = new Set([1, totalPages]);
  const start = Math.max(2, Math.min(currentPage - 1, totalPages - 4));
  const end = Math.min(totalPages - 1, Math.max(currentPage + 1, 5));
  for (let page = start; page <= end; page += 1) visible.add(page);
  const pages = [...visible].sort((first, second) => first - second);
  const items: (number | string)[] = [];
  pages.forEach((page, index) => {
    if (index > 0 && page > pages[index - 1] + 1) items.push(`gap-${page}`);
    items.push(page);
  });
  return items;
}

/** Controlled UI only. It neither fetches records nor infers a data source. */
export function Pagination({ currentPage, totalPages, onPageChange, labels, disabled = false }: PaginationProps) {
  const pages = Number.isFinite(totalPages) ? Math.max(0, Math.floor(totalPages)) : 0;
  if (pages === 0) return null;
  const current = Number.isFinite(currentPage) ? Math.min(pages, Math.max(1, Math.floor(currentPage))) : 1;
  const selectPage = (page: number) => {
    if (!disabled && page >= 1 && page <= pages && page !== current) onPageChange(page);
  };

  return (
    <nav className="pagination" aria-label={labels.navigation}>
      <ul>
        <li>
          <button type="button" onClick={() => selectPage(current - 1)} disabled={disabled || current === 1}>
            {labels.previous}
          </button>
        </li>
        {pageItems(current, pages).map((item) => (
          <li key={item}>
            {typeof item === "number" ? (
              <button
                type="button"
                aria-label={labels.page(item)}
                aria-current={item === current ? "page" : undefined}
                disabled={disabled}
                onClick={() => selectPage(item)}
              >
                <bdi>{labels.pageNumber ? labels.pageNumber(item) : String(item)}</bdi>
              </button>
            ) : <span className="pagination__gap" aria-hidden="true">…</span>}
          </li>
        ))}
        <li>
          <button type="button" onClick={() => selectPage(current + 1)} disabled={disabled || current === pages}>
            {labels.next}
          </button>
        </li>
      </ul>
      <span className="sr-only" role="status">{labels.page(current)}</span>
    </nav>
  );
}
