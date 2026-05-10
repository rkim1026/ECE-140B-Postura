import { useState } from "react";
import { useNavigate } from "react-router";
import { Activity, Eye, EyeOff, ArrowRight, Mail, Lock, User, CheckCircle } from "lucide-react";
import { useApp } from "../context/AppContext";

export default function SignInPage() {
  const navigate = useNavigate();
  const { signIn } = useApp();
  const [mode, setMode] = useState<"signin" | "signup" | "forgot">("signin");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [forgotSent, setForgotSent] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 900));
    signIn(email || "alex.johnson@university.edu");
    setLoading(false);
    navigate("/dashboard");
  };

  const handleForgot = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    await new Promise((r) => setTimeout(r, 800));
    setLoading(false);
    setForgotSent(true);
  };

  return (
    <div
      className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-cyan-50 flex items-center justify-center p-4"
      style={{ fontFamily: "Inter, sans-serif" }}
    >
      {/* Background decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-32 -right-32 w-96 h-96 bg-blue-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute -bottom-32 -left-32 w-96 h-96 bg-cyan-100 rounded-full opacity-40 blur-3xl" />
        <div className="absolute top-1/2 left-1/4 w-64 h-64 bg-indigo-50 rounded-full opacity-60 blur-2xl" />
      </div>

      <div className="relative w-full max-w-md">
        {/* Logo + Tagline */}
        <div className="text-center mb-8">
          <div className="inline-flex items-center justify-center w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-500 to-cyan-400 shadow-lg shadow-blue-200 mb-4">
            <Activity size={28} className="text-white" strokeWidth={2.5} />
          </div>
          <h1 className="text-3xl font-bold text-slate-800 tracking-tight">Postura</h1>
          <p className="mt-1.5 text-slate-500 text-sm">
            Track your posture. Improve your focus.
          </p>
        </div>

        {/* Card */}
        <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/60 border border-slate-100 overflow-hidden">
          {/* Tab switcher */}
          {mode !== "forgot" && (
            <div className="flex border-b border-slate-100">
              <button
                onClick={() => setMode("signin")}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  mode === "signin"
                    ? "text-blue-600 border-b-2 border-blue-500"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Sign In
              </button>
              <button
                onClick={() => setMode("signup")}
                className={`flex-1 py-4 text-sm font-semibold transition-colors ${
                  mode === "signup"
                    ? "text-blue-600 border-b-2 border-blue-500"
                    : "text-slate-400 hover:text-slate-600"
                }`}
              >
                Create Account
              </button>
            </div>
          )}

          <div className="p-8">
            {/* Sign In Form */}
            {mode === "signin" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@university.edu"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="••••••••"
                      className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <div className="flex justify-end">
                  <button
                    type="button"
                    onClick={() => setMode("forgot")}
                    className="text-xs text-blue-500 hover:text-blue-700 font-medium"
                  >
                    Forgot password?
                  </button>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3.5 rounded-xl font-semibold text-sm shadow-md shadow-blue-200 transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Sign In <ArrowRight size={15} />
                    </>
                  )}
                </button>
              </form>
            )}

            {/* Create Account Form */}
            {mode === "signup" && (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Full Name
                  </label>
                  <div className="relative">
                    <User size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="Alex Johnson"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Email Address
                  </label>
                  <div className="relative">
                    <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="email"
                      value={email}
                      onChange={(e) => setEmail(e.target.value)}
                      placeholder="you@university.edu"
                      className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all text-sm"
                    />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-semibold text-slate-700 mb-1.5">
                    Password
                  </label>
                  <div className="relative">
                    <Lock size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type={showPassword ? "text" : "password"}
                      value={password}
                      onChange={(e) => setPassword(e.target.value)}
                      placeholder="Min. 8 characters"
                      className="w-full pl-10 pr-11 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all text-sm"
                    />
                    <button
                      type="button"
                      onClick={() => setShowPassword(!showPassword)}
                      className="absolute right-3.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
                    >
                      {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
                <button
                  type="submit"
                  disabled={loading}
                  className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3.5 rounded-xl font-semibold text-sm shadow-md shadow-blue-200 transition-all disabled:opacity-60"
                >
                  {loading ? (
                    <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                  ) : (
                    <>
                      Create Account <ArrowRight size={15} />
                    </>
                  )}
                </button>
                <p className="text-center text-xs text-slate-400">
                  By creating an account you agree to our{" "}
                  <button type="button" className="text-blue-500 hover:underline">
                    Terms
                  </button>{" "}
                  and{" "}
                  <button type="button" className="text-blue-500 hover:underline">
                    Privacy Policy
                  </button>
                </p>
              </form>
            )}

            {/* Forgot Password */}
            {mode === "forgot" && (
              <div>
                <button
                  onClick={() => setMode("signin")}
                  className="text-xs text-slate-400 hover:text-slate-600 mb-4 flex items-center gap-1 font-medium"
                >
                  ← Back to Sign In
                </button>
                {forgotSent ? (
                  <div className="text-center py-6">
                    <div className="w-14 h-14 rounded-full bg-emerald-100 flex items-center justify-center mx-auto mb-4">
                      <CheckCircle size={24} className="text-emerald-500" />
                    </div>
                    <h3 className="font-semibold text-slate-800 mb-1">Email Sent!</h3>
                    <p className="text-sm text-slate-500">
                      Check your inbox for password reset instructions.
                    </p>
                    <button
                      onClick={() => {
                        setMode("signin");
                        setForgotSent(false);
                      }}
                      className="mt-6 text-sm text-blue-500 font-medium hover:underline"
                    >
                      Back to Sign In
                    </button>
                  </div>
                ) : (
                  <form onSubmit={handleForgot} className="space-y-4">
                    <div>
                      <h3 className="font-semibold text-slate-800 mb-1">Reset Password</h3>
                      <p className="text-sm text-slate-500 mb-4">
                        Enter your email and we'll send you a reset link.
                      </p>
                      <div className="relative">
                        <Mail size={16} className="absolute left-3.5 top-1/2 -translate-y-1/2 text-slate-400" />
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          placeholder="you@university.edu"
                          className="w-full pl-10 pr-4 py-3 rounded-xl border border-slate-200 bg-slate-50 text-slate-800 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-blue-400/50 focus:border-blue-400 transition-all text-sm"
                        />
                      </div>
                    </div>
                    <button
                      type="submit"
                      disabled={loading}
                      className="w-full flex items-center justify-center gap-2 bg-gradient-to-r from-blue-500 to-blue-600 hover:from-blue-600 hover:to-blue-700 text-white py-3.5 rounded-xl font-semibold text-sm shadow-md shadow-blue-200 transition-all disabled:opacity-60"
                    >
                      {loading ? (
                        <div className="w-4 h-4 border-2 border-white/40 border-t-white rounded-full animate-spin" />
                      ) : (
                        "Send Reset Link"
                      )}
                    </button>
                  </form>
                )}
              </div>
            )}
          </div>
        </div>

        {/* Features */}
        <div className="mt-8 grid grid-cols-3 gap-3">
          {[
            { label: "Real-time Tracking", icon: "📡" },
            { label: "Smart Alerts", icon: "🔔" },
            { label: "Progress Stats", icon: "📊" },
          ].map((f) => (
            <div
              key={f.label}
              className="bg-white/70 backdrop-blur-sm rounded-2xl p-3 text-center border border-slate-100"
            >
              <div className="text-xl mb-1">{f.icon}</div>
              <p className="text-xs text-slate-500 font-medium">{f.label}</p>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
