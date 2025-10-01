import { forwardRef } from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"
import { cn } from "@/lib/utils"

const ScrollArea = forwardRef(function ScrollArea({ className, children, ...props }, ref) {
  return (
    <ScrollAreaPrimitive.Root
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport className="h-full w-full rounded-[inherit]">
        {children}
      </ScrollAreaPrimitive.Viewport>
      <ScrollBar />
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
})

function ScrollBar({ className, orientation = "vertical", ...props }) {
  return (
    <ScrollAreaPrimitive.ScrollAreaScrollbar
      orientation={orientation}
      className={cn(
        "flex touch-none select-none transition-colors",
        orientation === "vertical" && "h-full w-2.5 border-l border-white/10",
        orientation === "horizontal" && "h-2.5 border-t border-white/10",
        className
      )}
      {...props}
    >
      <ScrollAreaPrimitive.ScrollAreaThumb className="relative flex-1 rounded-full bg-white/40" />
    </ScrollAreaPrimitive.ScrollAreaScrollbar>
  )
}

const ScrollViewport = ScrollAreaPrimitive.Viewport
const ScrollCorner = ScrollAreaPrimitive.Corner

export { ScrollArea, ScrollBar, ScrollViewport, ScrollCorner }

