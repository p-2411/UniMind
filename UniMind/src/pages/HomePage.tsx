
import '../App.css'
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
  <SidebarProvider defaultOpen={true}>
    <AppSidebar />
      <SidebarInset className="p-6 min-h-screen bg-gradient-to-br from-gray-950 to-[#052334]">
        <header className="flex h-12 items-center gap-2 border-b-1 p-8">
          <SidebarTrigger className="md:hidden -ml-8 mr-2" />
          <h1 className="text-3xl font-semibold bg-gradient-to-r from-yellow-300 to-orange-400 inline-block text-transparent bg-clip-text">Welcome back, {user.display_name.split(' ')[0][0].toUpperCase() + user.display_name.split(' ')[0].slice(1)}!</h1>
        </header>

        <div className="p-4">
          {/* Dashboard Grid */}
          <div className="grid grid-cols-1 lg:grid-cols-4 gap-6 items-stretch">
            <PriorityConceptsCard className="lg:col-span-3 h-full" />
            <DailyStreakCard className="lg:col-span-1 h-full" />
            <UpcomingAssessmentsCard className="lg:col-span-4" />
          </div>
        </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default HomePage
