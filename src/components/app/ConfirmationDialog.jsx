import { AlertTriangle } from 'lucide-react'
import { Button, Modal } from '../index.js'

export function ConfirmationDialog({ open, onCancel, onConfirm, title, description, confirmLabel = 'Konfirmasi' }) {
  return (
    <Modal
      open={open}
      onClose={onCancel}
      title={title}
      description={description}
      role="alertdialog"
      className="confirmation-dialog"
      footer={<><Button variant="ghost" onClick={onCancel}>Batal</Button><Button className="button--danger" onClick={onConfirm} leadingIcon={<AlertTriangle size={15} />}>{confirmLabel}</Button></>}
    >
      <p className="confirmation-dialog__note">Tindakan ini langsung memperbarui data koleksimu.</p>
    </Modal>
  )
}
