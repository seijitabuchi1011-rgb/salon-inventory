type BtnVariant = 'primary' | 'ghost' | 'danger'
type BtnSize = 'sm' | 'md' | 'lg'

const VARIANT: Record<BtnVariant, string> = {
  primary: 'bg-accent text-white hover:bg-indigo-700 active:bg-indigo-800',
  ghost: 'bg-transparent border border-border text-text hover:bg-bg',
  danger: 'bg-danger text-white hover:opacity-90',
}
const SIZE: Record<BtnSize, string> = {
  sm: 'h-btn-sm px-4 text-xs',
  md: 'h-btn-md px-5 text-sm',
  lg: 'h-btn-lg px-6 text-md',
}

interface BtnProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: BtnVariant
  size?: BtnSize
}

export function Btn({ variant = 'ghost', size = 'sm', className = '', children, ...props }: BtnProps) {
  return (
    <button
      className={`inline-flex items-center justify-center gap-1.5 rounded-md font-bold transition-colors ${VARIANT[variant]} ${SIZE[size]} ${className}`}
      {...props}
    >
      {children}
    </button>
  )
}
