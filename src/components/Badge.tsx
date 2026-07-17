type BadgeVariant = 'danger' | 'warn' | 'ok' | 'accent' | 'muted'

const STYLES: Record<BadgeVariant, string> = {
  danger: 'bg-danger-soft text-danger',
  warn: 'bg-warn-soft text-warn',
  ok: 'bg-ok-soft text-ok',
  accent: 'bg-accent-soft text-accent',
  muted: 'bg-bg text-muted',
}

export function Badge({ children, variant = 'muted' }: { children: React.ReactNode; variant?: BadgeVariant }) {
  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-semibold ${STYLES[variant]}`}>
      {children}
    </span>
  )
}
