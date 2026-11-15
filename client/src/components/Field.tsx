import type { ReactNode } from 'react'

export function Field({
  label,
  hint,
  children,
  wide = false,
}: {
  label: string
  hint?: ReactNode
  children: ReactNode
  wide?: boolean
}) {
  return (
    <label className={`field${wide ? ' field-wide' : ''}`}>
      <span className="field-label">{label}</span>
      {children}
      {hint && <span className="field-hint">{hint}</span>}
    </label>
  )
}
