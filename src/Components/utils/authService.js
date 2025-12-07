// src/utils/authService.js
import axios from "axios";

const API_URL = import.meta.env.VITE_API_URL;

export const loginUser = async (email, password) => {
  try {
    const response = await axios.post(`${API_URL}/branch-login`, {
      email,
      password, // ✅ sirf ye 2 fields jaa rahe hain
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || "Login failed");
  }
};
