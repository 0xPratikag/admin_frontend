// Components/utils/authService.js (example)
import axios from "axios";
const API_BASE = import.meta.env.VITE_API_BASE_URL;

export const loginUser = async (email, password, sso) => {
  try {
    const payload = sso ? { sso } : { email, password };
    const res = await axios.post(`${API_BASE}/branch-login`, payload);
    return res.data;
  } catch (err) {
    const msg = err?.response?.data?.message || "Login failed";
    throw new Error(msg);
  }
};
