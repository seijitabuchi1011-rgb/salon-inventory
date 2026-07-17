interface CardProps {
  children: React.ReactNode
  className?: string
  padding?: boolean
}

export function Card({ children, className = '', padding = true }: CardProps) {
  return (
    <div className={`bg-surface border border-border rounded-lg ${padding ? 'p-4' : ''} ${className}`}>
      {children}
    </div>
  )
}
