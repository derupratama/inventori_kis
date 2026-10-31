export function Card({
  title,
  description,
  action,
  footer,
  children,
  className = '',
  contentClassName = '',
  ...props
}) {
  return (
    <section className={`card ${className}`.trim()} {...props}>
      {(title || description || action) && (
        <header className="card__header">
          <div>
            {title && <h2 className="card__title">{title}</h2>}
            {description && <p className="card__description">{description}</p>}
          </div>
          {action && <div className="card__action">{action}</div>}
        </header>
      )}
      <div className={`card__content ${contentClassName}`.trim()}>{children}</div>
      {footer && <footer className="card__footer">{footer}</footer>}
    </section>
  )
}
