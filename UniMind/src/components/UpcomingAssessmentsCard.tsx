import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card"
import { Calendar, Clock } from "lucide-react"

export function UpcomingAssessmentsCard({ className }: { className?: string }) {
  return (
    <Card className={`${className}`}>
      <CardHeader>
        <div>
          <CardTitle className="text-xl">Upcoming Assessments</CardTitle>
        </div>
      </CardHeader>
      <CardContent className="space-y-2">
        {/* Midterm Exam */}
        <div className="p-3 border rounded-lg hover:bg-gray-800/50 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Calculus Midterm</h3>
              <p className="text-xs text-muted-foreground">Chapters 1-5: Limits & Derivatives</p>
            </div>
            <span className="px-2 py-0.5 text-xs font-medium text-red-200 bg-red-900/40 rounded-full">High Stakes</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Mar 15, 2024</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>2:00 PM</span>
            </div>
          </div>
        </div>

        {/* Physics Quiz */}
        <div className="p-3 border rounded-lg hover:bg-gray-800/50 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Quantum Mechanics Quiz</h3>
              <p className="text-xs text-muted-foreground">Wave functions & Operators</p>
            </div>
            <span className="px-2 py-0.5 text-xs font-medium text-yellow-200 bg-yellow-900/40 rounded-full">Quiz</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Mar 18, 2024</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>10:00 AM</span>
            </div>
          </div>
        </div>

        {/* Programming Assignment */}
        <div className="p-3 border rounded-lg hover:bg-gray-800/50 transition-colors">
          <div className="flex items-start justify-between mb-2">
            <div className="flex-1">
              <h3 className="font-semibold text-sm mb-1">Data Structures Project</h3>
              <p className="text-xs text-muted-foreground">Implement Binary Search Tree</p>
            </div>
            <span className="px-2 py-0.5 text-xs font-medium text-blue-200 bg-blue-900/40 rounded-full">Assignment</span>
          </div>
          <div className="flex items-center gap-4 text-xs text-muted-foreground">
            <div className="flex items-center gap-1">
              <Calendar className="w-3.5 h-3.5" />
              <span>Mar 20, 2024</span>
            </div>
            <div className="flex items-center gap-1">
              <Clock className="w-3.5 h-3.5" />
              <span>11:59 PM</span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  )
}