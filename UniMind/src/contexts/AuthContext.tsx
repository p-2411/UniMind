import { createContext, useContext, useState, useEffect, type ReactNode } from "react"

interface User {
  id: string
  email: string
  display_name: string
  is_active: boolean
  created_at: string
}

interface AuthContextType {
  user: User | null
  isAuthenticated: boolean
  loading: boolean
  login: (token: string, userData: User) => void
  logout: () => void
}

const AuthContext = createContext<AuthContextType | undefined>(undefined)

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // Check for stored auth data on mount
    const token = localStorage.getItem("access_token")
    const storedUser = localStorage.getItem("user")

    if (token && storedUser) {
      try {
        const userData = JSON.parse(storedUser)
        setUser(userData)
      } catch (err) {
        console.error("Failed to parse user data", err)
        localStorage.removeItem("access_token")
        localStorage.removeItem("user")
      }
    }

    setLoading(false)
  }, [])

  const login = (token: string, userData: User) => {
    localStorage.setItem("access_token", token)
    localStorage.setItem("user", JSON.stringify(userData))
    setUser(userData)

    // Also store in Chrome storage for extension access
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.set({
        access_token: token,
        user: userData
      })
    }
  }

  const logout = () => {
    localStorage.removeItem("access_token")
    localStorage.removeItem("user")
    setUser(null)

    // Also clear from Chrome storage
    if (typeof chrome !== 'undefined' && chrome.storage) {
      chrome.storage.local.remove(['access_token', 'user'])
    }
  }

  return (
    <AuthContext.Provider
      value={{
        user,
        isAuthenticated: !!user,
        loading,
        login,
        logout
      }}
    >
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const context = useContext(AuthContext)
  if (context === undefined) {
    throw new Error("useAuth must be used within an AuthProvider")
  }
  return context
}
