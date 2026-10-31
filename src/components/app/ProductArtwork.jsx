import { useEffect, useState } from 'react'
import { supabase } from '../../lib/supabaseClient.js'

export function ProductArtwork({ product, className = '' }) {
  const [imageUrl, setImageUrl] = useState('')
  useEffect(() => {
    let active = true
    if (!product.imagePath || !supabase) { setImageUrl(''); return () => { active = false } }
    supabase.storage.from('product-images').createSignedUrl(product.imagePath, 900)
      .then(({ data, error }) => { if (active) setImageUrl(error ? '' : data?.signedUrl ?? '') })
      .catch(() => { if (active) setImageUrl('') })
    return () => { active = false }
  }, [product.imagePath])
  if (imageUrl) return <div className={`product-photo product-photo--${product.categoryGroup ?? 'skincare'} ${className}`.trim()}><img src={imageUrl} alt={`Foto ${product.name}`} loading="lazy" /></div>
  return (
    <div
      className={`product-art product-art--${product.bottle} ${product.categoryGroup === 'makeup' ? 'product-art--makeup' : 'product-art--skincare'} ${className}`.trim()}
      style={{ '--product-accent': product.accent }}
      aria-label={`Ilustrasi ${product.name}`}
      role="img"
    >
      <span className="product-art__category-placeholder" aria-hidden="true">{product.categoryGroup === 'makeup' ? '✦' : '❀'}</span>
      <span className="product-art__orbit" />
      <span className="product-art__orb product-art__orb--one" />
      <span className="product-art__orb product-art__orb--two" />
      <span className={`product-bottle product-bottle--${product.bottle}`}>
        <span className="product-bottle__cap" />
        <span className="product-bottle__neck" />
        <span className="product-bottle__body">
          <span className="product-bottle__brand">{product.brand}</span>
          <span className="product-bottle__mark" />
          <span className="product-bottle__name">{product.name}</span>
          <span className="product-bottle__size">{product.size}</span>
        </span>
      </span>
      <span className="product-art__sparkle product-art__sparkle--one">✳</span>
      <span className="product-art__sparkle product-art__sparkle--two">✳</span>
    </div>
  )
}
