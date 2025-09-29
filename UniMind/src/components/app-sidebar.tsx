import { BookOpen, Home, Inbox, Search, Settings } from "lucide-react"
import logo from "../assets/logo.png"

import {
  Sidebar,
  SidebarContent,
  SidebarHeader,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "./ui/sidebar.tsx"

// Menu items.
const items = [
  {
    title: "My Dashboard",
    url: "#",
    icon: Home,
  },
  {
    title: "My Subjects",
    url: "#",
    icon: Inbox,
  },
  {
    title: "Content Review",
    url: "#",
    icon: BookOpen,
  },
  {
    title: "Search",
    url: "#",
    icon: Search,
  },
  {
    title: "Settings",
    url: "#",
    icon: Settings,
  },
]

export function AppSidebar() {
  return (
    <Sidebar variant="sidebar" className="!h-screen border-r sticky top-0">
      <SidebarHeader className="flex pt-6 pb-4 px-8">
          <a href="#" className="flex items-center font-bold text-2xl">
            <img src={logo} alt="UniMind Logo" className="h-15 w-15" />
            <span className="ml-2">UniMind</span>
          </a>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu>
              {items.map((item) => (
                <SidebarMenuItem key={item.title}>
                  <SidebarMenuButton asChild>
                    <a href={item.url}>
                      <item.icon />
                      <span>{item.title}</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
              ))}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
    </Sidebar>
  )
}