// Components/Auth/useLogin.js
import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { loginUser } from "../utils/authService";

const useLogin = () => {
  const navigate = useNavigate();

  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    setMessage(null);
  };

  const saveSessionAndRedirect = (data) => {
    // expected: { token, user: {...} }
    localStorage.clear();

    if (data?.token) localStorage.setItem("token", data.token);
    if (data?.user) localStorage.setItem("user", JSON.stringify(data.user));

    // ✅ App.jsx me protected route "/*" hai, so "/" is safest
    navigate("/", { replace: true });
  };

  // ✅ Manual login (email/password)
  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const email = String(formData.email || "").trim();
      const password = String(formData.password || "").trim();

      if (!email || !password) {
        setMessage("Email and password are required");
        return;
      }

      // ✅ existing service call
      const data = await loginUser(email, password);

      saveSessionAndRedirect(data);
    } catch (err) {
      setMessage(err?.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  // ✅ NEW: SSO login (auto) — /authentication?sso=...
  // authService me support add kiya hai: loginUser(email, password, sso)
  const handleSsoLogin = async (ssoToken) => {
    const sso = String(ssoToken || "").trim();
    if (!sso) return;

    setLoading(true);
    setMessage(null);

    try {
      const data = await loginUser(null, null, sso);
      saveSessionAndRedirect(data);
    } catch (err) {
      // SSO fail -> manual login screen stays
      setMessage(err?.message || "SSO login failed");
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    setFormData,
    loading,
    message,
    handleInput,
    handleSubmit,
    handleSsoLogin, // ✅ export
  };
};

export default useLogin;
