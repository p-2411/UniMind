import { useEffect, useState, type FormEvent } from "react"
import { useNavigate } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { Button } from "@/components/ui/button"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"

import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type CourseOption = {
  code: string
  name: string
  description?: string | null
}

export default function AuthCard() {
  const navigate = useNavigate()
  const { login } = useAuth()
  const [isLogin, setIsLogin] = useState(true)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState("")
  const [success, setSuccess] = useState("")
  const [availableCourses, setAvailableCourses] = useState<CourseOption[]>([])

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    subjects: [] as string[]
  })

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const response = await fetch("http://localhost:8000/auth/course-options")
        if (!response.ok) {
          throw new Error("Failed to load available courses")
        }
        const data = await response.json()
        const courses: CourseOption[] = Array.isArray(data.courses) ? data.courses : []
        setAvailableCourses(courses)
      } catch (err) {
        console.error("Error fetching course catalog", err)
      }
    }

    loadCourses()
  }, [])

  const handleSubjectToggle = (subject: string) => {
    setFormData(prev => ({
      ...prev,
      subjects: prev.subjects.includes(subject)
        ? prev.subjects.filter(s => s !== subject)
        : [...prev.subjects, subject]
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      if (isLogin) {
        // Login
        const response = await fetch("http://localhost:8000/auth/login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.detail || "Login failed")
        }

        // Store token and user data via AuthContext
        login(data.access_token, data.user)

        setSuccess("Login successful!")
        navigate("/dashboard", { replace: true })
      } else {
        // Signup
        if (formData.password !== formData.confirmPassword) {
          throw new Error("Passwords do not match")
        }

        if (formData.password.length < 8) {
          throw new Error("Password must be at least 8 characters")
        }

        const response = await fetch("http://localhost:8000/auth/signup", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            display_name: `${formData.firstName} ${formData.lastName}`,
            course_codes: formData.subjects.map((code) => code.toUpperCase())
          })
        })

        const data = await response.json()

        if (!response.ok) {
          throw new Error(data.detail || "Signup failed")
        }

        // Store token and user data via AuthContext
        login(data.access_token, data.user)

        setSuccess("Account created successfully!")
        navigate("/dashboard", { replace: true })
      }
    } catch (err: any) {
      setError(err.message || "An error occurred")
    } finally {
      setLoading(false)
    }
  }

  return (
    <Card className="w-full max-w-md shadow-xl">
      <CardHeader className="space-y-1">
        <CardTitle className="text-2xl font-bold text-center">
          {isLogin ? "Welcome back" : "Create an account"}
        </CardTitle>
        <CardDescription className="text-center">
          {isLogin
            ? "Enter your credentials to access your account"
            : "Sign up to get started with UniMind"}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <form onSubmit={handleSubmit}>
          <div className="flex flex-col gap-4">
            {error && (
              <div className="p-3 text-sm text-red-600 bg-red-50 border border-red-200 rounded">
                {error}
              </div>
            )}
            {success && (
              <div className="p-3 text-sm text-green-600 bg-green-50 border border-green-200 rounded">
                {success}
              </div>
            )}

            {!isLogin && (
              <>
                <div className="grid gap-2">
                  <Label htmlFor="firstName">First Name</Label>
                  <Input
                    id="firstName"
                    type="text"
                    placeholder="John"
                    value={formData.firstName}
                    onChange={(e) => setFormData({...formData, firstName: e.target.value})}
                    required
                  />
                </div>
                <div className="grid gap-2">
                  <Label htmlFor="lastName">Last Name</Label>
                  <Input
                    id="lastName"
                    type="text"
                    placeholder="Doe"
                    value={formData.lastName}
                    onChange={(e) => setFormData({...formData, lastName: e.target.value})}
                    required
                  />
                </div>
              </>
            )}
            <div className="grid gap-2 ">
              <Label htmlFor="email">Email</Label>
              <Input
                className="hover:border-2"
                id="email"
                type="email"
                placeholder="m@example.com"
                value={formData.email}
                onChange={(e) => setFormData({...formData, email: e.target.value})}
                required
              />
            </div>
            
            {!isLogin && (
              <div className="grid gap-2">
                <Label>Courses</Label>
                {availableCourses.length === 0 ? (
                  <p className="text-xs text-muted-foreground">No courses available yet.</p>
                ) : (
                  <div className="flex flex-wrap gap-2">
                    {availableCourses.map((course) => (
                      <button
                        key={course.code}
                        type="button"
                        onClick={() => handleSubjectToggle(course.code)}
                        className={`px-3 py-1 text-sm rounded-full border transition-colors ${
                          formData.subjects.includes(course.code)
                            ? "bg-orange-500 text-white border-orange-500"
                            : "bg-white text-gray-700 border-gray-300 hover:border-orange-500"
                        }`}
                        title={course.description ?? course.name}
                      >
                        {course.code} · {course.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            )}
            <div className="grid gap-2">
              <div className="flex items-center">
                <Label htmlFor="password">Password</Label>
                {isLogin && (
                  <a
                    href="#"
                    className="ml-auto inline-block text-sm text-muted-foreground underline-offset-4 hover:underline"
                  >
                    Forgot password?
                  </a>
                )}
              </div>
              <Input
                className="hover:border-2"
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({...formData, password: e.target.value})}
                required
              />
            </div>
            {!isLogin && (
              <div className="grid gap-2">
                <Label htmlFor="confirm-password">Confirm Password</Label>
                <Input
                  id="confirm-password"
                  type="password"
                  value={formData.confirmPassword}
                  onChange={(e) => setFormData({...formData, confirmPassword: e.target.value})}
                  required
                />
              </div>
            )}
            <Button
              type="submit"
              disabled={loading}
              className="w-full bg-gradient-to-br from-yellow-300 to-orange-500 text-black hover:from-yellow-400 hover:to-orange-600"
            >
              {loading ? "Loading..." : (isLogin ? "Login" : "Sign Up")}
            </Button>
          </div>
        </form>
      </CardContent>
      <CardFooter className="flex flex-col gap-4">
        {/* <div className="relative w-full">
          <div className="absolute inset-0 flex items-center">
            <span className="w-full border-t" />
          </div>
          <div className="relative flex justify-center text-xs uppercase">
            <span className="bg-[#1b1718] px-2 text-muted-foreground">
              Or continue with
            </span>
          </div>
        </div> */}

        <div className="text-center text-sm text-muted-foreground">
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button
            type="button"
            onClick={() => setIsLogin(!isLogin)}
            className="underline underline-offset-4 hover:text-primary font-medium"
          >
            {isLogin ? "Sign up" : "Login"}
          </button>
        </div>
      </CardFooter>
    </Card>
  )
}
