// src/api/assignmentSummaryApi.js
import axios from "axios";

// 🔹 Same style as CreateCase: central axios instance
const api = axios.create({
  baseURL: import.meta.env.VITE_API_BASE_URL, // e.g. "http://localhost:5000/api/admin"
});

// 🔹 Attach token automatically on every request
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) {
    config.headers = config.headers || {};
    config.headers.Authorization = `Bearer ${token}`;
  }
  return config;
});

/**
 * Fetches therapy assignment summary for a given case + therapy.
 *
 * @param {string} caseId   Mongo ObjectId of Case
 * @param {string} therapyId Mongo ObjectId of Therapy
 * @returns {Promise<Object>} response.data (summary DTO)
 */
export async function getTherapyAssignmentSummary(caseId, therapyId) {
  if (!caseId || !therapyId) {
    return Promise.reject(new Error("caseId and therapyId are required"));
  }

  try {
    // ⚠️ IMPORTANT:
    // Yahan sirf `/cases/...` likh rahe hain, kyunki baseURL already `/api/admin` hoga.
    // So final URL banega: `${VITE_API_BASE_URL}/cases/:caseId/therapies/:therapyId/assignment-summary`
    const res = await api.get(
      `/cases/${caseId}/therapies/${therapyId}/assignment-summary`
    );

    // Optional: debug log
    // console.debug("Assignment summary:", res.data);

    return res.data;
  } catch (error) {
    // Normalize error message
    const message =
      error?.response?.data?.error ||
      error?.response?.data?.message ||
      error.message ||
      "Failed to load assignment summary";

    const wrapped = new Error(message);
    wrapped.original = error; // in case you ever want raw error in caller

    throw wrapped;
  }
}
