// DashboardRouting.jsx
import React, { useState } from "react";
import { Routes, Route, Navigate } from "react-router-dom";
import { useSelector } from "react-redux";

import DashboardBase from "./DashboardBase";
import Sidebar from "./Sidebar";
import CreateCase from "./Cases/CreateCase";
import ViewAllCase from "./Cases/ViewAllCase";
import OnlinePayment from "./Payment/OnlinePayment";
import OfflinePayment from "./Payment/OfflinePayment";
import CaseDetail from "./Cases/CaseDetail";
import ViewBill from "./Bill/ViewBill";
import ViewBillDetails from "./Bill/ViewBillDetails";
import TransactionList from "./Payment/TransactionList";
import TransactionDetails from "./Payment/TransactionDetails";
import InvitePage from "./Invite/InvitePage";
import MeetingManager from "./MeetingManager/MeetingManager";
import GenerateBill from "./Bill/GenerateBill";
import TherapyCatalog from "./TherapyCatalog/TherapyCatalog";
import ScheduledSession from "./Session/ScheduledSession";
import AssignmentManager from "./AssignmentManager/AssignmentManager";
import AssignmentList from "./AssignmentManager/AssignmentList";

const Forbidden = () => (
  <div className="p-6">
    <h1 className="text-xl font-semibold">403 — Not allowed</h1>
    <p className="text-gray-600">You don’t have access to this page.</p>
  </div>
);

// 🔑 map API module names → internal keys
const moduleKeyMap = {
  Dashboard: "dashboard",

    Catalog: "catalog",
  "Therapy Catalog": "therapy_catalog",


  Cases: "cases",
  "Create Case": "create_case",
  "View Case": "view_case",

  // 🔹 Assignments related (dono same key pe)
  Assignments: "assignment_manager",
  "Manage Assignments": "assignment_manager",
  "Assignments List": "assignment_manager_List",

  Billing: "billing",
  "View Bill": "view_bill",
  Payment: "payment",
  Online: "online_payment",
  Offline: "offline_payment",
  Transactions: "transactions",
  Members: "members",
  "Invite Member": "add_members",
  Schedule: "schedule",
      "Session": "schedule_sessions",
  "Schedule Meeting": "schedule_online",
  "All Scheduled": "all_scheduled",
  Logout: "logout",


};

const DashboardRouting = () => {
  const { modules: access, loading } = useSelector((s) => s.modules || {});
  const [isCollapsed, setIsCollapsed] = useState(false);

  // normalize module names
  const normalizedAccess = (access || []).map(
    (m) => moduleKeyMap[m] || m.toLowerCase().replace(/\s+/g, "_")
  );

  // Map each route to its required module key
  const ROUTES = [
    { path: "/admin/dashboard", element: <DashboardBase />, key: "dashboard" },

    // Cases
    { path: "/admin/create-cases", element: <CreateCase />, key: "create_case" },
    { path: "/admin/view-cases", element: <ViewAllCase />, key: "view_case" },
    { path: "/admin/edit-case/:caseId", element: <CreateCase />, key: "create_case" },
    { path: "/admin/case-details/:caseId", element: <CaseDetail />, key: "view_case" },

    // Billing
    { path: "/admin/view-bill", element: <ViewBill />, key: "view_bill" },
    { path: "/admin/bill-details/:id", element: <ViewBillDetails />, key: "view_bill" },
    {path: "/admin/generate-bill", element : <GenerateBill />, key: "generate_bill"},

    // Payment
    { path: "/admin/onlinepayment", element: <OnlinePayment />, key: "online_payment" },
    { path: "/admin/offlinepayment", element: <OfflinePayment />, key: "offline_payment" },
    { path: "/admin/txnList", element: <TransactionList />, key: "transactions" },
    { path: "/admin/transaction-details/:id", element: <TransactionDetails />, key: "transactions" },

    // Members
    { path: "/admin/Invite", element: <InvitePage />, key: "add_members" },

    // Schedule
    { path: "/admin/meetingManager", element: <MeetingManager />, key: "schedule_online" },

    { path: "/admin/scheduledSessions", element: <ScheduledSession />, key: "schedule_sessions" },


    // ******** Theapy insertion ************
{ path: "/admin/therapy-catalog", element: <TherapyCatalog />, key: "therapy_catalog" },


    
 // 🔹 NEW: Assignment manager
    { path: "/admin/assignments", element: <AssignmentManager />, key: "assignment_manager" },

        { path: "/admin/assignment_manager_List", element: <AssignmentList />, key: "assignment_manager_List" },


    // Public-ish admin page
    { path: "/admin/403", element: <Forbidden />, key: null },
  ];

  if (loading) {
    return (
      <div className="flex">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        <div className={`flex-1 transition-all duration-300 ${isCollapsed ? "lg:ml-16" : "lg:ml-64"} ml-0`}>
          <div className="max-w-7xl mx-auto w-full p-6">Loading…</div>
        </div>
      </div>
    );
  }

  // First allowed route for default redirect
  const firstAllowed =
    ROUTES.find((r) => r.key && normalizedAccess.includes(r.key))?.path ||
    "/admin/403";

  return (
    <div className="flex">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      {/* On desktop, push content by sidebar width; on mobile keep full-width (overlay handles it) */}
      <div
        className={`flex-1 transition-all duration-300 ${
          isCollapsed ? "lg:ml-16" : "lg:ml-64"
        } ml-0`}
      >
        {/* “Compressed” content width */}
        <div className="max-w-7xl mx-auto w-full p-6">
          <Routes>
            {ROUTES.map(({ path, element, key }) => {
              if (!key) return <Route key={path} path={path} element={element} />;
              return normalizedAccess.includes(key) ? (
                <Route key={path} path={path} element={element} />
              ) : null;
            })}
            {/* Fallbacks — send users to first allowed or 403 */}
            <Route path="*" element={<Navigate to={firstAllowed} replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default DashboardRouting;
