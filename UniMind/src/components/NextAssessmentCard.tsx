// src/components/NextAssessmentCard.tsx
import { Clock, CalendarDays, ChevronRight } from "lucide-react";
import { Card, CardHeader, CardTitle, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";

type NextAssessmentProps = {
  daysRemaining: number | null;               // e.g., 4 (null = none)
  courseCode?: string;                        // e.g., "COMP1511_T3"
  title?: string;                             // e.g., "Lab 3"
  dueAtISO?: string | null;                   // e.g., "2025-10-06T09:00:00Z"
  onOpen?: () => void;                        // light, tertiary action (optional)
};

function formatDate(d?: string | null) {
  if (!d) return "";
  const t = Date.parse(d);
  if (Number.isNaN(t)) return "";
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric" })
    .format(new Date(t));
}

export default function NextAssessmentCard({
  daysRemaining,
  courseCode,
  title,
  dueAtISO,
  onOpen,
}: NextAssessmentProps) {
  const dueLabel =
    daysRemaining === null ? "—" :
    daysRemaining === 0 ? "Due today" :
    daysRemaining > 0 ? `${daysRemaining}d` : `${Math.abs(daysRemaining)}d overdue`;

  return (
    <Card className="bg-white/5 border-white/10">
      <CardHeader className="pb-2">
        <CardTitle className="text-sm text-gray-400 inline-flex items-center gap-2">
          <Clock className="h-4 w-4 text-sky-400" /> Next assessment
        </CardTitle>
      </CardHeader>

      <CardContent className="flex items-center gap-5">
        {/* Big countdown number with subtle label */}
        <div className="shrink-0 text-center">
          <div className="text-4xl font-semibold leading-none text-white">{dueLabel}</div>
          <div className="mt-1 text-[11px] uppercase tracking-wide text-gray-400">Time remaining</div>
        </div>

        {/* Info */}
        <div className="min-w-0 flex-1">
          {courseCode && (
            <div className="mb-1 inline-flex items-center rounded-full border border-white/10 bg-white/5 px-2 py-0.5 text-xs font-mono text-orange-300/90">
              {courseCode}
            </div>
          )}
          <div className="font-medium truncate text-white">{title || "Assessment"}</div>
          <div className="mt-1 flex items-center gap-2 text-xs text-gray-400">
            <CalendarDays className="h-3.5 w-3.5 opacity-80" />
            <span>{formatDate(dueAtISO)}</span>
          </div>
        </div>

        {/* Tertiary action (small + subtle; optional) */}
        {onOpen && (
          <Button
            variant="ghost"
            size="sm"
            className="text-slate-200 hover:text-white hover:bg-white/10"
            onClick={onOpen}
          >
            Open <ChevronRight className="ml-1 h-4 w-4" />
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
