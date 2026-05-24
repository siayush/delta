import { forwardRef, type InputHTMLAttributes } from 'react'
import { cn } from '../../lib/utils'

export const Input = forwardRef<HTMLInputElement, InputHTMLAttributes<HTMLInputElement>>(
  function Input({ className, ...rest }, ref) {
    return (
      <input
        ref={ref}
        className={cn(
          'h-8 w-full rounded-md border border-(--color-border) bg-(--color-bg-elev) px-2.5 text-[13px] text-(--color-fg) outline-none placeholder:text-(--color-fg-subtle) focus:border-(--color-accent)',
          className
        )}
        {...rest}
      />
    )
  }
)
