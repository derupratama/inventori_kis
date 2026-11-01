import { LogOut } from 'lucide-react'
import { Link } from 'react-router-dom'
import { BrandMark } from './BrandMark.jsx'

export function Sidebar({ items, activeKey, onNavigate, onLogout, profile, brandName = 'my skin diary' }) {
  return (
    <aside className="sidebar" aria-label="Sidebar aplikasi">
      <Link to="/" className="brand-lockup" aria-label={`${brandName}, beranda`}>
        <span className="brand-mark"><BrandMark /></span>
        <span className="brand-name">{brandName}</span>
      </Link>
      <p className="sidebar__eyebrow">MENU</p>
      <nav className="sidebar__nav" aria-label="Menu utama">
        {items.map(({ key, label, icon: Icon, href = '/' }) => (
          <Link
            key={key}
            to={href}
            className={`sidebar__link ${activeKey === key ? 'sidebar__link--active' : ''}`}
            aria-current={activeKey === key ? 'page' : undefined}
            onClick={() => onNavigate?.(key)}
          >
            {Icon && <Icon size={18} strokeWidth={1.8} aria-hidden="true" />}
            <span>{label}</span>
          </Link>
        ))}
      </nav>
      <div className="sidebar__bottom">
        {profile && <div className="sidebar__profile">
          <span className="avatar avatar--small" aria-hidden="true">{profile.name.charAt(0).toUpperCase()}</span>
          <span className="sidebar__profile-text"><strong>{profile.name}</strong><small>{profile.subtitle}</small></span>
        </div>}
        {onLogout && <button type="button" className="sidebar__logout" onClick={onLogout}><LogOut size={16} aria-hidden="true" /> Keluar</button>}
      </div>
    </aside>
  )
}
