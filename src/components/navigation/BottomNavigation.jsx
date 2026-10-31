import { Link } from 'react-router-dom'

export function BottomNavigation({ items, activeKey, onNavigate, label = 'Navigasi utama' }) {
  return (
    <nav className="bottom-nav" aria-label={label}>
      {items.map(({ key, label: itemLabel, shortLabel, icon: Icon, href = '/' }) => (
        <Link
          key={key}
          className={`bottom-nav__item ${activeKey === key ? 'bottom-nav__item--active' : ''}`}
          to={href}
          aria-current={activeKey === key ? 'page' : undefined}
          onClick={() => onNavigate?.(key)}
        >
          {Icon && <Icon size={20} strokeWidth={1.8} aria-hidden="true" />}
          <span>{shortLabel ?? itemLabel}</span>
        </Link>
      ))}
    </nav>
  )
}
