import { forwardRef } from "react"
import { Slot } from "@radix-ui/react-slot"
import { cva } from "class-variance-authority"
import { cn } from "@/lib/utils"

const buttonVariants = cva(
  "inline-flex items-center justify-center gap-2 whitespace-nowrap rounded-md text-sm font-medium transition-all disabled:pointer-events-none disabled:opacity-50 [&_svg]:pointer-events-none [&_svg:not([class*='size-'])]:size-4 shrink-0 [&_svg]:shrink-0 outline-none focus-visible:border-orange-300 focus-visible:ring-2 focus-visible:ring-orange-400/60",
  {
    variants: {
      variant: {
        default: "bg-gradient-to-r from-yellow-300 via-orange-400 to-orange-500 text-slate-900 hover:from-yellow-400 hover:via-orange-500 hover:to-orange-600",
        destructive: "bg-red-500 text-white hover:bg-red-600",
        outline: "border border-white/20 bg-white/5 text-white hover:bg-white/10",
        ghost: "text-white hover:bg-white/10",
        link: "text-orange-300 underline-offset-4 hover:underline",
      },
      size: {
        default: "h-9 px-4 py-2",
        sm: "h-8 px-3 text-xs",
        lg: "h-11 px-6 text-base",
        icon: "h-9 w-9",
      },
    },
    defaultVariants: {
      variant: "default",
      size: "default",
    },
  }
)

export const Button = forwardRef(function Button(
  { className, variant, size, asChild = false, ...props },
  ref
) {
  const Comp = asChild ? Slot : "button"
  return (
    <Comp
      ref={ref}
      data-slot="button"
      className={cn(buttonVariants({ variant, size, className }))}
      {...props}
    />
  )
})

export { buttonVariants }

