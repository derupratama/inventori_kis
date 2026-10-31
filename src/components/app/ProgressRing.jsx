export function ProgressRing({ value, size = 54, label = 'Progress' }) {
  const safeValue = Math.max(0, Math.min(100, value))
  const radius = 23
  const circumference = 2 * Math.PI * radius
  const offset = circumference * (1 - safeValue / 100)

  return (
    <span className="progress-ring" style={{ width: size, height: size }} role="progressbar" aria-label={label} aria-valuenow={safeValue} aria-valuemin={0} aria-valuemax={100}>
      <svg viewBox="0 0 54 54" aria-hidden="true">
        <circle className="progress-ring__track" cx="27" cy="27" r={radius} />
        <circle className="progress-ring__value" cx="27" cy="27" r={radius} strokeDasharray={circumference} strokeDashoffset={offset} />
      </svg>
      <span>{safeValue}%</span>
    </span>
  )
}
