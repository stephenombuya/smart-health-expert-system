// src/components/common/Footer.tsx

import { Link } from 'react-router-dom'
import { Heart } from 'lucide-react'

export function Footer() {
  return (
    <footer className="bg-primary-900 dark:bg-gray-950 py-8 mt-auto">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-7 h-7 rounded-lg bg-primary-700 flex items-center justify-center">
              <Heart className="w-3.5 h-3.5 text-white" />
            </div>
            <span className="text-white font-bold font-display">SHES</span>
            <span className="text-primary-500 text-sm ml-2 font-body">Smart Health Expert System</span>
          </div>
          
          <div className="flex items-center gap-6 text-sm font-body">
            <Link
              to="/privacy"
              className="text-primary-400 dark:text-gray-400 hover:text-white dark:hover:text-white transition-colors"
            >
              Privacy Policy
            </Link>
            <Link
              to="/terms"
              className="text-primary-400 dark:text-gray-400 hover:text-white dark:hover:text-white transition-colors"
            >
              Terms of Use
            </Link>
            <a
              href="mailto:support@shes-platform.com"
              className="text-primary-400 dark:text-gray-400 hover:text-white dark:hover:text-white transition-colors"
            >
              Contact
            </a>
          </div>

          <p className="text-xs text-primary-600 dark:text-gray-400 font-body">
            © {new Date().getFullYear()} SHES. All rights reserved.
          </p>
        </div>
      </div>
    </footer>
  )
}