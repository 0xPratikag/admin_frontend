// src/hooks/useLogin.js
import { useState } from "react";
import { loginUser } from "../utils/authService";

const useLogin = () => {
  const [formData, setFormData] = useState({
    email: "",
    password: "",
    role: "admin", // keep dynamic now
    subrole: "", // keep dynamic now
  });

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const handleInput = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    setMessage(null);

    try {
      const { email, password, role, subrole, tempPass } = formData;

      const data = await loginUser(email, password, role, subrole, tempPass);

      if (data.subrole) {
        localStorage.clear();

        //      token,
        // user: {
        //   id: invite._id,
        //   name: invite.name,
        //   email: invite.email,
        //   role,
        //   subRole,
        // },
        // password: Random_CreatedPass, // ⚠️ share only via secure channel

        const storingData = {
            id: data.user.id,
            role: data.user.role,
            name: data.user.name,
            email: data.user.email,
            subrole: data.user.subrole,
        };

        localStorage.setItem(`token`, data.token);
        localStorage.setItem("user", JSON.stringify(storingData));
      } 
      
      else {
        localStorage.clear();

        const storingData = {
              id: data.user.id,
            role: data.user.role,
            name: data.user.name,
            email: data.user.email
        };

        localStorage.setItem("token", data.token);
        localStorage.setItem("user", JSON.stringify(storingData));
      }

      setMessage("Login successful");

      window.location.href = "/admin/dashboard"; // redirect after login
    } catch (err) {
      setMessage(err.message || "Something went wrong");
    } finally {
      setLoading(false);
    }
  };

  return {
    formData,
    setFormData, // ✅ expose setter (needed in AuthForm)
    loading,
    message,
    handleInput,
    handleSubmit,
  };
};

export default useLogin;
