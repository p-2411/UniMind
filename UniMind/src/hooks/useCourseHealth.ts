import { useEffect, useState } from "react"

export type SubjectOverview = {
  course_id: number
  course_code: string
  course_name: string
  overall_mastery: number  // 0..1
  due_count: number
  completed_due_count: number
  upcoming_assessments: { id: number; title: string; due_at?: string | null }[]
}

export function useCourseHealth(courseIds: (number | string)[]) {
  const [map, setMap] = useState<Record<string, SubjectOverview | null>>({})
  useEffect(() => {
    let cancelled = false
    const token = localStorage.getItem("access_token") ?? ""
    const baseUrl = (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ?? "http://localhost:8000"

    async function load(id: string) {
      try {
        const res = await fetch(`${baseUrl}/courses/${id}/overview`, { headers: { Authorization: `Bearer ${token}` } })
        if (!res.ok) return null
        return (await res.json()) as SubjectOverview
      } catch { return null }
    }

    ;(async () => {
      const ids = courseIds.map(String)
      const out: Record<string, SubjectOverview | null> = {}
      await Promise.all(ids.map(async id => { out[id] = await load(id) }))
      if (!cancelled) setMap(out)
    })()

    return () => { cancelled = true }
  }, [courseIds.join(",")])

  return map
}
