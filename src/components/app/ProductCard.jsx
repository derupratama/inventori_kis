import { ArrowUpRight } from 'lucide-react'
import { Link } from 'react-router-dom'
import { Badge, Card } from '../index.js'
import { ProductArtwork } from './ProductArtwork.jsx'
import { diaryDateLabel } from '../../lib/diary-date.js'
import { expiryStatusLabels, getExpiryInfo } from '../../lib/expiration.js'

export function ProductCard({ product }) {
  const expiry = getExpiryInfo(product)
  const tone = expiry.status === 'expired' ? 'rose' : expiry.status === 'expiring_soon' ? 'cream' : expiry.status === 'active' ? 'muted' : 'neutral'
  const countdown = expiry.daysRemaining == null ? 'Tanggal belum dicatat' : expiry.daysRemaining < 0 ? `Lewat ${Math.abs(expiry.daysRemaining)} hari` : expiry.daysRemaining === 0 ? 'Hari ini' : `${expiry.daysRemaining} hari lagi`

  return (
    <Link className="product-card-link" to={`/collection/${product.id}`} aria-label={`Lihat detail ${product.name}`}>
      <Card className="product-card">
        <ProductArtwork product={product} />
        <div className="product-card__body">
          <div className="product-card__topline"><span>{product.brand}</span><Badge tone="rose">{product.category}</Badge></div>
          <h3>{product.name}</h3>
          <div className="product-card__expiry-status"><Badge tone={tone} dot>{expiryStatusLabels[expiry.status]}</Badge><span>{countdown}</span></div>
          <div className="product-card__bottom"><span>{product.size}</span><span className="product-card__expiry">{expiry.effectiveExpiryDate ? `EXP ${diaryDateLabel(expiry.effectiveExpiryDate, { day: 'numeric', month: 'short', year: '2-digit' })}` : 'EXP —'}</span><span className="product-card__arrow"><ArrowUpRight size={16} aria-hidden="true" /></span></div>
        </div>
      </Card>
    </Link>
  )
}
