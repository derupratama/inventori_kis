import { Link } from 'react-router-dom'

export function PageHeading({ eyebrow, title, description, action, backTo, backLabel = 'Kembali' }) {
  return (
    <div className="page-heading">
      <div className="page-heading__copy">
        {backTo && <Link className="back-link" to={backTo}>‹ <span>{backLabel}</span></Link>}
        {eyebrow && <p className="page-eyebrow">{eyebrow}</p>}
        <h1>{title}</h1>
        {description && <p className="page-heading__description">{description}</p>}
      </div>
      {action && <div className="page-heading__action">{action}</div>}
    </div>
  )
}
