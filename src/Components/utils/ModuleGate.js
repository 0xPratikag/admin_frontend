// components/routing/ModuleGate.jsx
import React from "react";
import { useSelector } from "react-redux";
import { Navigate } from "react-router-dom";

const ModuleGate = ({ need, children }) => {
  const { modules = [], loading } = useSelector((s) => s.modules || {});
  if (loading) return null; // or a spinner if you prefer
  return modules.includes(need) ? children : <Navigate to="/admin/403" replace />;
};

export default ModuleGate;
