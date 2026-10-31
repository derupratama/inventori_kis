import { Check, ChevronDown } from 'lucide-react'
import { useEffect, useId, useRef, useState } from 'react'

export function Dropdown({ label = 'Pilih opsi', options, value, onChange, className = '' }) {
  const [open, setOpen] = useState(false)
  const rootRef = useRef(null)
  const menuRef = useRef(null)
  const menuId = useId()
  const selected = options.find((option) => option.value === value)

  useEffect(() => {
    function closeOnOutside(event) {
      if (!rootRef.current?.contains(event.target)) setOpen(false)
    }
    function closeOnEscape(event) {
      if (event.key === 'Escape' && open) {
        setOpen(false)
        rootRef.current?.querySelector('button')?.focus()
      }
    }
    document.addEventListener('pointerdown', closeOnOutside)
    document.addEventListener('keydown', closeOnEscape)
    return () => {
      document.removeEventListener('pointerdown', closeOnOutside)
      document.removeEventListener('keydown', closeOnEscape)
    }
  }, [open])

  function handleTriggerKeyDown(event) {
    if (event.key === 'ArrowDown' || event.key === 'ArrowUp') {
      event.preventDefault()
      setOpen(true)
      requestAnimationFrame(() => menuRef.current?.querySelector('[role="menuitem"]')?.focus())
    }
  }

  function handleMenuKeyDown(event) {
    const items = Array.from(menuRef.current?.querySelectorAll('[role="menuitem"]:not(:disabled)') ?? [])
    const currentIndex = items.indexOf(document.activeElement)
    let nextIndex
    if (event.key === 'ArrowDown') nextIndex = (currentIndex + 1) % items.length
    else if (event.key === 'ArrowUp') nextIndex = (currentIndex - 1 + items.length) % items.length
    else if (event.key === 'Home') nextIndex = 0
    else if (event.key === 'End') nextIndex = items.length - 1
    else return
    event.preventDefault()
    items[nextIndex]?.focus()
  }

  return (
    <div className={`dropdown ${className}`.trim()} ref={rootRef}>
      <button
        className="dropdown__trigger"
        type="button"
        aria-haspopup="menu"
        aria-expanded={open}
        aria-controls={menuId}
        onClick={() => setOpen((current) => !current)}
        onKeyDown={handleTriggerKeyDown}
      >
        <span>{selected?.label ?? label}</span>
        <ChevronDown size={16} aria-hidden="true" className={`dropdown__chevron ${open ? 'dropdown__chevron--open' : ''}`} />
      </button>
      {open && (
        <div className="dropdown__menu" id={menuId} role="menu" ref={menuRef} aria-label={label} onKeyDown={handleMenuKeyDown}>
          {options.map((option) => (
            <button
              key={option.value}
              className="dropdown__option"
              type="button"
              role="menuitem"
              disabled={option.disabled}
              tabIndex={0}
              onClick={() => { onChange?.(option.value); setOpen(false); rootRef.current?.querySelector('button')?.focus() }}
            >
              <span>{option.label}</span>
              {value === option.value && <Check size={15} aria-hidden="true" />}
            </button>
          ))}
        </div>
      )}
    </div>
  )
}
