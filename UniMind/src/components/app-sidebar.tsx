import { BookOpen, Home, Inbox, Settings } from "lucide-react"
import logo from "../assets/logo.png"
import { Link } from "react-router-dom"

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

// Menu items.
const items = [
  {
    title: "My Dashboard",
    url: "/dashboard",
    icon: Home,
  },
  {
    title: "My Subjects",
    url: "/subjects",
    icon: Inbox,
  },
  {
    title: "Content Review",
    url: "/review",
    icon: BookOpen,
  },
]

export function AppSidebar() {
  return (
    <Sidebar variant="sidebar" className="!h-screen border-r sticky top-0">
      <SidebarHeader className="flex pt-6 pb-4 px-8">
          <Link to="/dashboard" className="flex items-center font-bold text-2xl">
            <img src={logo} alt="UniMind Logo" className="h-10 w-10 mr-1" />
            <span className="ml-2">UniMind</span>
          </Link>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="p-6 gap-y-2">
              {items.map((item) => (
                <SidebarMenuItem key={item.title} >
                  <SidebarMenuButton asChild className="gap-4">
                    <Link to={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <SidebarFooter>
        <SidebarMenu className="p-6 gap-y-2">

                <SidebarMenuItem key="settings">
                  <SidebarMenuButton asChild className="gap-4">
                    <Link to="/settings">
                      <Settings />
                      <span>Settings</span>
                    </Link>
                  </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
    </Sidebar>
  )
}
