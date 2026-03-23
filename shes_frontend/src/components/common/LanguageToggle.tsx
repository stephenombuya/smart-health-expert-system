import { useTranslation } from 'react-i18next'
import { Globe } from 'lucide-react'

export function LanguageToggle() {
  const { i18n, t } = useTranslation()

  const toggle = () => {
    const next = i18n.language.startsWith('sw') ? 'en' : 'sw'
    i18n.changeLanguage(next)
    localStorage.setItem('shes-lang', next)
  }

  const isSw = i18n.language.startsWith('sw')

  return (
    <button
      onClick={toggle}
      className="flex items-center gap-2 px-3 py-2 rounded-xl text-sm font-medium
                 font-display text-primary-300 hover:bg-primary-800 transition-all duration-150 w-full"
      title={isSw ? 'Switch to English' : 'Badilisha kwa Kiswahili'}
    >
      <Globe className="w-4 h-4 shrink-0" />
      {isSw ? t('language.english') : t('language.swahili')}
    </button>
  )
}