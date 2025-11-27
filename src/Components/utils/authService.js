// src/utils/authService.js
import axios from 'axios';

// const API_URL = "http://localhost:3000/api";
const API_URL = import.meta.env.VITE_API_URL;


export const loginUser = async (email, password, role, subrole, tempPass) => {
  try {
    const response = await axios.post(`${API_URL}/login`, {
      email,
      password,
      role,
      subrole,
      tempPass, // ✅ also send tempPass
    });
    return response.data;
  } catch (error) {
    throw new Error(error.response?.data?.message || 'Login failed');
  }
};
