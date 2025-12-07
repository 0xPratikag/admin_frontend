import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
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

/**
 * Map backend permission CODES → internal access keys
 * These keys are used by routes + sidebar.
 */
const PERM_KEY_MAP = {
  // ===== Dashboard =====
  DASHBOARD_VIEW: "dashboard",

  // ===== Catalog / Therapy Catalog =====
  CATALOG: "catalog",
  CREATE_CATALOG_THERAPY: "therapy_catalog",
  VIEW_CATALOG_THERAPY: "therapy_catalog",
  GET_CATALOG_THERAPY_BY_ID: "therapy_catalog",
  UPDATE_CATALOG_THERAPY: "therapy_catalog",
  DELETE_CATALOG_THERAPY: "therapy_catalog",
  TOGGLE_CATALOG_THERAPY: "therapy_catalog",

  // ===== Cases =====
  CASES: "cases",
  CASES_CREATE: "create_case",
  CREATE_CASE: "create_case",
  VERIFY_PID: "create_case",
  "UPDATE-CASE": "create_case",
  CASES_VIEW: "view_case",
  GET_CASE_BY_ID: "view_case",
  SEARCH_CASE: "view_case",
  GET_CASES: "view_case",
  DELETE_CASE: "view_case",

  // ===== Billing (menu + granular) =====
  BILLING: "billing",
  BILLING_VIEW: "view_bill",
  BILL_CASE_GET: "generate_bill",
  BILL_CASE_UPSERT: "generate_bill",
  BILL_LIST: "view_bill",
  BILL_VIEW: "view_bill",
  BILL_CREATE_LEGACY: "generate_bill",

  // ===== Payments (old module) =====
  PAYMENT: "payment",
  PAYMENT_ONLINE: "online_payment",
  PAYMENT_OFFLINE: "offline_payment",
  PAYMENT_TRANSACTIONS: "transactions",

  // ===== Payments (new billing-specific) =====
  BILL_PAYMENT_OFFLINE: "offline_payment",
  BILL_PAYMENT_ONLINE_INITIATE: "online_payment",
  BILL_PAYMENT_ONLINE_VERIFY: "online_payment",

  // ===== Transactions =====
  TXN_LIST: "transactions",
  TXN_VIEW: "transactions",

  // ===== Invoices =====
  BILL_INVOICE_BY_TRANSACTION: "transactions",
  BILL_INVOICE_BY_CASE: "view_bill",
  BILL_FINAL_INVOICE_BY_BILL: "view_bill",

  // ===== Members =====
  MEMBERS: "members",
  MEMBERS_INVITE: "add_members",

     assignment_manager: "assignment_manager",
  assignment_manager_List: "assignment_manager_List",

  // ===== Schedule =====
  SCHEDULE: "schedule",
  SCHEDULE_MEETING: "schedule_online",
  SCHEDULED_SESSION: "schedule_sessions",
  SCHEDULED_ALL: "all_scheduled",

  // ===== Settings / Logout =====
  SETTINGS: "settings",
  SETTINGS_LOGOUT: "logout",
};

const DashboardRouting = () => {
  const location = useLocation();
  const { modules: access = {}, loading } = useSelector((s) => s.modules || {});
  const [isCollapsed, setIsCollapsed] = useState(false);

  // 🔥 flatten permissions from modules object
  const flatPermissions = Object.values(access || {}).reduce(
    (acc, arr) => acc.concat(arr || []),
    []
  );

  // codes → internal keys (with fallback on name slug)
  const normalizedAccess = Array.from(
    new Set(
      flatPermissions.flatMap((perm) => {
        const code = perm?.code || "";
        const name = perm?.name || "";

        if (code && PERM_KEY_MAP[code]) {
          return [PERM_KEY_MAP[code]];
        }

        if (name) {
          return [name.toLowerCase().replace(/\s+/g, "_")];
        }

        return [];
      })
    )
  );

  const ROUTES = [
    { path: "/admin/dashboard", element: <DashboardBase />, key: "dashboard" },

    // Cases
    { path: "/admin/create-cases", element: <CreateCase />, key: "create_case" },
    { path: "/admin/view-cases", element: <ViewAllCase />, key: "view_case" },
    {
      path: "/admin/edit-case/:caseId",
      element: <CreateCase />,
      key: "create_case",
    },
    {
      path: "/admin/case-details/:caseId",
      element: <CaseDetail />,
      key: "view_case",
    },

    // Billing
    { path: "/admin/view-bill", element: <ViewBill />, key: "view_bill" },
    {
      path: "/admin/bill-details/:id",
      element: <ViewBillDetails />,
      key: "view_bill",
    },
    {
      path: "/admin/generate-bill",
      element: <GenerateBill />,
      key: "generate_bill",
    },

    // Payment
    {
      path: "/admin/onlinepayment",
      element: <OnlinePayment />,
      key: "online_payment",
    },
    {
      path: "/admin/offlinepayment",
      element: <OfflinePayment />,
      key: "offline_payment",
    },
    { path: "/admin/txnList", element: <TransactionList />, key: "transactions" },
    {
      path: "/admin/transaction-details/:id",
      element: <TransactionDetails />,
      key: "transactions",
    },

    // Members
    { path: "/admin/Invite", element: <InvitePage />, key: "add_members" },

    // Schedule
    {
      path: "/admin/meetingManager",
      element: <MeetingManager />,
      key: "schedule_online",
    },
    {
      path: "/admin/scheduledSessions",
      element: <ScheduledSession />,
      key: "schedule_sessions",
    },

    // Therapy Catalog
    {
      path: "/admin/therapy-catalog",
      element: <TherapyCatalog />,
      key: "therapy_catalog",
    },

    // Assignments
    {
      path: "/admin/assignments",
      element: <AssignmentManager />,
      key: "assignment_manager",
    },
    {
      path: "/admin/assignment_manager_List",
      element: <AssignmentList />,
      key: "assignment_manager_List",
    },

    // Fallback / 403
    { path: "/admin/403", element: <Forbidden />, key: null },
  ];

  // 🔑 Access ready kab hai?
  const accessReady = !loading && normalizedAccess.length > 0;

  // Agar abhi permissions nahi aaye → sirf layout + loader
  if (!accessReady) {
    return (
      <div className="flex">
        <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
        <div
          className={`flex-1 transition-all duration-300 ${
            isCollapsed ? "lg:ml-16" : "lg:ml-64"
          } ml-0`}
        >
          <div className="max-w-7xl mx-auto w-full p-6">
            <p className="text-gray-600">Loading permissions…</p>
          </div>
        </div>
      </div>
    );
  }

  // Ab permissions ready hain → default allowed route nikaalo
  const firstAllowed =
    ROUTES.find((r) => r.key && normalizedAccess.includes(r.key))?.path ||
    "/admin/403";

  // Agar koi permission hai aur current URL 403 hai,
  // to user ko default allowed route pe bhej do:
  if (location.pathname === "/admin/403" && firstAllowed !== "/admin/403") {
    return <Navigate to={firstAllowed} replace />;
  }

  return (
    <div className="flex">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />
      <div
        className={`flex-1 transition-all duration-300 ${
          isCollapsed ? "lg:ml-16" : "lg:ml-64"
        } ml-0`}
      >
        <div className="max-w-7xl mx-auto w-full p-6">
          <Routes>
            {ROUTES.map(({ path, element, key }) => {
              if (!key) return <Route key={path} path={path} element={element} />;

              return normalizedAccess.includes(key) ? (
                <Route key={path} path={path} element={element} />
              ) : null;
            })}

            {/* Fallback sirf tab jab access ready hai */}
            <Route path="*" element={<Navigate to={firstAllowed} replace />} />
          </Routes>
        </div>
      </div>
    </div>
  );
};

export default DashboardRouting;
