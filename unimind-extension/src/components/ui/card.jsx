import { cn } from "@/lib/utils"

export function Card({ className, ...props }) {
  return (
    <div
      data-slot="card"
      className={cn(
        "flex flex-col gap-6 rounded-2xl border border-white/10 bg-white/5 py-6 shadow-[0_24px_50px_-20px_rgba(15,23,42,0.4)] backdrop-blur",
        className
      )}
      {...props}
    />
  )
}

export function CardHeader({ className, ...props }) {
  return (
    <div
      data-slot="card-header"
      className={cn("grid items-start gap-1.5 px-6", className)}
      {...props}
    />
  )
}

export function CardTitle({ className, ...props }) {
  return (
    <h3
      data-slot="card-title"
      className={cn("text-lg font-semibold text-white", className)}
      {...props}
    />
  )
}

export function CardDescription({ className, ...props }) {
  return (
    <p
      data-slot="card-description"
      className={cn("text-sm text-gray-300", className)}
      {...props}
    />
  )
}

export function CardContent({ className, ...props }) {
  return (
    <div
      data-slot="card-content"
      className={cn("px-6", className)}
      {...props}
    />
  )
}

export function CardFooter({ className, ...props }) {
  return (
    <div
      data-slot="card-footer"
      className={cn("flex items-center px-6", className)}
      {...props}
    />
  )
}

