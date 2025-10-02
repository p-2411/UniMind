import "../App.css"
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { PriorityConceptsCard } from "@/components/PriorityConceptsCard"
import { DailyStreakCard } from "@/components/DailyStreakCard"
import { UpcomingAssessmentsCard } from "@/components/UpcomingAssessmentsCard"
import { useAuth } from "@/contexts/AuthContext"

function HomePage() {
  const { user } = useAuth()

  if (!user) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50">
        <div className="text-center">
          <p className="text-gray-600">Loading...</p>
        </div>
      </div>
    )
  }

  return (
    <div className="relative min-h-screen isolate">
      {/* FULL-PAGE BACKGROUND (sits behind sidebar + content) */}
      <div
        aria-hidden
        className="
          fixed inset-0 -z-10
          bg-gradient-to-br from-gray-950 to-[#052334]
        "
      >
        {/* orbs + grid as additional layers */}
        <div
          className="
            absolute inset-0
            bg-[radial-gradient(1200px_600px_at_80%_-10%,rgba(250,204,21,0.08),transparent),
                radial-gradient(900px_500px_at_-10%_0%,rgba(251,146,60,0.08),transparent),
                linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),
                linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)]
            bg-[length:auto,auto,36px_36px,36px_36px]
            bg-[position:center,center,center,center]
          "
        />
      </div>

      <SidebarProvider defaultOpen={true}>
        <AppSidebar />
        {/* Make the inset transparent so the global background shows through */}
        <SidebarInset className="relative min-h-screen p-6 bg-transparent">
          <header className="mb-6 flex h-12 items-center gap-2 p-8 border-b border-white/10">
            <SidebarTrigger className="md:hidden -ml-8 mr-2" />
            <h1 className="text-3xl font-semibold bg-yellow-400 inline-block text-transparent bg-clip-text">
              Welcome back, {user.display_name.split(' ')[0][0].toUpperCase() + user.display_name.split(' ')[0].slice(1)}!
            </h1>
          </header>

          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 items-stretch gap-6 lg:grid-cols-4">
            <PriorityConceptsCard className="lg:col-span-3 h-full" />
            <DailyStreakCard className="lg:col-span-1 h-full" />
            <UpcomingAssessmentsCard className="lg:col-span-4" />
          </div>
        </SidebarInset>
      </SidebarProvider>
    </div>
  )
}

export default HomePage
