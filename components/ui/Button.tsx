import { ButtonHTMLAttributes, forwardRef } from 'react'

type Variant = 'primary' | 'secondary' | 'danger' | 'accent'
type Size = 'sm' | 'md' | 'lg'

interface Props extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
  fullWidth?: boolean
}

const variantStyles: Record<Variant, string> = {
  primary:
    'bg-brand-green text-white border-b-4 border-brand-green-dark hover:brightness-105 active:border-b-2 active:translate-y-[2px]',
  secondary:
    'bg-card text-foreground border-2 border-border hover:border-foreground',
  danger:
    'bg-brand-rose text-white border-b-4 border-brand-rose-dark hover:brightness-105 active:border-b-2 active:translate-y-[2px]',
  accent:
    'bg-brand-blue text-white border-b-4 border-brand-blue-dark hover:brightness-105 active:border-b-2 active:translate-y-[2px]',
}

const sizeStyles: Record<Size, string> = {
  sm: 'text-xs px-3 py-1.5 rounded-lg',
  md: 'text-sm px-4 py-2.5 rounded-xl',
  lg: 'text-base px-6 py-3 rounded-xl',
}

const Button = forwardRef<HTMLButtonElement, Props>(function Button(
  { variant = 'primary', size = 'md', fullWidth, className = '', children, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={`font-bold transition disabled:opacity-40 disabled:cursor-not-allowed inline-flex items-center justify-center gap-2 ${
        variantStyles[variant]
      } ${sizeStyles[size]} ${fullWidth ? 'w-full' : ''} ${className}`}
      {...rest}
    >
      {children}
    </button>
  )
})

export default Button
