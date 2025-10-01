import { forwardRef } from "react"
import { cn } from "@/lib/utils"

export const Input = forwardRef(function Input({ className, type = "text", ...props }, ref) {
  return (
    <input
      type={type}
      ref={ref}
      className={cn(
        "flex h-9 w-full rounded-md border border-white/15 bg-transparent px-3 py-1 text-sm text-white placeholder:text-slate-400 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-orange-400 disabled:cursor-not-allowed disabled:opacity-50",
        className
      )}
      {...props}
    />
  )
})

