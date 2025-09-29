
import './App.css'
import { SidebarProvider, SidebarInset } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { PriorityConceptsCard } from "@/components/PriorityConceptsCard"
import { DailyStreakCard } from "@/components/DailyStreakCard"
import { UpcomingAssessmentsCard } from "@/components/UpcomingAssessmentsCard"

function App() {
  const user = "Parham"
  return (
  <SidebarProvider defaultOpen={true}>
    <AppSidebar />
      <SidebarInset className="p-6 min-h-screen">
        <header className="flex h-12 items-center gap-2 border-b-1 p-8">
          <h1 className="text-3xl font-semibold bg-gradient-to-r from-yellow-300 to-orange-400 inline-block text-transparent bg-clip-text">Welcome back, {user}!</h1>
          </header>
          
          <div className="p-4">
            {/* Dashboard Grid */}
            <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
              <PriorityConceptsCard className="lg:col-span-3"/>
              <DailyStreakCard className="lg:col-span-1"/>
              <UpcomingAssessmentsCard className="lg:col-span-4"/>
            </div>
          </div>
      </SidebarInset>
    </SidebarProvider>
  )
}

export default App
