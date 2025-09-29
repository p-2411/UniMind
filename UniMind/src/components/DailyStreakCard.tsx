import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Flame } from "lucide-react"

export function DailyStreakCard({ className }: { className?: string }) {
  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div>
          <CardTitle className="text-xl">Daily Streak</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="flex items-center justify-center py-8">
        <div className="flex flex-col items-center gap-3">
          <div className="flex items-center justify-center w-16 h-16 rounded-full bg-orange-500/10 border-2 border-orange-500">
            <Flame className="w-8 h-8 text-orange-500" />
          </div>
          <div className="text-center">
            <div className="text-4xl font-bold">7</div>
            <p className="text-sm text-muted-foreground">days</p>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}