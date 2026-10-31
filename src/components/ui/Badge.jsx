const toneClass = {
  rose: 'badge--rose',
  cream: 'badge--cream',
  neutral: 'badge--neutral',
  muted: 'badge--muted',
}

export function Badge({ children, tone = 'rose', dot = false, className = '' }) {
  return (
    <span className={`badge ${toneClass[tone] ?? toneClass.rose} ${className}`.trim()}>
      {dot && <span className="badge__dot" aria-hidden="true" />}
      {children}
    </span>
  )
}
