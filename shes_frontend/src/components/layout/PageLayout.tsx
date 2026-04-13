// src/components/layout/PageLayout.tsx

import { ReactNode } from 'react'
import { Footer } from '@/components/common/Footer'

interface PageLayoutProps {
  children: ReactNode
  showFooter?: boolean
}

export function PageLayout({ children, showFooter = true }: PageLayoutProps) {
  return (
    <div className="min-h-screen flex flex-col">
      <main className="flex-grow">
        {children}
      </main>
      {showFooter && <Footer />}
    </div>
  )
}