import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import axios from "axios";

// ✅ Vite env
const API_BASE_URL = import.meta.env.VITE_API_BASE_URL;

// 🔹 Async thunk
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
      console.log(res);
      

      // API returns { role, subRole, modules }
      return res.data;
    } catch (err) {
      return rejectWithValue(
        err.response?.data?.error || "Failed to fetch modules"
      );
    }
  }
);

const accessModulesSlice = createSlice({
  name: "modules",
  initialState: {
    role: null,
    subrole: null,
    modules: [],
    loading: false,
    error: null,
  },
  reducers: {
    clearModules: (state) => {
      state.role = null;
      state.subrole = null;
      state.modules = [];
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
        state.subrole = action.payload.subrole;
        state.modules = action.payload.modules || [];
      })
      .addCase(fetchAccessModules.rejected, (state, action) => {
        state.loading = false;
        state.error = action.payload;
      });
  },
});

export const { clearModules } = accessModulesSlice.actions;
export const accessModulesReducer = accessModulesSlice.reducer;
