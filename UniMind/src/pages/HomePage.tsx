
import '../App.css'
import { SidebarProvider, SidebarInset, SidebarTrigger } from "@/components/ui/sidebar"
import { AppSidebar } from "@/components/app-sidebar"
import { PriorityConceptsCard } from "@/components/PriorityConceptsCard"
import { DailyStreakCard } from "@/components/DailyStreakCard"
import { UpcomingAssessmentsCard } from "@/components/UpcomingAssessmentsCard"
import { useState } from 'react'

type User = {
  name: string;
  email: string;
  display_name: string;
  created_at: string;

  // Relationships
  enrolments: any[];
  attempts: number;
  progress: any[];
  streak: number;
}

// }id: Mapped[uuid.UUID] = mapped_column(PG_UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
//     email: Mapped[str] = mapped_column(String(255), unique=True, index=True, nullable=False)
//     display_name: Mapped[str] = mapped_column(String(120), nullable=False)

//     created_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), server_default=func.now(), nullable=False)

//     # Relationships
//     enrolments: Mapped[list["Enrolment"]] = relationship(back_populates="user", cascade="all, delete-orphan")
//     attempts:   Mapped[list["QuestionAttempt"]] = relationship(back_populates="user", cascade="all, delete-orphan")
//     progress:   Mapped[list["TopicProgress"]] = relationship(back_populates="user", cascade="all, delete-orphan")
//     streak:     Mapped["DailyStreak"] | None = relationship(back_populates="user", uselist=False, cascade="all, delete-orphan")

function HomePage() {
  const [user, setUser] = useState<User>({ 
    name: "parham", //grab other user details from database
    email: "parham@example.com",
    display_name: "Parham Sepasgozar",
    created_at: "2023-01-01T00:00:00Z",
    enrolments: [],
    attempts: 0,
    progress: [],
    streak: 0
  })

  return (
  <SidebarProvider defaultOpen={true}>
    <AppSidebar />
      <SidebarInset className="p-6 min-h-screen bg-gradient-to-br from-gray-950 to-[#052334]">
        <header className="flex h-12 items-center gap-2 border-b-1 p-8">
          <SidebarTrigger className="md:hidden -ml-8 mr-2" />
          <h1 className="text-3xl font-semibold bg-gradient-to-r from-yellow-300 to-orange-400 inline-block text-transparent bg-clip-text">Welcome back, {user.name.charAt(0).toUpperCase() + user.name.slice(1)}!</h1>
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

export default HomePage
