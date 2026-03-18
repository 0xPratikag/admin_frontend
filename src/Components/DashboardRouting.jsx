import React, { useState } from "react";
import { Routes, Route, Navigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

import BranchDashboard from "./BranchDashboard";
import Sidebar from "./Sidebar";
import CreateCase from "./Cases/CreateCase";
import ViewAllCase from "./Cases/ViewAllCase";
import OnlinePayment from "./Payment/OnlinePayment";
import OfflinePayment from "./Payment/OfflinePayment";
import CaseDetail from "./Cases/CaseDetail";
import TransactionList from "./Payment/TransactionList";
import TransactionDetails from "./Payment/TransactionDetails";
import InvitePage from "./Invite/InvitePage";
import MeetingManager from "./MeetingManager/MeetingManager";
import GenerateBill from "./Bill/GenerateBill";
import TherapyCatalog from "./TherapyCatalog/TherapyCatalog";
import ScheduledSession from "./Session/ScheduledSession";
import AssignmentManager from "./AssignmentManager/AssignmentManager";
import AssignmentList from "./AssignmentManager/AssignmentList";

import InvoicesSection from "./Invoice/InvoicesSection";
import InvoiceDetails from "./Invoice/InvoiceDetails";
import InvoicePayment from "./Invoice/InvoicePayment";

const Forbidden = () => (
  <div className="p-6">
    <h1 className="text-xl font-semibold">403 — Not allowed</h1>
    <p className="text-gray-600">You don’t have access to this page.</p>
  </div>
);

/**
 * Keep this mapping in sync with Sidebar.
 * IMPORTANT: All values must match ROUTES keys.
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

  // ✅ Billing
  BILLING: "billing",
  BILLING_VIEW: "view_bill",
  BILL_CASE_GET: "generate_bill",
  BILL_CASE_UPSERT: "generate_bill",
  BILL_LIST: "view_bill",
  BILL_VIEW: "view_bill",
  BILL_CREATE_LEGACY: "generate_bill",

  // ✅ NEW granular invoice/line-items permissions
  GET_LINE_ITEMS: "active_line_items",
  POST_LINE_ITEM: "generate_bill",
  POST_INVOICE: "generate_bill",

  // ✅ Invoices
  GET_CASE_INVOICES: "invoice_section",
  GET_INVOICE_BY_ID: "invoice_details",
  GET_INVOICE_DOWNLOAD_BY_ID: "invoice_details",

  // ✅ Invoice payment screen access
  BILL_PAYMENT_OFFLINE: "invoice_payment",
  PAYMENT_OFFLINE: "invoice_payment",
  PAYMENT: "invoice_payment",

  // ===== Payments module
  PAYMENT_ONLINE: "online_payment",
  PAYMENT_TRANSACTIONS: "transactions",
  BILL_PAYMENT_ONLINE_INITIATE: "online_payment",
  BILL_PAYMENT_ONLINE_VERIFY: "online_payment",
  TXN_LIST: "transactions",
  TXN_VIEW: "transactions",
  BILL_INVOICE_BY_TRANSACTION: "transactions",
  BILL_INVOICE_BY_CASE: "view_bill",
  BILL_FINAL_INVOICE_BY_BILL: "view_bill",

  // ===== Members =====
  MEMBERS: "members",
  MEMBERS_INVITE: "add_members",

  // ===== Assignments =====
  ASSIGNMENT_MANAGER: "assignment_manager",
  ASSIGNMENT_MANAGER_LIST: "assignment_manager_List",
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

  const flatPermissions = Object.values(access || {}).reduce(
    (acc, arr) => acc.concat(arr || []),
    []
  );

  const normalizedAccess = Array.from(
    new Set(
      flatPermissions.flatMap((perm) => {
        const code = perm?.code || "";
        const name = perm?.name || "";
        if (code && PERM_KEY_MAP[code]) return [PERM_KEY_MAP[code]];
        if (name) return [name.toLowerCase().replace(/\s+/g, "_")];
        return [];
      })
    )
  );

  const ROUTES = [
    { path: "/admin/dashboard", element: <BranchDashboard />, key: "dashboard" },

    // Billing
    { path: "/admin/billing/generate-bill", element: <GenerateBill />, key: "generate_bill" },
    { path: "/admin/billing/generate-bill/:caseId", element: <GenerateBill />, key: "generate_bill" },

    { path: "/admin/generate-bill", element: <GenerateBill />, key: "generate_bill" },
    { path: "/admin/generate-bill/:caseId", element: <GenerateBill />, key: "generate_bill" },

    // Cases
    { path: "/admin/create-cases", element: <CreateCase />, key: "create_case" },
    { path: "/admin/view-cases", element: <ViewAllCase />, key: "view_case" },
    { path: "/admin/edit-case/:caseId", element: <CreateCase />, key: "create_case" },
    { path: "/admin/case-details/:caseId", element: <CaseDetail />, key: "view_case" },

    // ✅ Invoices
    { path: "/admin/invoices", element: <InvoicesSection />, key: "invoice_section" },
    { path: "/admin/invoices/:invoiceId", element: <InvoiceDetails />, key: "invoice_details" },
    { path: "/admin/invoices/:invoiceId/payment", element: <InvoicePayment />, key: "invoice_payment" },

    // Payments module
    { path: "/admin/onlinepayment", element: <OnlinePayment />, key: "online_payment" },
    { path: "/admin/offlinepayment", element: <OfflinePayment />, key: "offline_payment" },
    { path: "/admin/txnList", element: <TransactionList />, key: "transactions" },
    { path: "/admin/transaction-details/:id", element: <TransactionDetails />, key: "transactions" },

    // Members
    { path: "/admin/Invite", element: <InvitePage />, key: "add_members" },

    // Schedule
    { path: "/admin/meetingManager", element: <MeetingManager />, key: "schedule_online" },
    { path: "/admin/scheduledSessions", element: <ScheduledSession />, key: "schedule_sessions" },

    // Catalog
    { path: "/admin/therapy-catalog", element: <TherapyCatalog />, key: "therapy_catalog" },

    // Assignments
    { path: "/admin/assignments", element: <AssignmentManager />, key: "assignment_manager" },
    { path: "/admin/assignment_manager_List", element: <AssignmentList />, key: "assignment_manager_List" },

    { path: "/admin/403", element: <Forbidden />, key: null },
  ];

  const accessReady = !loading && normalizedAccess.length > 0;

  const firstAllowed =
    ROUTES.find((r) => r.key && normalizedAccess.includes(r.key))?.path ||
    "/admin/403";

  if (location.pathname === "/admin/403" && firstAllowed !== "/admin/403") {
    return <Navigate to={firstAllowed} replace />;
  }

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <Sidebar isCollapsed={isCollapsed} setIsCollapsed={setIsCollapsed} />

      <main
        className={`min-h-screen w-full box-border transition-all duration-300
          ${isCollapsed ? "lg:pl-16" : "lg:pl-64"}`}
      >
        <div className="w-full max-w-7xl mx-auto p-4 md:p-6">
          {!accessReady ? (
            <p className="text-gray-600">Loading permissions…</p>
          ) : (
            <Routes>
              {ROUTES.map(({ path, element, key }) => {
                if (!key) return <Route key={path} path={path} element={element} />;
                return normalizedAccess.includes(key) ? (
                  <Route key={path} path={path} element={element} />
                ) : null;
              })}
              <Route path="*" element={<Navigate to={firstAllowed} replace />} />
            </Routes>
          )}
        </div>
      </main>
    </div>
  );
};

export default DashboardRouting;
