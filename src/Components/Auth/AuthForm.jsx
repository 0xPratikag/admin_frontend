// Components/Auth/AuthForm.jsx
import React, { useEffect, useState } from "react";
import useLogin from "./useLogin";
import { motion } from "framer-motion";
import { TypeAnimation } from "react-type-animation";
import { Mail, Lock, Eye, EyeOff } from "lucide-react";

const AuthForm = () => {
  const { formData, loading, setFormData, message, handleInput, handleSubmit } =
    useLogin();

  const [showPassword, setShowPassword] = useState(false);

  // clear form on mount (no URL params, no subrole)
  useEffect(() => {
    setFormData({ email: "", password: "" });
  }, [setFormData]);

  return (
    <div className="relative flex min-h-screen items-center justify-center overflow-hidden bg-slate-950">
      {/* Neon blobs background */}
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -top-24 -left-24 h-72 w-72 rounded-full bg-purple-600/40 blur-3xl animate-pulse" />
        <div className="absolute -bottom-32 -right-10 h-80 w-80 rounded-full bg-indigo-600/40 blur-3xl animate-pulse" />
        <div className="absolute left-1/2 top-1/2 h-64 w-64 -translate-x-1/2 -translate-y-1/2 rounded-full bg-fuchsia-500/30 blur-3xl" />
      </div>

      {/* Card */}
      <motion.div
        initial={{ opacity: 0, y: 30, scale: 0.97 }}
        animate={{ opacity: 1, y: 0, scale: 1 }}
        transition={{ duration: 0.35, ease: "easeOut" }}
        className="relative z-10 w-full max-w-md rounded-3xl border border-violet-500/40 bg-slate-900/70 p-[1px] shadow-[0_0_50px_rgba(129,140,248,0.6)]"
      >
        <div className="rounded-3xl bg-slate-950/90 px-8 py-7">
          {/* Heading */}
          <div className="mb-6 text-center">
            <p className="text-[11px] font-semibold uppercase tracking-[0.25em] text-indigo-300">
              Branch Portal
            </p>
            <h2 className="mt-2 text-3xl font-extrabold tracking-tight text-white">
              Branch Login
            </h2>
            <div className="mt-2 text-xs text-indigo-200/80">
              <TypeAnimation
                sequence={[
                  "Login to manage your clinic branch.",
                  2000,
                  "Monitor staff, appointments & reports.",
                  2000,
                  "Secure, branch-specific access.",
                  2000,
                ]}
                wrapper="span"
                speed={50}
                repeat={Infinity}
              />
            </div>
          </div>

          {/* Form */}
          <form onSubmit={handleSubmit} className="space-y-4">
            {/* Email */}
            <div>
              <label className="mb-1 block text-xs font-medium text-indigo-100">
                Email
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-indigo-300/80">
                  <Mail className="h-4 w-4" />
                </span>
                <input
                  type="email"
                  name="email"
                  placeholder="branch@example.com"
                  value={formData.email}
                  onChange={handleInput}
                  required
                  className="w-full rounded-xl border border-indigo-500/40 bg-slate-900/70 px-10 py-3 text-sm text-indigo-50 placeholder:text-indigo-300/40 shadow-inner shadow-slate-900/80 outline-none ring-0 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
                />
              </div>
            </div>

            {/* Password */}
            <div>
              <label className="mb-1 block text-xs font-medium text-indigo-100">
                Password
              </label>
              <div className="relative">
                <span className="pointer-events-none absolute inset-y-0 left-0 flex w-10 items-center justify-center text-indigo-300/80">
                  <Lock className="h-4 w-4" />
                </span>
                <input
                  type={showPassword ? "text" : "password"}
                  name="password"
                  placeholder="••••••••"
                  value={formData.password}
                  onChange={handleInput}
                  required
                  className="w-full rounded-xl border border-indigo-500/40 bg-slate-900/70 px-10 py-3 pr-11 text-sm text-indigo-50 placeholder:text-indigo-300/40 shadow-inner shadow-slate-900/80 outline-none ring-0 transition focus:border-indigo-400 focus:ring-2 focus:ring-indigo-500/50"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword((v) => !v)}
                  className="absolute inset-y-0 right-0 flex w-10 items-center justify-center text-indigo-300/80 hover:text-indigo-100"
                  tabIndex={-1}
                >
                  {showPassword ? (
                    <EyeOff className="h-4 w-4" />
                  ) : (
                    <Eye className="h-4 w-4" />
                  )}
                </button>
              </div>
            </div>

            {/* Submit */}
            <motion.button
              type="submit"
              disabled={loading}
              whileTap={{ scale: 0.97 }}
              className="mt-2 inline-flex w-full items-center justify-center rounded-xl bg-gradient-to-r from-fuchsia-500 via-indigo-500 to-sky-500 px-4 py-3 text-sm font-semibold text-white shadow-[0_0_25px_rgba(129,140,248,0.7)] transition hover:from-fuchsia-400 hover:via-indigo-400 hover:to-sky-400 disabled:opacity-60"
            >
              {loading ? "Please wait…" : "Login to Branch"}
            </motion.button>
          </form>

          {/* Message */}
          {message && (
            <p className="mt-4 text-center text-xs text-rose-300">{message}</p>
          )}

          <p className="mt-5 text-center text-[10px] text-indigo-300/70">
            Secure access · All activity is logged for compliance.
          </p>
        </div>
      </motion.div>
    </div>
  );
};

export default AuthForm;
