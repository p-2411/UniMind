import { useState, type FormEvent } from "react";
import logo from "../assets/logo.png";
import { API_BASE_URL, FRONTEND_URL } from "../config.js";

type LoginPageProps = {
  onLoginSuccess: () => void;
};

// Typed helper to use chrome.storage with callbacks (works in all MV3 setups)
const setChromeStorage = (items: Record<string, unknown>) =>
  new Promise<void>((resolve, reject) => {
    try {
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (chrome as any)?.storage?.local?.set(items, () => resolve());
    } catch (e) {
      reject(e);
    }
  });

export default function LoginPage({ onLoginSuccess }: LoginPageProps) {
  const [isLogin, setIsLogin] = useState<boolean>(true);
  const [email, setEmail] = useState<string>("");
  const [password, setPassword] = useState<string>("");
  const [showPw, setShowPw] = useState<boolean>(false);
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string>("");
  const [success, setSuccess] = useState<string>("");

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault();

    if (!isLogin) {
      window.open(FRONTEND_URL, "_blank", "noopener,noreferrer");
      return;
    }

    setError("");
    setSuccess("");
    setLoading(true);

    try {
      const res = await fetch(`${API_BASE_URL}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password }),
      });

      // eslint-disable-next-line @typescript-eslint/no-unsafe-assignment
      const data: any = await res.json();
      if (!res.ok) throw new Error((data?.detail as string) || "Login failed");

      await setChromeStorage({
        access_token: data.access_token,
        user: data.user,
      });

      setSuccess("Login successful!");
      onLoginSuccess();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "Login failed";
      setError(msg);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div
      className="
        relative w-[380px] min-h-[560px] overflow-hidden
        bg-gradient-to-br from-gray-950 to-[#052334]
      "
    >

      <div className="relative z-10 flex min-h-[560px] w-[380px] items-center justify-center p-4">
        {/* glassy card */}
        <div className="w-[360px] max-w-full rounded-2xl border border-white/10 bg-white/10 p-4 shadow-2xl backdrop-blur-md">
          {/* brand */}
          <div className="flex items-center justify-center gap-2">
            <div className="grid h-9 w-9 place-items-center rounded-xl">
              <img src={logo} alt="UniMind" className="h-7 w-7" />
            </div>
            <span className="bg-gradient-to-r from-yellow-300 via-orange-400 to-orange-500 bg-clip-text text-lg font-semibold tracking-tight text-transparent">
              UniMind
            </span>
          </div>

          {/* segmented toggle */}
          <div className="mx-auto mt-3 inline-flex rounded-full border border-white/10 bg-white/5 p-1">
            <button
              type="button"
              onClick={() => setIsLogin(true)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                isLogin ? "bg-yellow-400 text-black shadow" : "text-gray-300 hover:text-white"
              }`}
            >
              Login
            </button>
            <button
              type="button"
              onClick={() => setIsLogin(false)}
              className={`rounded-full px-4 py-1.5 text-sm transition ${
                !isLogin ? "bg-yellow-400 text-black shadow" : "text-gray-300 hover:text-white"
              }`}
            >
              Sign Up
            </button>
          </div>

          {/* title + subtitle */}
          <h1 className="mt-3 text-center text-2xl font-bold text-white/90">
            {isLogin ? "Welcome back" : "Create an account"}
          </h1>
          <p className="mt-1 text-center text-sm text-gray-400">
            {isLogin ? "Practice smarter. Stay on track." : "Finish signup on the web in one minute."}
          </p>

          {/* alerts */}
          {error && (
            <div className="mt-3 rounded-md border border-red-500/20 bg-red-500/10 p-3 text-sm text-red-300">
              {error}
            </div>
          )}
          {success && (
            <div className="mt-3 rounded-md border border-emerald-500/20 bg-emerald-500/10 p-3 text-sm text-emerald-300">
              {success}
            </div>
          )}

          {/* form */}
          <form onSubmit={handleSubmit} className="mt-3 space-y-3">
            {isLogin ? (
              <>
                <div className="grid gap-1.5">
                  <label htmlFor="extension-email" className="text-sm text-gray-300">
                    Email
                  </label>
                  <input
                    id="extension-email"
                    type="email"
                    className="h-9 rounded-md border border-white/10 bg-black/20 px-3 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="you@university.edu"
                    required
                  />
                </div>

                <div className="grid gap-1.5">
                  <label htmlFor="extension-password" className="text-sm text-gray-300">
                    Password
                  </label>
                  <div className="relative">
                    <input
                      id="extension-password"
                      type={showPw ? "text" : "password"}
                      className="h-9 w-full rounded-md border border-white/10 bg-black/20 px-3 pr-10 text-sm text-white placeholder:text-gray-500 focus:outline-none focus:ring-2 focus:ring-yellow-400/60"
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      required
                    />
                    <button
                      type="button"
                      onClick={() => setShowPw((v) => !v)}
                      aria-label={showPw ? "Hide password" : "Show password"}
                      title={showPw ? "Hide password" : "Show password"}
                      className="absolute inset-y-0 right-0 grid w-10 place-items-center text-gray-400 hover:text-gray-200"
                    >
                      {showPw ? (
                        // eye-off
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                          <path d="M2 2l20 20-1.41 1.41L17.73 20.55A10.77 10.77 0 0 1 12 22C6 22 1.73 17.64 1 12c.19-1.48.69-2.86 1.45-4.09L.59 3.41 2 2zm6.54 6.54l1.53 1.53A3.5 3.5 0 0 0 12 15.5a3.5 3.5 0 0 0 3.43-2.76l1.78 1.78A5.5 5.5 0 0 1 12 17.5a5.5 5.5 0 0 1-5.46-4.96c.25-.42.56-.82.9-1.2l1.1-1.3z" />
                          <path d="M12 6.5a5.5 5.5 0 0 1 5.46 4.96C16.73 17.64 12 22 12 22s-4.73-4.36-5.46-10.54A5.5 5.5 0 0 1 12 6.5z" opacity=".2" />
                        </svg>
                      ) : (
                        // eye
                        <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor" aria-hidden="true">
                          <path d="M12 5C7 5 2.73 9.36 2 15c.73 5.64 5 10 10 10s9.27-4.36 10-10c-.73-5.64-5-10-10-10zm0 16a6 6 0 1 1 0-12 6 6 0 0 1 0 12z" />
                        </svg>
                      )}
                    </button>
                  </div>
                </div>

                <button
                  type="submit"
                  disabled={loading}
                  className="
                    inline-flex h-10 w-full items-center justify-center rounded-md
                    bg-gradient-to-br from-yellow-300 to-orange-500 text-sm font-semibold text-black
                    hover:from-yellow-400 hover:to-orange-600 disabled:opacity-70
                  "
                >
                  {loading ? "Logging in…" : "Log in"}
                </button>
              </>
            ) : (
              <div className="rounded-md border border-white/10 bg-white/5 p-3 text-sm text-gray-300">
                To create an account, continue on the web so we can link your browser.
                <div className="mt-2">
                  <a
                    href={FRONTEND_URL}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-yellow-300 underline underline-offset-4 hover:text-yellow-200"
                  >
                    Open UniMind signup
                  </a>
                </div>
                <button
                  type="submit"
                  className="
                    mt-4 inline-flex h-10 w-full items-center justify-center rounded-md
                    bg-gradient-to-br from-yellow-300 to-orange-500 text-sm font-semibold text-black
                    hover:from-yellow-400 hover:to-orange-600
                  "
                >
                  Continue
                </button>
              </div>
            )}
          </form>

          <p className="mt-3 text-center text-xs text-gray-400">
            Don’t have an account?{" "}
            <a
              href={FRONTEND_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="text-yellow-300 underline underline-offset-4 hover:text-yellow-200"
            >
              Sign up on the web
            </a>
          </p>
        </div>
      </div>
    </div>
  );
}
