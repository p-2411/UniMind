import { forwardRef } from "react"
import { cn } from "@/lib/utils"

export const Label = forwardRef(function Label({ className, ...props }, ref) {
  return (
    <label
      ref={ref}
      className={cn("text-xs font-medium text-slate-300", className)}
      {...props}
    />
  )
})

