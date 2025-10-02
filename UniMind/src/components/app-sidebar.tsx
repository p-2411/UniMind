import { BookOpen, Home, Inbox, Settings } from "lucide-react"
import logo from "../assets/logo.png"
import { Link, useLocation } from "react-router-dom"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarFooter,
} from "./ui/sidebar.tsx"

const items = [
  { title: "My Dashboard", url: "/dashboard", icon: Home },
  { title: "My Subjects",  url: "/subjects",  icon: Inbox },
  { title: "Content Review", url: "/review", icon: BookOpen },
]

export function AppSidebar() {
  const { pathname } = useLocation()

  return (
    <Sidebar
      variant="sidebar"
      className={[
        "!h-screen sticky top-0",
        "border-r border-white/10",
        "bg-white/10 dark:bg-slate-900/10",
        "backdrop-blur-xl backdrop-saturate-150",
        "shadow-[0_10px_40px_-12px_rgba(0,0,0,0.4)]",
        "ring-1 ring-inset ring-white/10",
      ].join(" ")}
    >
      {/* Header */}
      <SidebarHeader className="pt-6 pb-4 px-6">
        <Link
          to="/dashboard"
          className="flex items-center gap-2 font-semibold text-xl"
        >
          <div className="h-9 w-9 rounded-2xl overflow-hidden shadow-md shadow-black/20">
            <img src={logo} alt="UniMind" className="h-full w-full object-contain" />
          </div>
          <span className=" bg-yellow-300 text-transparent bg-clip-text">
            UniMind
          </span>
        </Link>
      </SidebarHeader>

      {/* Main nav */}
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="px-4 py-4 gap-y-2">
              {items.map((item) => {
                const active = pathname.startsWith(item.url)
                return (
                  <SidebarMenuItem key={item.title}>
                    <SidebarMenuButton
                      asChild
                      className={[
                        "gap-3 rounded-xl px-3 py-2 transition-colors",
                        active
                          ? "bg-white/15 ring-1 ring-white/15 text-white"
                          : "hover:bg-white/12 text-gray-200",
                      ].join(" ")}
                    >
                      <Link to={item.url}>
                        <item.icon className="h-5 w-5" />
                        <span>{item.title}</span>
                      </Link>
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                )
              })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      {/* Footer — compact settings with a short divider */}
      <SidebarFooter className="mt-auto px-4 pb-4">
        {/* short divider (not full width) */}
        <div className="mx-2 mb-3 h-px bg-white/10 rounded-full" />
        <SidebarMenu>
          <SidebarMenuItem key="settings">
            <SidebarMenuButton
              asChild
              className="gap-3 px-2 py-2 rounded-lg text-gray-300 hover:text-white hover:bg-white/5 transition-colors"
            >
              <Link to="/settings">
                <Settings className="w-5 h-5" />
                <span>Settings</span>
              </Link>
            </SidebarMenuButton>
          </SidebarMenuItem>
        </SidebarMenu>
      </SidebarFooter>


    </Sidebar>
  )
}
