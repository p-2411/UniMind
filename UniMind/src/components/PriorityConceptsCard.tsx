import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Target } from "lucide-react"

export function PriorityConceptsCard({ className }: { className?: string }) {
  return (
    <Card className={`${className} `}>
      <CardHeader>
        <div>
          <CardTitle className="text-xl">Priority Concepts</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Calculus Item */}
        <div className="p-2 md:p-3 border rounded-lg hover:bg-gray-800/50 dark:hover:bg-gray-800/50 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-8 bg-blue-500 rounded-full" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1 md:gap-1.5">
                <span className="text-xs text-muted-foreground">Calculus</span>
                <span className="px-1.5 py-0.5 text-xs font-medium text-red-200 bg-red-900/40 rounded-full">high</span>
                <span className="hidden md:inline text-xs font-medium">·</span>
                <span className="text-xs font-medium">Integration by Parts</span>
              </div>
            </div>
            <button className="p-1 hover:bg-gray-700 rounded transition-colors shrink-0">
              <Target className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Physics Item */}
        <div className="p-2 md:p-3 border rounded-lg hover:bg-gray-800/50 dark:hover:bg-gray-800/50 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-8 bg-purple-500 rounded-full" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1 md:gap-1.5">
                <span className="text-xs text-muted-foreground">Physics</span>
                <span className="px-1.5 py-0.5 text-xs font-medium text-red-200 bg-red-900/40 rounded-full">high</span>
                <span className="hidden md:inline text-xs font-medium">·</span>
                <span className="text-xs font-medium">Quantum Mechanics Principles</span>
              </div>
            </div>
            <button className="p-1 hover:bg-gray-700 rounded transition-colors shrink-0">
              <Target className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>

        {/* Computer Science Item */}
        <div className="p-2 md:p-3 border rounded-lg hover:bg-gray-800/50 dark:hover:bg-gray-800/50 transition-colors">
          <div className="flex items-center gap-2">
            <div className="w-0.5 h-8 bg-blue-500 rounded-full" />
            <div className="flex-1 min-w-0">
              <div className="flex flex-wrap items-center gap-1 md:gap-1.5">
                <span className="text-xs text-muted-foreground">Computer Science</span>
                <span className="px-1.5 py-0.5 text-xs font-medium text-yellow-200 bg-yellow-900/40 rounded-full">medium</span>
                <span className="hidden md:inline text-xs font-medium">·</span>
                <span className="text-xs font-medium">Dynamic Programming</span>
              </div>
            </div>
            <button className="p-1 hover:bg-gray-700 rounded transition-colors shrink-0">
              <Target className="w-3.5 h-3.5 text-gray-400" />
            </button>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}