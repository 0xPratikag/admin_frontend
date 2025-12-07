// Components/Auth/useLogin.js  (ya jaha tum rakho, import path same rakho)
import { useState } from "react";
import { loginUser } from "../utils/authService";

const useLogin = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
    setMessage(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { email, password } = formData;

      // ✅ sirf email & password jaa rahe hain
      const data = await loginUser(email, password);

      // expected: { token, user: { id, name, email, role, ... } }
      localStorage.clear();

      if (data?.token) {
        localStorage.setItem("token", data.token);
      }
      if (data?.user) {
        localStorage.setItem("user", JSON.stringify(data.user));
      }

      setMessage("Login successful");
      // redirect – jo tumhari routing me sahi ho
      window.location.href = "/dashboard";
    } catch (err) {
      setMessage(err.message || "Something went wrong");
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
  };
};

export default useLogin;
