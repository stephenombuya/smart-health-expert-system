import { ChevronLeft, ChevronRight } from 'lucide-react'
import { cn } from '@/utils'

interface PaginationProps {
  count: number
  pageSize?: number
  currentPage: number
  onPageChange: (page: number) => void
  className?: string
}

export function Pagination({ count, pageSize = 20, currentPage, onPageChange, className }: PaginationProps) {
  const totalPages = Math.ceil(count / pageSize)
  if (totalPages <= 1) return null

  const hasPrev = currentPage > 1
  const hasNext = currentPage < totalPages

  function buildPages(): Array<number | '…'> {
    if (totalPages <= 7) return Array.from({ length: totalPages }, (_, i) => i + 1)
    const pages: Array<number | '…'> = [1]
    if (currentPage > 3) pages.push('…')
    for (let p = Math.max(2, currentPage - 1); p <= Math.min(totalPages - 1, currentPage + 1); p++) {
      pages.push(p)
    }
    if (currentPage < totalPages - 2) pages.push('…')
    pages.push(totalPages)
    return pages
  }

  const btn = 'flex items-center justify-center min-w-[32px] h-8 px-2 rounded-lg text-sm font-medium font-display transition-all duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary-500'

  return (
    <nav aria-label="Pagination" className={cn('flex items-center justify-between gap-2 mt-6', className)}>
      <p className="text-xs text-gray-400 font-body hidden sm:block">
        {(currentPage - 1) * pageSize + 1}–{Math.min(currentPage * pageSize, count)} of {count}
      </p>
      <div className="flex items-center gap-1 mx-auto sm:mx-0">
        <button
          onClick={() => onPageChange(currentPage - 1)}
          disabled={!hasPrev}
          aria-label="Previous page"
          className={cn(btn, hasPrev ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed')}
        >
          <ChevronLeft className="w-4 h-4" />
        </button>

        {buildPages().map((page, idx) =>
          page === '…' ? (
            <span key={`e${idx}`} className="px-1 text-gray-400 text-sm select-none">…</span>
          ) : (
            <button
              key={page}
              onClick={() => onPageChange(page as number)}
              aria-current={page === currentPage ? 'page' : undefined}
              className={cn(btn, page === currentPage ? 'bg-primary-800 text-white shadow-sm' : 'text-gray-600 hover:bg-gray-100')}
            >
              {page}
            </button>
          )
        )}

        <button
          onClick={() => onPageChange(currentPage + 1)}
          disabled={!hasNext}
          aria-label="Next page"
          className={cn(btn, hasNext ? 'text-gray-600 hover:bg-gray-100' : 'text-gray-300 cursor-not-allowed')}
        >
          <ChevronRight className="w-4 h-4" />
        </button>
      </div>
    </nav>
  )
}