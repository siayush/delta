import { forwardRef, type ButtonHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

type Variant = 'primary' | 'outline' | 'ghost' | 'danger'
type Size = 'sm' | 'md' | 'icon'

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant
  size?: Size
}

const variants: Record<Variant, string> = {
  primary:
    'bg-(--color-accent) text-(--color-accent-fg) hover:opacity-90 disabled:opacity-50',
  outline:
    'border border-(--color-border) bg-transparent hover:bg-(--color-bg-elev) disabled:opacity-50',
  ghost: 'bg-transparent hover:bg-(--color-bg-elev) disabled:opacity-50',
  danger: 'bg-(--color-danger) text-white hover:opacity-90 disabled:opacity-50'
}

const sizes: Record<Size, string> = {
  sm: 'h-7 px-2.5 text-[12px] gap-1',
  md: 'h-8 px-3 text-[13px] gap-1.5',
  icon: 'h-7 w-7 p-0 inline-flex items-center justify-center'
}

export const Button = forwardRef<HTMLButtonElement, ButtonProps>(function Button(
  { variant = 'primary', size = 'sm', className, ...rest },
  ref
) {
  return (
    <button
      ref={ref}
      className={cn(
        'inline-flex items-center justify-center rounded-md font-medium transition-colors cursor-pointer disabled:cursor-not-allowed',
        variants[variant],
        sizes[size],
        className
      )}
      {...rest}
    />
  )
})
