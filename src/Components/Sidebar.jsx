// Sidebar.jsx
import React, { useState, useEffect } from "react";
import {
  LayoutDashboard,
  ChevronDown,
  ChevronRight,
  Stethoscope,
  FilePlus,
  ReceiptText,
  Banknote,
  CreditCard,
  FileCheck2,
  ClipboardList,
  Users,
  Calendar,
  Menu,
  X,
  LogOut,
} from "lucide-react";
import { useNavigate, useLocation } from "react-router-dom";
import { useSelector } from "react-redux";

const Sidebar = ({ isCollapsed = false, setIsCollapsed = () => {} }) => {
  const navigate = useNavigate();
  const location = useLocation();

  const [openMenus, setOpenMenus] = useState({});
  const [branchName, setBranchName] = useState("India Therapy");
  const [loading, setLoading] = useState(false);
  const [activeHover, setActiveHover] = useState(null);

  const { role, subrole, modules: accessModules = [] } = useSelector(
    (state) => state.modules || {}
  );

  // Map API names -> internal keys
  const MODULE_KEY_MAP = {
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

  // Normalize access coming from API (Title Case) to internal keys (snake_case)
  const normalizedAccess = accessModules.map(
    (m) => MODULE_KEY_MAP[m] || m.toLowerCase().replace(/\s+/g, "_")
  );

  // Single source of truth for sidebar structure (internal keys)
  const allModules = [
    {
      key: "dashboard",
      name: "Dashboard",
      path: "/admin/dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
    },

    {
  key: "catalog",
  name: "Catalog",
  path: "/admin/",
  icon: <Stethoscope className="w-5 h-5" />,
  children: [
    {
      key: "therapy_catalog",
      name: "Therapy Catalog",
      path: "/admin/therapy-catalog",
      icon: <Stethoscope className="w-4 h-4" />,
    },
  ],
},



    {
      key: "cases",
      name: "Cases",
      path: "/admin/",
      icon: <Stethoscope className="w-5 h-5" />,
      children: [
        {
          key: "create_case",
          name: "Create Case",
          path: "/admin/create-cases",
          icon: <FilePlus className="w-4 h-4" />,
        },
        {
          key: "view_case",
          name: "View Case",
          path: "/admin/view-cases",
          icon: <ClipboardList className="w-4 h-4" />,
        },
      ],
    },


       {
      key: "assignments",
      name: "Assignments",
      path: "/admin/",
      icon: <ClipboardList className="w-5 h-5" />,
      children: [
        {
          key: "assignment_manager",
          name: "Manage Assignments",
          path: "/admin/assignments",
          icon: <ClipboardList className="w-4 h-4" />,
        },

          {
          key: "assignment_manager_List",
          name: "Assignments List",
          path: "/admin/assignment_manager_List",
          icon: <ClipboardList className="w-4 h-4" />,
        },


      ],
    },


    
  {
  key: "billing",
  name: "Billing",
  path: "/admin/",
  icon: <ReceiptText className="w-5 h-5" />,
  children: [
    {
      key: "generate_bill",
      name: "Generate Bill",
      path: "/admin/generate-bill",
      icon: <FilePlus className="w-4 h-4" />,
    },
    {
      key: "view_bill",
      name: "View Bill",
      path: "/admin/view-bill",
      icon: <CreditCard className="w-4 h-4" />,
    },
  ],
},

    {
      key: "payment",
      name: "Payment",
      path: "/admin/",
      icon: <Banknote className="w-5 h-5" />,
      children: [
        {
          key: "online_payment",
          name: "Online",
          path: "/admin/onlinepayment",
          icon: <CreditCard className="w-4 h-4" />,
        },
        {
          key: "offline_payment",
          name: "Offline",
          path: "/admin/offlinepayment",
          icon: <Banknote className="w-4 h-4" />,
        },
        {
          key: "transactions",
          name: "Transactions",
          path: "/admin/txnList",
          icon: <FileCheck2 className="w-4 h-4" />,
        },
      ],
    },
    {
      key: "members",
      name: "Members",
      path: "/admin/",
      icon: <Users className="w-5 h-5" />,
      children: [
        {
          key: "add_members",
          name: "Invite Member",
          path: "/admin/Invite",
          icon: <Users className="w-4 h-4" />,
        },
      ],
    },
    {
      key: "schedule",
      name: "Schedule",
      path: "/admin/",
      icon: <Calendar className="w-5 h-5" />,
      children: [

         {
          key: "schedule_sessions",
          name: "Session",
          path: "/admin/scheduledSessions",
          icon: <Calendar className="w-4 h-4" />,
        },

        {
          key: "schedule_online",
          name: "Schedule Meeting",
          path: "/admin/meetingManager",
          icon: <Calendar className="w-4 h-4" />,
        },
        {
          key: "all_scheduled",
          name: "All Scheduled",
          path: "/admin/all-scheduledList",
          icon: <ClipboardList className="w-4 h-4" />,
        },
      ],
    },
  ];

  // Include a parent if the parent OR any of its children are allowed
  const filteredModules = allModules
    .map((mod) => {
      const parentAllowed = normalizedAccess.includes(mod.key);
      if (mod.children?.length) {
        const children = mod.children.filter((c) =>
          normalizedAccess.includes(c.key)
        );
        const showParent = parentAllowed || children.length > 0;
        return showParent ? { ...mod, children } : null;
      }
      return parentAllowed ? mod : null;
    })
    .filter(Boolean);


    

  useEffect(() => {
    setTimeout(() => setLoading(false), 500);
  }, []);

  const toggleMenu = (name) => {
    if (isCollapsed) setIsCollapsed(false);
    setOpenMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const currentPath = location.pathname;
  const isActive = (path) =>
    currentPath === path || currentPath.startsWith(path + "/");

  const handleNavigate = (path) => {
    navigate(path);
  };

  const toggleCollapse = () => setIsCollapsed((s) => !s);

  const canLogout = normalizedAccess.includes("logout");

  return (
    <>
      {/* Mobile Overlay */}
      {!isCollapsed && (
        <div
          className="fixed inset-0 bg-black/30 z-40 lg:hidden"
          onClick={() => setIsCollapsed(true)}
        />
      )}

      <aside
        className={`fixed top-0 left-0 h-screen z-50 transition-all duration-300 ease-in-out
          ${isCollapsed ? "w-16" : "w-64"}
          bg-white border-r border-gray-200 shadow-lg`}
      >
        <div className="relative h-full overflow-hidden">
          {/* Toggle Button */}
          <button
            onClick={toggleCollapse}
            className="absolute top-4 right-4 z-10 p-1.5 rounded-md
              bg-gray-100 hover:bg-gray-200 
              text-gray-600 hover:text-gray-800
              transition-all duration-200"
          >
            {isCollapsed ? <Menu className="w-4 h-4" /> : <X className="w-4 h-4" />}
          </button>

          <div
            className={`h-full overflow-y-auto py-6 transition-all duration-300
            scrollbar-thin scrollbar-thumb-gray-300 scrollbar-track-transparent
            ${isCollapsed ? "px-2" : "px-4"}`}
          >
            {/* Branch Header */}
            <div
              className={`mb-8 text-center transition-all duration-300 ${
                isCollapsed ? "mb-6" : "mb-8"
              }`}
            >
              {loading ? (
                <div className="animate-pulse space-y-2">
                  <div className="h-6 bg-gray-200 rounded mx-auto w-3/4" />
                  <div className="h-3 bg-gray-200 rounded mx-auto w-1/2" />
                </div>
              ) : (
                <div
                  className={`transition-all duration-300 ${
                    isCollapsed ? "scale-90" : "scale-100"
                  }`}
                >
                  <h2
                    className={`font-bold text-gray-800 transition-all duration-300 ${
                      isCollapsed ? "text-sm" : "text-lg"
                    }`}
                  >
                    {isCollapsed ? "🏥" : `🏥 ${branchName}`}
                  </h2>
                  {!isCollapsed && (
                    <div className="mt-2 px-3 py-1 bg-blue-50 rounded-full border border-blue-100">
                      <p className="text-xs text-blue-700 font-medium">
                        {subrole || role}
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Navigation */}
            <nav className="space-y-1">
              {filteredModules.map((mod) => {
                const active = isActive(mod.path);
                const isOpen = openMenus[mod.name] || active;
                const isHovered = activeHover === mod.name;

                return (
                  <div
                    key={mod.name}
                    onMouseEnter={() => setActiveHover(mod.name)}
                    onMouseLeave={() => setActiveHover(null)}
                  >
                    {/* Parent Menu */}
                    <button
                      onClick={() =>
                        mod.children?.length
                          ? toggleMenu(mod.name)
                          : handleNavigate(mod.path)
                      }
                      className={`flex items-center justify-between w-full rounded-lg
                        text-left group transition-all duration-200
                        ${isCollapsed ? "p-2.5" : "px-3 py-2.5"}
                        ${
                          active
                            ? "bg-blue-50 text-blue-700 border border-blue-200"
                            : "hover:bg-gray-50 text-gray-700 hover:text-gray-900"
                        }`}
                    >
                      <div className="flex items-center gap-3">
                        <span
                          className={`transition-colors duration-200 ${
                            active
                              ? "text-blue-600"
                              : "text-gray-500 group-hover:text-gray-700"
                          }`}
                        >
                          {mod.icon}
                        </span>
                        {!isCollapsed && (
                          <span className="font-medium text-sm">{mod.name}</span>
                        )}
                      </div>
                      {mod.children?.length && !isCollapsed && (
                        <span
                          className={`transition-transform duration-200 ${
                            isOpen ? "rotate-180" : ""
                          }`}
                        >
                          <ChevronDown className="w-4 h-4" />
                        </span>
                      )}
                      {isCollapsed && mod.children?.length && (
                        <ChevronRight className="w-3 h-3 opacity-60" />
                      )}
                    </button>

                    {/* Tooltip for collapsed state */}
                    {isCollapsed && isHovered && (
                      <div
                        className="absolute left-16 bg-gray-900 text-white px-2 py-1 rounded-md 
                        shadow-lg z-50 pointer-events-none text-xs whitespace-nowrap
                        animate-in fade-in-0 slide-in-from-left-1 duration-150"
                      >
                        {mod.name}
                        <div
                          className="absolute left-0 top-1/2 -translate-y-1/2 -translate-x-1 
                          w-1 h-1 bg-gray-900 rotate-45"
                        />
                      </div>
                    )}

                    {/* Submenu */}
                    {mod.children?.length && !isCollapsed && (
                      <div
                        className={`ml-8 mt-1 space-y-1 overflow-hidden 
                          transition-all duration-300 ease-in-out
                          ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
                      >
                        {mod.children.map((child, index) => {
                          const childActive = isActive(child.path);
                          return (
                            <button
                              key={child.name}
                              onClick={() => handleNavigate(child.path)}
                              className={`flex items-center gap-3 px-3 py-2 rounded-md
                                text-sm w-full text-left font-medium
                                transition-all duration-200
                                ${
                                  childActive
                                    ? "bg-blue-50 text-blue-700 border border-blue-200"
                                    : "hover:bg-gray-50 text-gray-600 hover:text-gray-800"
                                }`}
                              style={{
                                transitionDelay: isOpen ? `${index * 30}ms` : "0ms",
                              }}
                            >
                              <span
                                className={`transition-colors duration-200 ${
                                  childActive ? "text-blue-600" : "text-gray-400"
                                }`}
                              >
                                {child.icon}
                              </span>
                              {child.name}
                            </button>
                          );
                        })}
                      </div>
                    )}
                  </div>
                );
              })}
            </nav>

            {/* Logout Button (only if allowed) */}
            {canLogout && (
              <div className={`mt-auto ${isCollapsed ? "px-2" : "px-4"} mb-4`}>
                <button
                  onClick={() => navigate("/authentication")}
                  className={`flex items-center gap-3 w-full rounded-lg
                  p-2.5 text-left group transition-all duration-200
                  hover:bg-red-50 hover:text-red-700 text-gray-700`}
                >
                  <LogOut className="w-5 h-5 text-red-500" />
                  {!isCollapsed && (
                    <span className="font-medium text-sm">Logout</span>
                  )}
                </button>
              </div>
            )}
          </div>
        </div>
      </aside>
    </>
  );
};

export default Sidebar;
