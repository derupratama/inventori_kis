export function SectionTitle({ title, description, action }) {
  return (
    <div className="section-title">
      <div><h2>{title}</h2>{description && <p>{description}</p>}</div>
      {action && <div className="section-title__action">{action}</div>}
    </div>
  )
}
