import { AlertTriangle } from 'lucide-react'
import { Modal } from '@/components/common'
import { Button } from '@/components/common/Button'
import { useTranslation } from 'react-i18next'

interface DeleteConfirmModalProps {
  open: boolean
  onClose: () => void
  onConfirm: () => void
  isDeleting?: boolean
  title?: string
  message?: string
}

export function DeleteConfirmModal({
  open,
  onClose,
  onConfirm,
  isDeleting = false,
  title = 'Delete this record?',
  message = 'This action cannot be undone.',
}: DeleteConfirmModalProps) {
  const { t } = useTranslation()
  
  
  return (
    <Modal open={open} onClose={onClose} maxWidth="sm">
      <div className="flex flex-col items-center text-center gap-4">
        <div className="w-12 h-12 rounded-2xl bg-red-100 flex items-center justify-center">
          <AlertTriangle className="w-6 h-6 text-red-600" />
        </div>
        <div>
          <h3 className="text-base font-semibold text-gray-900 font-display">{title}</h3>
          <p className="text-sm text-gray-500 font-body mt-1">{message}</p>
        </div>
        <div className="flex gap-3 w-full pt-2">
          <Button variant="secondary" fullWidth onClick={onClose} disabled={isDeleting}>
            {t('common.cancel')}
          </Button>
          <Button variant="danger" fullWidth loading={isDeleting} onClick={onConfirm}>
            {t('common.delete')}
          </Button>
        </div>
      </div>
    </Modal>
  )
}