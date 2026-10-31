import { AnimatePresence, motion } from 'motion/react'
import { Check, CircleAlert, Info, X } from 'lucide-react'
import { createContext, useCallback, useContext, useMemo, useState } from 'react'

const ToastContext = createContext(null)
const toastIcons = { success: Check, error: CircleAlert, info: Info }

export function ToastProvider({ children }) {
  const [toasts, setToasts] = useState([])
  const dismissToast = useCallback((id) => setToasts((current) => current.filter((toast) => toast.id !== id)), [])
  const showToast = useCallback((message, options = {}) => {
    const id = `${Date.now()}-${Math.random().toString(36).slice(2)}`
    setToasts((current) => [...current, { id, message, tone: options.tone ?? 'success' }])
    window.setTimeout(() => dismissToast(id), options.duration ?? 4000)
  }, [dismissToast])
  const value = useMemo(() => ({ showToast }), [showToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="toast-viewport" aria-live="polite" aria-relevant="additions text" aria-label="Notifikasi">
        <AnimatePresence initial={false}>
          {toasts.map((toast) => {
            const Icon = toastIcons[toast.tone] ?? Info
            return (
              <motion.div
                key={toast.id}
                className={`toast toast--${toast.tone}`}
                role="status"
                initial={{ opacity: 0, y: 12, scale: 0.98 }}
                animate={{ opacity: 1, y: 0, scale: 1 }}
                exit={{ opacity: 0, y: 8, scale: 0.98 }}
                transition={{ duration: 0.18 }}
              >
                <span className="toast__icon"><Icon size={16} aria-hidden="true" /></span>
                <p className="toast__message">{toast.message}</p>
                <button className="toast__close" type="button" aria-label="Tutup notifikasi" onClick={() => dismissToast(toast.id)}><X size={16} /></button>
              </motion.div>
            )
          })}
        </AnimatePresence>
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const context = useContext(ToastContext)
  if (!context) throw new Error('useToast harus digunakan di dalam ToastProvider.')
  return context
}
