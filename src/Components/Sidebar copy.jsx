import React, { useState, useEffect } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
} from "lucide-react";
import { useDispatch, useSelector } from "react-redux";
import { fetchAccessModules } from "../ReduxStore/Slices/accessModulesSlice";

const Sidebar = () => {
  const dispatch = useDispatch();

  const navigate = useNavigate();
  const location = useLocation();
  const [openMenus, setOpenMenus] = useState({});
  const [branchName, setBranchName] = useState("India Therapy Center");
  const [loading, setLoading] = useState(true);

  const {
    role,
    subrole,
    modules: accessModules,
    error,
  } = useSelector((state) => state.modules);

  console.log(subrole);
  

  // 🌍 Full module structure with metadata
  const allModules = [
    {
      key: "dashboard",
      name: "Dashboard",
      path: "/admin/dashboard",
      icon: <LayoutDashboard className="w-5 h-5" />,
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
          icon: <FilePlus className="w-4 h-4 text-indigo-300" />,
        },
        {
          key: "view_case",
          name: "View Case",
          path: "/admin/view-cases",
          icon: <ClipboardList className="w-4 h-4 text-indigo-300" />,
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
          key: "view_bill",
          name: "View Bill",
          path: "/admin/view-bill",
          icon: <CreditCard className="w-4 h-4 text-indigo-300" />,
        },
      ],
    },
    {
      key: "payment",
      name: "Payment",
      path: "/admin/",
      icon: <ReceiptText className="w-5 h-5" />,
      children: [
        {
          key: "online_payment",
          name: "Online",
          path: "/admin/onlinepayment",
          icon: <CreditCard className="w-4 h-4 text-indigo-300" />,
        },
        {
          key: "offline_payment",
          name: "Offline",
          path: "/admin/offlinepayment",
          icon: <Banknote className="w-4 h-4 text-indigo-300" />,
        },
        {
          key: "transactions",
          name: "Transactions",
          path: "/admin/txnList",
          icon: <FileCheck2 className="w-4 h-4 text-indigo-300" />,
        },
      ],
    },

    {
      key: "Members",
      name: "Members",
      path: "/admin/",
      icon: <ReceiptText className="w-5 h-5" />,
      children: [
        {
          key: "Add_Members",
          name: "Invite Memeber",
          path: "/admin/Invite",
          icon: <CreditCard className="w-4 h-4 text-indigo-300" />,
        },
      ],
    },

    {
      key: "Schedule",
      name: "Schedule",
      path: "/admin/",
      icon: <ReceiptText className="w-5 h-5" />,
      children: [
        {
          key: "schedule_online",
          name: "Schedule Meeting",
          path: "/admin/Schedule-Meeting",
          icon: <CreditCard className="w-4 h-4 text-indigo-300" />,
        },
        {
          key: "All_Scheduled",
          name: "All Scheduled",
          path: "/admin/all-scheduledList",
          icon: <Banknote className="w-4 h-4 text-indigo-300" />,
        },
      ],
    },
  ];

  // 🌟 Filter modules based on user access
  const filteredModules = allModules
    .filter((mod) => accessModules.includes(mod.key))
    .map((mod) => {
      if (mod.children) {
        const filteredChildren = mod.children.filter((child) =>
          accessModules.includes(child.key)
        );
        return { ...mod, children: filteredChildren };
      }
      return mod;
    })
    .filter((mod) => !mod.children || mod.children.length > 0); // remove empty parents

  // Fetch branch details
  useEffect(() => {
    const fetchBranch = async () => {
      try {
        dispatch(fetchAccessModules());

        const token = localStorage.getItem("token");
        if (!token) return;

        // const res = await fetch(
        //   `${import.meta.env.VITE_API_BASE_URL}/branch/details`,
        //   {
        //     headers: { Authorization: `Bearer ${token}` },
        //   }
        // );
        // const data = await res.json();
        // setBranchName(data?.branchName || "My Branch");

      } catch {
        setBranchName("Unknown Branch");
      } finally {
        setLoading(false);
      }
    };
    fetchBranch();
  }, []);

  const toggleMenu = (name) => {
    setOpenMenus((prev) => ({ ...prev, [name]: !prev[name] }));
  };

  const isActive = (path) =>
    location.pathname === path || location.pathname.startsWith(path + "/");

  return (
    <aside
      className="fixed top-0 left-0 h-screen w-64 
  bg-gradient-to-b from-indigo-950 via-indigo-900 to-black/95 
  text-white shadow-2xl z-50 
  backdrop-blur-xl border-r border-indigo-800/40"
    >
      {/* Branch Header */}
      <div
        className="h-full overflow-y-auto px-4 py-6 
    scrollbar-thin scrollbar-thumb-indigo-700/70 scrollbar-track-transparent"
      >
        <div className="mb-10 border-b border-indigo-700/40 pb-6 text-center">
          {loading ? (
            <div className="animate-pulse">
              <div className="h-6 w-32 bg-indigo-700 rounded mx-auto"></div>
            </div>
          ) : (
            <div>
                  <h2 className="text-xl font-extrabold text-indigo-300 tracking-wide drop-shadow">
              🏥 {branchName}
            </h2>
                <h2 className="text-sm">
              {subrole}
            </h2>
            </div>
          )}
        </div>

        {/* Navigation */}
        <nav className="space-y-3">
          {allModules.map((mod) => {
            const active = isActive(mod.path);
            const isOpen = openMenus[mod.name] || active;

            return (
              <div key={mod.name}>
                {/* Parent Menu */}
                <button
                  onClick={() =>
                    mod.children ? toggleMenu(mod.name) : navigate(mod.path)
                  }
                  className={`flex items-center justify-between px-4 py-3 w-full rounded-lg 
                text-left group transition-all duration-300 ease-in-out
                ${
                  active
                    ? "bg-gradient-to-r from-indigo-700 to-indigo-600 text-white shadow-lg ring-1 ring-indigo-400"
                    : "hover:bg-indigo-800/60 text-gray-300 hover:text-white"
                }`}
                >
                  <div className="flex items-center gap-3">
                    <span
                      className={`transition-colors ${
                        active
                          ? "text-indigo-100"
                          : "text-indigo-400 group-hover:text-indigo-200"
                      }`}
                    >
                      {mod.icon}
                    </span>
                    <span className="text-[15px] font-semibold tracking-wide">
                      {mod.name}
                    </span>
                  </div>
                  {mod.children && (
                    <span
                      className={`transition-transform duration-300 ${
                        isOpen ? "rotate-180" : ""
                      }`}
                    >
                      <ChevronDown className="w-4 h-4" />
                    </span>
                  )}
                </button>

                {/* Submenu */}
                {mod.children && (
                  <div
                    className={`ml-5 mt-2 space-y-1 overflow-hidden 
                  transition-all duration-500 ease-in-out
                  ${isOpen ? "max-h-96 opacity-100" : "max-h-0 opacity-0"}`}
                  >
                    {mod.children.map((child) => (
                      <button
                        key={child.name}
                        onClick={() => navigate(child.path)}
                        className={`flex items-center gap-2 px-3 py-2 rounded-md 
                      text-sm w-full text-left font-medium 
                      transition duration-200
                      ${
                        isActive(child.path)
                          ? "bg-indigo-700 text-white shadow-md"
                          : "hover:bg-indigo-800/50 text-indigo-300 hover:text-indigo-100"
                      }`}
                      >
                        {child.icon}
                        {child.name}
                      </button>
                    ))}
                  </div>
                )}
              </div>
            );
          })}
        </nav>
      </div>
    </aside>
  );
};

export default Sidebar;
