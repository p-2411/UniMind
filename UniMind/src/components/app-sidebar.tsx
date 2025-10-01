import { BookOpen, Home, Inbox, Settings } from "lucide-react"
import logo from "../assets/logo.png"

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
          <a href="#" className="flex items-center font-bold text-2xl">
            <img src={logo} alt="UniMind Logo" className="h-10 w-10 mr-1" />
            <span className="ml-2">UniMind</span>
          </a>
      </SidebarHeader>
      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="p-6 gap-y-2">
              {items.map((item) => (
                <SidebarMenuItem key={item.title} >
                  <SidebarMenuButton asChild className="gap-4">
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
      <SidebarFooter>
        <SidebarMenu className="p-6 gap-y-2">

                <SidebarMenuItem key="settings">
                  <SidebarMenuButton asChild className="gap-4">
                    <a href="#">
                      <Settings />
                      <span>Settings</span>
                    </a>
                  </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>
        </SidebarFooter>
    </Sidebar>
  )
}
