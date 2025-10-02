import { useEffect, useState, type FormEvent } from "react"
import { useNavigate, Link } from "react-router-dom"
import { useAuth } from "../contexts/AuthContext"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Eye, EyeOff, Loader2 } from "lucide-react"
import logo from "@/assets/logo.png"
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
  const [showPassword, setShowPassword] = useState(false)

  // Form state
  const [formData, setFormData] = useState({
    firstName: "",
    lastName: "",
    email: "",
    password: "",
    confirmPassword: "",
    subjects: [] as string[],
    remember: true,
  })

  useEffect(() => {
    const loadCourses = async () => {
      try {
        const baseUrl =
          (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
          "http://localhost:8000"
        const response = await fetch(`${baseUrl}/auth/course-options`)
        if (!response.ok) throw new Error("Failed to load available courses")
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
        : [...prev.subjects, subject],
    }))
  }

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault()
    setError("")
    setSuccess("")
    setLoading(true)

    try {
      const baseUrl =
        (import.meta.env.VITE_API_URL as string | undefined)?.replace(/\/$/, "") ??
        "http://localhost:8000"

      if (isLogin) {
        const response = await fetch(`${baseUrl}/auth/login`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ email: formData.email, password: formData.password }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.detail || "Login failed")
        login(data.access_token, data.user)
        setSuccess("Login successful!")
        navigate("/dashboard", { replace: true })
      } else {
        if (formData.password !== formData.confirmPassword) throw new Error("Passwords do not match")
        if (formData.password.length < 8) throw new Error("Password must be at least 8 characters")

        const response = await fetch(`${baseUrl}/auth/signup`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email: formData.email,
            password: formData.password,
            display_name: `${formData.firstName} ${formData.lastName}`,
            course_codes: formData.subjects.map(code => code.toUpperCase()),
          }),
        })
        const data = await response.json()
        if (!response.ok) throw new Error(data.detail || "Signup failed")
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
    <Card className="w-full max-w-md border-white/10 bg-white/[0.05] shadow-2xl backdrop-blur-md">
      <CardHeader className="space-y-3">
        {/* Brand header */}
        <div className="flex items-center justify-center gap-2">
          <div className="flex h-9 w-9 items-center justify-center rounded-xl">
            <img src={logo} />
          </div>
          <span className="text-lg font-semibold tracking-tight text-yellow-4 00">UniMind</span>
        </div>

        {/* Segmented toggle */}
        <div className="mx-auto inline-flex rounded-full border border-white/10 bg-white/5 p-1">
          <button
            type="button"
            onClick={() => setIsLogin(true)}
            className={`px-4 py-1.5 text-sm rounded-full transition
              ${isLogin ? "bg-yellow-400 text-black shadow" : "text-gray-300 hover:text-white"}`}
          >
            Login
          </button>
          <button
            type="button"
            onClick={() => setIsLogin(false)}
            className={`px-4 py-1.5 text-sm rounded-full transition
              ${!isLogin ? "bg-yellow-400 text-black shadow" : "text-gray-300 hover:text-white"}`}
          >
            Sign Up
          </button>
        </div>

        <CardTitle className="text-center text-2xl font-bold text-white/90">
          {isLogin ? "Welcome" : "Create an account"}
        </CardTitle>
        <CardDescription className="text-center text-gray-400">
          {isLogin
            ? "Practice smarter. Stay on track."
            : "Join UniMind and turn distractions into study wins."}
        </CardDescription>
      </CardHeader>

      <CardContent>
        <form onSubmit={handleSubmit} className="space-y-4">
          {error && (
            <div className="rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}
          {success && (
            <div className="rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {success}
            </div>
          )}

          {!isLogin && (
            <div className="grid grid-cols-2 gap-3">
              <div className="grid gap-1.5">
                <Label htmlFor="firstName" className="text-gray-300">First name</Label>
                <Input
                  id="firstName"
                  placeholder="John"
                  value={formData.firstName}
                  onChange={(e) => setFormData({ ...formData, firstName: e.target.value })}
                  required
                  className="bg-black/20 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>
              <div className="grid gap-1.5">
                <Label htmlFor="lastName" className="text-gray-300">Last name</Label>
                <Input
                  id="lastName"
                  placeholder="Doe"
                  value={formData.lastName}
                  onChange={(e) => setFormData({ ...formData, lastName: e.target.value })}
                  required
                  className="bg-black/20 border-white/10 text-white placeholder:text-gray-500"
                />
              </div>
            </div>
          )}

          <div className="grid gap-1.5">
            <Label htmlFor="email" className="text-gray-300">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="you@email.com"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              required
              className="bg-black/20 border-white/10 text-white placeholder:text-gray-500"
            />
          </div>

          <div className="grid gap-1.5">
            <div className="flex items-center">
              <Label htmlFor="password" className="text-gray-300">Password</Label>
              {isLogin && (
                <a
                  href="#"
                  className="ml-auto text-xs text-gray-400 underline-offset-4 hover:text-gray-200 hover:underline"
                >
                  Forgot password?
                </a>
              )}
            </div>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                required
                className="bg-black/20 border-white/10 pr-10 text-white placeholder:text-gray-500"
              />
              <button
                type="button"
                onClick={() => setShowPassword(v => !v)}
                className="absolute inset-y-0 right-0 grid w-10 place-items-center text-gray-400 hover:text-gray-200"
                aria-label={showPassword ? "Hide password" : "Show password"}
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
          </div>

          {!isLogin && (
            <div className="grid gap-1.5">
              <Label htmlFor="confirm-password" className="text-gray-300">Confirm password</Label>
              <Input
                id="confirm-password"
                type="password"
                value={formData.confirmPassword}
                onChange={(e) => setFormData({ ...formData, confirmPassword: e.target.value })}
                required
                className="bg-black/20 border-white/10 text-white placeholder:text-gray-500"
              />
            </div>
          )}

          {!isLogin && (
            <div className="grid gap-2">
              <Label className="text-gray-300">Subjects</Label>
              {availableCourses.length === 0 ? (
                <p className="text-xs text-gray-500">No courses available yet.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {availableCourses.map(course => {
                    const selected = formData.subjects.includes(course.code)
                    return (
                      <button
                        key={course.code}
                        type="button"
                        onClick={() => handleSubjectToggle(course.code)}
                        title={course.description ?? course.name}
                        className={`rounded-full border px-3 py-1 text-xs transition
                          ${selected
                            ? "border-yellow-400/40 bg-yellow-400/20 text-yellow-200"
                            : "border-white/10 bg-white/5 text-gray-300 hover:text-white"}`}
                      >
                        <span className="font-mono">{course.code}</span>
                        <span className="px-1 text-gray-500">·</span>
                        {course.name}
                      </button>
                    )
                  })}
                </div>
              )}
            </div>
          )}

        

          <Button
            type="submit"
            disabled={loading}
            className="group w-full  bg-yellow-400 text-black hover:from-yellow-400 hover:to-orange-600"
          >
            {loading ? (
              <span className="inline-flex items-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" />
                Processing…
              </span>
            ) : isLogin ? (
              "Login"
            ) : (
              "Sign Up"
            )}
          </Button>
        </form>
      </CardContent>

      <CardFooter className="flex flex-col gap-3">


        <div className="text-center text-xs text-gray-500">
          By using UniMind you agree to our{" "}
          <Link to="/privacy" className="text-gray-300 underline underline-offset-4 hover:text-white">
            Privacy Policy
          </Link>.
        </div>
      </CardFooter>
    </Card>
  )
}
