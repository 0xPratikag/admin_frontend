// accessModulesSlice.js
import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

export const fetchAccessModules = createAsyncThunk(
  "modules/fetchAccessModules",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");

      if (!token) {
        return rejectWithValue("No authentication token found");
      }

      const res = await axios.get(`${API_BASE_URL}/modules/access`, {
        headers: { Authorization: `Bearer ${token}` },
      });

      return res.data; // { role, type, modules: { Dashboard: [...], ... } }
    } catch (err) {
      const status = err?.response?.status;
      const data = err?.response?.data;

      const shouldLogout =
        status === 440 ||
        data?.action === "logout" ||
        ["session_invalid", "permissions_changed", "role_revoked", "invalid_type"].includes(
          data?.error
        );

      if (shouldLogout) {
        localStorage.clear();
        window.location.href = "/authentication";
        return rejectWithValue(
          data?.message || "Your session has expired. Please login again."
        );
      }

      return rejectWithValue(
        data?.error || data?.message || "Failed to fetch modules"
      );
    }
  }
);

const accessModulesSlice = createSlice({
  name: "modules",
  initialState: {
    role: null,
    type: null,
    modules: {}, // ✅ object, not array
    loading: false,
    error: null,
  },
  reducers: {
    clearModules: (state) => {
      state.role = null;
      state.type = null;
      state.modules = {};
      state.error = null;
      state.loading = false;
    },
  },
  extraReducers: (builder) => {
    builder
      .addCase(fetchAccessModules.pending, (state) => {
        state.loading = true;
        state.error = null;
      })
      .addCase(fetchAccessModules.fulfilled, (state, action) => {
        state.loading = false;
        state.role = action.payload.role;
        state.type = action.payload.type;
        state.modules = action.payload.modules || {}; // ✅ object
      })
      .addCase(fetchAccessModules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearModules } = accessModulesSlice.actions;
export const accessModulesReducer = accessModulesSlice.reducer;
