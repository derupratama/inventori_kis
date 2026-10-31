import { Card } from '../index.js'

export function StatCard({ label, value, detail, icon: Icon, tone = 'rose' }) {
  return (
    <Card className="stat-card">
      <span className={`stat-card__icon stat-card__icon--${tone}`}><Icon size={18} strokeWidth={1.8} aria-hidden="true" /></span>
      <div className="stat-card__copy"><span>{label}</span><strong>{value}</strong><small>{detail}</small></div>
    </Card>
  )
}
