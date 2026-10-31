export function LoadingSkeleton({ variant = 'line', rows = 3, className = '', label = 'Memuat konten' }) {
  return (
    <div className={`skeleton-group ${className}`.trim()} role="status" aria-label={label}>
      <span className="sr-only">{label}</span>
      {variant === 'avatar' && <span className="skeleton skeleton--avatar" aria-hidden="true" />}
      {variant === 'card' ? (
        <>
          <span className="skeleton skeleton--media" aria-hidden="true" />
          <span className="skeleton skeleton--line skeleton--line-title" aria-hidden="true" />
          <span className="skeleton skeleton--line" aria-hidden="true" />
        </>
      ) : variant === 'text' ? (
        <span className="skeleton-stack" aria-hidden="true">
          {Array.from({ length: rows }, (_, index) => <span key={index} className={`skeleton skeleton--line ${index === rows - 1 ? 'skeleton--line-short' : ''}`} />)}
        </span>
      ) : variant === 'line' ? <span className="skeleton skeleton--line" aria-hidden="true" /> : null}
    </div>
  )
}
