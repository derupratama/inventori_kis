import { useId } from 'react'

export function Input({
  label,
  hint,
  error,
  leadingIcon,
  id: providedId,
  className = '',
  required = false,
  ...props
}) {
  const generatedId = useId()
  const id = providedId ?? generatedId
  const messageId = `${id}-message`

  return (
    <div className={`field ${className}`.trim()}>
      {label && (
        <label className="field__label" htmlFor={id}>
          {label}{required && <span className="field__required" aria-hidden="true"> *</span>}
        </label>
      )}
      <div className={`field__control ${error ? 'field__control--error' : ''}`}>
        {leadingIcon && <span className="field__icon" aria-hidden="true">{leadingIcon}</span>}
        <input
          id={id}
          className="field__input"
          required={required}
          aria-invalid={Boolean(error) || undefined}
          aria-describedby={error || hint ? messageId : undefined}
          {...props}
        />
      </div>
      {(error || hint) && <p id={messageId} className={`field__message ${error ? 'field__message--error' : ''}`}>{error || hint}</p>}
    </div>
  )
}
