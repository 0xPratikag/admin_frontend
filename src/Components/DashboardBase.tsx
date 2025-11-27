import React, { useEffect, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Briefcase,
  FileText,
  CreditCard,
  Users2,
  Activity,
  TrendingUp,
  PieChart,
} from "lucide-react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  Pie,
  Cell,
} from "recharts";

const NeonDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/dashboard`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setData(res.data);
    } catch (err) {
      console.error("Error fetching dashboard:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
  }, []);

  if (loading) return <p className="text-center text-white">Loading...</p>;
  if (!data) return <p className="text-center text-red-500">Failed to load data</p>;

  // Format charts
  const revenueData = (data.revenueStats || []).map((r) => ({
    month: `${r._id.month}/${r._id.year}`,
    total: r.total,
  }));

  const billData = [
    { name: "Paid", value: data.bills.paid, color: "#34d399" },
    { name: "Partial", value: data.bills.partial, color: "#fbbf24" },
    { name: "Pending", value: data.bills.pending, color: "#ef4444" },
  ].filter((b) => b.value > 0); // 👈 remove 0-value slices

  const statCards = [
    {
      title: "Total Cases",
      value: data.totalCases,
      icon: <Briefcase size={28} />,
      color: "from-pink-500 via-fuchsia-600 to-purple-700",
      link: "/admin/view-cases",
    },
    {
      title: "Total Bills",
      value: data.totalBills,
      icon: <FileText size={28} />,
      color: "from-cyan-400 via-blue-500 to-indigo-700",
      link: "/admin/view-bill",
    },
    {
      title: "Revenue",
      value: `₹${data.totalRevenue.toLocaleString()}`,
      icon: <CreditCard size={28} />,
      color: "from-green-400 via-emerald-500 to-teal-700",
      link: "/admin/txnList",
    },
    {
      title: "Paid Bills",
      value: data.bills.paid,
      icon: <Users2 size={28} />,
      color: "from-yellow-400 via-orange-500 to-red-700",
      link: "/admin/view-bill",
    },
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-900 via-gray-200 to-blue-900 text-white p-8  border-2 border-white/10 rounded-3xl shadow-2xl">
      <h2 className="text-4xl font-extrabold tracking-tight text-center mb-10 neon-text">
        ⚡ Admin Dashboard
      </h2>

      {/* Stat Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-4 gap-6 mb-12">
        {statCards.map((card, idx) => (
          <Link
            to={card.link}
            key={idx}
            className={`group relative overflow-hidden rounded-2xl p-6 flex flex-col justify-between shadow-lg border border-white/10 
              bg-gradient-to-br ${card.color} hover:scale-105 transition-all duration-300`}
          >
            <div className="flex items-center justify-between">
              <h4 className="text-lg font-medium opacity-90">{card.title}</h4>
              <div className="p-3 bg-white/20 rounded-xl text-white">{card.icon}</div>
            </div>
            <p className="text-3xl mt-4 font-extrabold drop-shadow-glow">
              {card.value}
            </p>
            <span className="mt-3 text-sm text-white/80 opacity-0 group-hover:opacity-100 transition">
              → View Details
            </span>
          </Link>
        ))}
      </div>

      {/* Chart + Billing Status */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-12">
        {/* Revenue Bar Chart */}
        <div className="bg-gray-900 border border-fuchsia-500/40 rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <TrendingUp className="text-fuchsia-400" /> Revenue Trends
          </h3>
          <div className="h-64">
            <ResponsiveContainer width="100%" height="100%">
              <BarChart data={revenueData}>
                <XAxis dataKey="month" stroke="#a78bfa" />
                <YAxis stroke="#a78bfa" />
                <Tooltip />
                <Bar dataKey="total" fill="#a78bfa" radius={[6, 6, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Billing Status Pie Chart */}
        <div className="bg-gray-900 border border-cyan-400/40 rounded-2xl shadow-xl p-6">
          <h3 className="text-xl font-semibold mb-4 flex items-center gap-2">
            <PieChart className="text-cyan-300" /> Billing Status
          </h3>
          <div className="h-64 flex items-center justify-center">
            <ResponsiveContainer width="100%" height="100%">
              <Pie
                data={billData}
                dataKey="value"
                nameKey="name"
                cx="50%"
                cy="50%"
                outerRadius={100}
                label
              >
                {billData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={entry.color} />
                ))}
              </Pie>
            </ResponsiveContainer>
          </div>
        </div>
      </div>

      {/* Recent Transactions */}
      <div className="bg-gray-900 border border-pink-400/40 rounded-2xl shadow-xl p-6">
        <h3 className="text-xl font-semibold mb-5 flex items-center gap-2 text-pink-300">
          <Activity /> Recent Transactions
        </h3>
        <div className="overflow-x-auto">
          <table className="w-full text-sm text-left text-gray-300">
            <thead className="uppercase text-gray-400 border-b border-pink-400/40">
              <tr>
                <th className="px-4 py-2">Patient</th>
                <th className="px-4 py-2">Case ID</th>
                <th className="px-4 py-2">Amount</th>
                <th className="px-4 py-2">Date</th>
              </tr>
            </thead>
            <tbody>
              {data.recentTransactions.map((txn) => (
                <tr
                  key={txn._id}
                  className="border-b border-white/10 hover:bg-white/5 transition"
                >
                  <td className="px-4 py-2">{txn.caseId?.patient_name}</td>
                  <td className="px-4 py-2">{txn.caseId?.p_id}</td>
                  <td className="px-4 py-2">₹{txn.amount}</td>
                  <td className="px-4 py-2">
                    {new Date(txn.createdAt).toLocaleDateString("en-IN")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <Link
          to="/admin/txnList"
          className="mt-4 inline-block text-sm text-pink-400 hover:underline"
        >
          → View All Transactions
        </Link>
      </div>
    </div>
  );
};

export default NeonDashboard;
