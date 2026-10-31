import { forwardRef } from 'react'
import { LoaderCircle } from 'lucide-react'

const variantClass = {
  primary: 'button--primary',
  secondary: 'button--secondary',
  outline: 'button--outline',
  ghost: 'button--ghost',
}

export const Button = forwardRef(function Button({
  children,
  variant = 'primary',
  size = 'md',
  as: Component = 'button',
  leadingIcon,
  trailingIcon,
  loading = false,
  className = '',
  type = 'button',
  disabled = false,
  ...props
}, ref) {
  const isNativeButton = Component === 'button'
  return (
    <Component
      ref={ref}
      className={`button ${variantClass[variant] ?? variantClass.primary} button--${size} ${className}`.trim()}
      {...(isNativeButton ? { type, disabled: disabled || loading, 'aria-busy': loading || undefined } : {})}
      {...props}
    >
      {loading ? <LoaderCircle className="button__spinner" size={17} aria-hidden="true" /> : leadingIcon}
      {children}
      {!loading && trailingIcon}
    </Component>
  )
})
