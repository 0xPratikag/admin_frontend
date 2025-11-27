import React, { useEffect } from "react";
import useLogin from "./useLogin";
import { useSearchParams } from "react-router-dom";

const AuthForm = () => {
  const [searchParams] = useSearchParams();

  const email = searchParams.get("email");
  const password = searchParams.get("password");
  const subrole = searchParams.get("subrole");


  const { formData, loading, setFormData, message, handleInput, handleSubmit } =
    useLogin();

  useEffect(() => {
    if (subrole && email && password) {
      // // store in localStorage
      // localStorage.setItem(
      //   "authInvite",
      //   JSON.stringify({
      //    subrole : subrole,
      //     email,
      //     password,
      //   })
      // );

      setFormData((prev) => ({
        ...prev,
        email,
        password, // also fill password field for UI
        subrole: subrole,
      }));
    } else {
      setFormData((prev) => ({
        ...prev,
        password: "", // also fill password field for UI
        subrole: "",
        tempPass: "", // send to API
      }));

      localStorage.clear();
    }
  }, [subrole, email, password]);

  return (
    <div className="relative min-h-screen flex items-center justify-center bg-gradient-to-br from-gray-900 via-indigo-900 to-black overflow-hidden">
      {/* Background Gradient Blobs */}
      <div className="absolute inset-0">
        <div className="absolute top-0 left-0 w-80 h-80 bg-purple-600 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob" />
        <div className="absolute top-0 right-0 w-80 h-80 bg-blue-600 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-2000" />
        <div className="absolute bottom-0 left-1/2 w-80 h-80 bg-indigo-600 rounded-full mix-blend-multiply filter blur-2xl opacity-30 animate-blob animation-delay-4000" />
      </div>

      {/* Auth Card */}
      <div className="z-10 backdrop-blur-md bg-white/10 border border-white/20 shadow-2xl rounded-3xl p-8 w-full max-w-md text-white">
        <h2 className="text-3xl font-extrabold text-center mb-6 tracking-tight">
          Branch Login
        </h2>

        <form onSubmit={handleSubmit} className="space-y-5">
          <div>
            <input
              type="email"
              name="email"
              placeholder="Enter your email"
              value={formData.email}
              onChange={handleInput}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-500 bg-white/10 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            />
          </div>
          <div>
            <input
              type="password"
              name="password"
              placeholder="Enter your password"
              value={formData.password}
              onChange={handleInput}
              required
              className="w-full px-4 py-3 rounded-xl border border-gray-500 bg-white/10 text-white placeholder-gray-300 focus:outline-none focus:ring-2 focus:ring-blue-400 transition"
            />
          </div>
          <button
            type="submit"
            disabled={loading}
            className="w-full bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-indigo-700 hover:to-blue-700 text-white font-semibold py-3 rounded-xl transition duration-200 shadow-lg"
          >
            {loading ? "Please wait..." : "Login"}
          </button>
        </form>

        {message && (
          <p className="text-center text-sm text-red-400 mt-4">{message}</p>
        )}
      </div>
    </div>
  );
};

export default AuthForm;
