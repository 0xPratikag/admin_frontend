// src/utils/authService.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

// ✅ Now supports both:
// 1) loginUser(email, password)
// 2) loginUser(null, null, ssoToken)
export const loginUser = async (email, password, sso) => {
  try {
    const payload = sso
      ? { sso } // ✅ SSO auto-login
      : {
          email,
          password, // ✅ normal login
        };

    const response = await axios.post(`${API_URL}/branch-login`, payload);
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Login failed");
  }
};
