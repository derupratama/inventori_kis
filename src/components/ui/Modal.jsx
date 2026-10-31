import { AnimatePresence, motion } from 'motion/react'
import { X } from 'lucide-react'
import { useEffect, useRef } from 'react'
import { createPortal } from 'react-dom'
import { Button } from './Button.jsx'

export function Modal({ open, onClose, title, description, children, footer, labelledBy, role = 'dialog', className = '' }) {
  const closeRef = useRef(null)
  const previousFocusRef = useRef(null)
  const onCloseRef = useRef(onClose)
  const titleId = labelledBy ?? 'dialog-title'

  useEffect(() => { onCloseRef.current = onClose }, [onClose])

  useEffect(() => {
    if (!open) return undefined
    previousFocusRef.current = document.activeElement
    const previousOverflow = document.body.style.overflow
    document.body.style.overflow = 'hidden'
    closeRef.current?.focus()

    function handleKeyDown(event) {
      if (event.key === 'Escape') onCloseRef.current?.()
      if (event.key !== 'Tab') return
      const dialog = document.querySelector('[data-modal-dialog]')
      const focusable = dialog?.querySelectorAll('button:not(:disabled), [href], input:not(:disabled), [tabindex]:not([tabindex="-1"])')
      if (!focusable?.length) return
      const first = focusable[0]
      const last = focusable[focusable.length - 1]
      if (event.shiftKey && document.activeElement === first) { event.preventDefault(); last.focus() }
      else if (!event.shiftKey && document.activeElement === last) { event.preventDefault(); first.focus() }
    }

    document.addEventListener('keydown', handleKeyDown)
    return () => {
      document.body.style.overflow = previousOverflow
      document.removeEventListener('keydown', handleKeyDown)
      previousFocusRef.current?.focus?.()
    }
  }, [open])

  if (typeof document === 'undefined') return null

  return createPortal(
    <AnimatePresence>
      {open && (
        <motion.div
          className="modal-backdrop"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          onMouseDown={(event) => { if (event.target === event.currentTarget) onClose?.() }}
        >
          <motion.section
            data-modal-dialog
            role={role}
            aria-modal="true"
            aria-labelledby={title ? titleId : undefined}
            aria-describedby={description ? `${titleId}-description` : undefined}
            className={`modal ${className}`.trim()}
            initial={{ opacity: 0, y: 14, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 10, scale: 0.98 }}
            transition={{ duration: 0.2, ease: 'easeOut' }}
          >
            <header className="modal__header">
              <div>
                {title && <h2 id={titleId} className="modal__title">{title}</h2>}
                {description && <p id={`${titleId}-description`} className="modal__description">{description}</p>}
              </div>
              <Button ref={closeRef} variant="ghost" size="icon" aria-label="Tutup dialog" onClick={onClose}><X size={18} /></Button>
            </header>
            <div className="modal__content">{children}</div>
            {footer && <footer className="modal__footer">{footer}</footer>}
          </motion.section>
        </motion.div>
      )}
    </AnimatePresence>,
    document.body,
  )
}
