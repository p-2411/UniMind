import AuthCard from "../components/authCard"

export default function LoginPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-gray-950 to-[#052334]">
      {/* soft yellow/orange orbs that match your accent, kept very faint */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 right-[-10%] h-[48rem] w-[48rem] rounded-full bg-yellow-300/5 blur-3xl" />
        <div className="absolute -left-24 top-[15%] h-[36rem] w-[36rem] rounded-full bg-orange-500/5 blur-3xl" />
      </div>

      {/* faint grid for texture, masked so center stays clean */}
      <div className="pointer-events-none absolute inset-0 [mask-image:radial-gradient(ellipse_at_center,black,transparent_70%)]">
        <div className="absolute inset-0 bg-[linear-gradient(to_right,rgba(255,255,255,0.04)_1px,transparent_1px),linear-gradient(to_bottom,rgba(255,255,255,0.04)_1px,transparent_1px)] bg-[size:36px_36px]" />
      </div>

      {/* center content */}
      <div className="relative z-10 flex min-h-screen items-center justify-center p-6">
        <AuthCard />
      </div>
    </div>
  )
}
