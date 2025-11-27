import React, { Suspense } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { ToastContainer } from "react-toastify";
import "react-toastify/dist/ReactToastify.css";

import DashboardRouting from "./Components/DashboardRouting";
import AuthForm from "./Components/Auth/AuthForm";
import LoadingModal from "./LoadingModal";
import { useDispatch, useSelector } from "react-redux";
import {
  clearModules,
  fetchAccessModules,
} from "./ReduxStore/Slices/accessModulesSlice";
import { useEffect } from "react";
import AcceptInvitation from "./Components/Auth/AcceptInvitation";

const RequireAuth = ({ children }) => {
  const token = localStorage.getItem("token");
  return token ? children : <Navigate to="/authentication" replace />;
};

const App = () => {
  const dispatch = useDispatch();

  const token = localStorage.getItem("token");

  // Fetch on mount
  useEffect(() => {
    if (!token) return;

    dispatch(fetchAccessModules());

    // Optional cleanup (clear state when leaving page)
    return () => {
      dispatch(clearModules());
    };
  }, [dispatch, token]);

  return (
    <>
      <ToastContainer
        position="top-right"
        autoClose={3000}
        hideProgressBar={false}
      />
      <Suspense fallback={<LoadingModal />}>
        <Routes>
          {/* ✅ Auth Page - Public */}
          <Route
            path={`/Accept-invitation/:Invitation_token`}
            element={<AcceptInvitation />}
          />
          <Route path="/authentication" element={<AuthForm />} />

          {/* ✅ Dashboard - Protected */}
          <Route
            path="/*"
            element={
              <RequireAuth>
                <DashboardRouting />
              </RequireAuth>
            }
          />

          {/* <Route
            path="/"
            element={
              token ? (
                <Navigate to="/admin/dashboard" replace />
              ) : (
                <Navigate to="/authentication" replace />
              )
            }
          /> */}

          {/* <Route path="*" element={<Navigate to="dashboard" replace />} /> */}
        </Routes>
      </Suspense>
    </>
  );
};

export default App;
