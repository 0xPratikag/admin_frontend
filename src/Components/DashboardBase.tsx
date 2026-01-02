import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Briefcase,
  FileText,
  CreditCard,
  Users2,
  TrendingUp,
  PieChart as PieChartIcon,
  MoreHorizontal,
  RefreshCcw,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  Area,
  AreaChart,
  CartesianGrid,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const NeonDashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);

  const fetchDashboard = async () => {
    try {
      setLoading(true);
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/dashboard`,
        {
          headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
        }
      );
      setData(res.data);
    } catch (err) {
      console.error("Error fetching dashboard:", err);
      setData(null);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const todayLabel = useMemo(() => {
    const d = new Date();
    return new Intl.DateTimeFormat("en-IN", {
      weekday: "short",
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(d);
  }, []);

  const fmtINR = (n) =>
    `₹${new Intl.NumberFormat("en-IN").format(Number(n || 0))}`;

  // Charts
  const revenueData = useMemo(() => {
    const arr = data?.revenueStats || [];
    // Keep same order as API; if you want chronological sorting, sort by year+month here.
    return arr.map((r) => ({
      label: `${r?._id?.month}/${r?._id?.year}`,
      total: Number(r?.total || 0),
    }));
  }, [data]);

  const billData = useMemo(() => {
    const bills = data?.bills || { paid: 0, partial: 0, pending: 0 };
    const slices = [
      { name: "Paid", value: Number(bills.paid || 0), color: "#10b981" }, // emerald
      { name: "Partial", value: Number(bills.partial || 0), color: "#f59e0b" }, // amber
      { name: "Pending", value: Number(bills.pending || 0), color: "#ef4444" }, // red
    ];
    return slices.filter((s) => s.value > 0);
  }, [data]);

  const recentTransactions = useMemo(() => {
    return (data?.recentTransactions || []).slice(0, 6);
  }, [data]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-50">
        <div className="grid min-h-screen place-items-center px-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-900">
              Loading dashboard…
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Fetching the latest stats
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="min-h-screen w-full bg-slate-50">
        <div className="grid min-h-screen place-items-center px-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-rose-600">
              Failed to load data
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Please check your connection or token and try again.
            </p>
            <button
              onClick={fetchDashboard}
              className="mt-4 inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-2 text-xs font-semibold text-white shadow-md shadow-indigo-300/40 hover:bg-indigo-700"
            >
              <RefreshCcw className="h-4 w-4" />
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  const cards = [
    {
      title: "Total Cases",
      value: String(data.totalCases ?? 0),
      sub: "All cases in system",
      icon: <Briefcase className="h-4 w-4" />,
      chip: "Cases",
      chipColor: "bg-fuchsia-50 text-fuchsia-700",
      link: "/admin/view-cases",
    },
    {
      title: "Total Bills",
      value: String(data.totalBills ?? 0),
      sub: "Generated bills",
      icon: <FileText className="h-4 w-4" />,
      chip: "Billing",
      chipColor: "bg-sky-50 text-sky-700",
      link: "/admin/view-bill",
    },
    {
      title: "Revenue",
      value: fmtINR(data.totalRevenue),
      sub: "Collected revenue",
      icon: <CreditCard className="h-4 w-4" />,
      chip: "INR",
      chipColor: "bg-emerald-50 text-emerald-700",
      link: "/admin/txnList",
    },
    {
      title: "Paid Bills",
      value: String(data?.bills?.paid ?? 0),
      sub: "Paid status count",
      icon: <Users2 className="h-4 w-4" />,
      chip: "Paid",
      chipColor: "bg-indigo-50 text-indigo-700",
      link: "/admin/view-bill",
    },
  ];

  return (
    <div className="min-h-screen w-full bg-slate-50">
      {/* top bar / header */}
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
              Admin Dashboard
            </p>
            <h1 className="text-xl font-bold text-slate-900">Overview</h1>
            <p className="text-xs text-slate-500">
              Summary of cases, billing & revenue
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:bg-slate-50">
              Today: <span className="font-semibold">{todayLabel}</span>
            </button>
            <button
              onClick={fetchDashboard}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-1.5 font-semibold text-white shadow-md shadow-indigo-300/40 hover:bg-indigo-700"
            >
              <RefreshCcw className="h-4 w-4" />
              Refresh
            </button>
          </div>
        </div>
      </div>

      {/* content */}
      <div className="mx-auto w-full space-y-5 px-4 pb-6 pt-5">
        {/* metric cards */}
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
          {cards.map((card, idx) => (
            <motion.div
              key={card.title}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: idx * 0.05 }}
              className="rounded-2xl border border-slate-200 bg-white shadow-sm"
            >
              <Link to={card.link} className="block p-4">
                <div className="mb-2 flex items-start justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <div className="grid h-8 w-8 place-items-center rounded-xl bg-slate-900/5 text-slate-700">
                      {card.icon}
                    </div>
                    <div>
                      <p className="text-[11px] font-medium uppercase tracking-wide text-slate-500">
                        {card.title}
                      </p>
                    </div>
                  </div>

                  <span
                    className={`rounded-full px-2 py-0.5 text-[10px] font-medium ${card.chipColor}`}
                  >
                    {card.chip}
                  </span>
                </div>

                <div className="flex items-baseline gap-2">
                  <span className="text-2xl font-bold text-slate-900">
                    {card.value}
                  </span>
                </div>

                <p className="mt-1 text-[11px] text-slate-500">{card.sub}</p>

                <span className="mt-3 inline-block text-[11px] font-semibold text-indigo-600">
                  View details →
                </span>
              </Link>
            </motion.div>
          ))}
        </div>

        {/* charts + lists */}
        <div className="grid gap-4 lg:grid-cols-2">
          {/* Revenue trend (matches BranchOverview card style) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.15 }}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <TrendingUp className="h-4 w-4 text-indigo-600" />
                  Revenue Trends
                </p>
                <p className="text-[11px] text-slate-500">
                  Revenue totals by month
                </p>
              </div>
              <Link
                to="/admin/txnList"
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
              >
                View transactions
              </Link>
            </div>

            <div className="h-52">
              {revenueData.length === 0 ? (
                <div className="grid h-full place-items-center rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500">
                    No revenue stats available
                  </p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={revenueData}
                    margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient
                        id="colorRevenue"
                        x1="0"
                        y1="0"
                        x2="0"
                        y2="1"
                      >
                        <stop
                          offset="5%"
                          stopColor="#4f46e5"
                          stopOpacity={0.45}
                        />
                        <stop
                          offset="95%"
                          stopColor="#4f46e5"
                          stopOpacity={0}
                        />
                      </linearGradient>
                    </defs>
                    <CartesianGrid
                      strokeDasharray="3 3"
                      vertical={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      dataKey="label"
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <YAxis
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <Tooltip
                      formatter={(value) => [fmtINR(value), "Revenue"]}
                      contentStyle={{
                        borderRadius: 12,
                        borderColor: "#e2e8f0",
                        fontSize: 12,
                      }}
                    />
                    <Area
                      type="monotone"
                      dataKey="total"
                      stroke="#4f46e5"
                      strokeWidth={2}
                      fillOpacity={1}
                      fill="url(#colorRevenue)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          {/* Billing status + Recent tx (list style like BranchOverview) */}
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <PieChartIcon className="h-4 w-4 text-indigo-600" />
                  Billing Snapshot
                </p>
                <p className="text-[11px] text-slate-500">
                  Paid / Partial / Pending overview
                </p>
              </div>
              <Link
                to="/admin/view-bill"
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
              >
                View bills
              </Link>
            </div>

            <div className="grid gap-3 sm:grid-cols-2">
              <div className="h-44 rounded-xl border border-slate-100 bg-slate-50/50 p-2">
                {billData.length === 0 ? (
                  <div className="grid h-full place-items-center">
                    <p className="text-xs text-slate-500">
                      No billing breakdown
                    </p>
                  </div>
                ) : (
                  <ResponsiveContainer width="100%" height="100%">
                    <PieChart>
                      <Pie
                        data={billData}
                        dataKey="value"
                        nameKey="name"
                        cx="50%"
                        cy="50%"
                        outerRadius={60}
                        labelLine={false}
                        label={({ name, percent }) =>
                          `${name} ${(percent * 100).toFixed(0)}%`
                        }
                      >
                        {billData.map((entry, index) => (
                          <Cell key={`cell-${index}`} fill={entry.color} />
                        ))}
                      </Pie>
                      <Tooltip />
                    </PieChart>
                  </ResponsiveContainer>
                )}
              </div>

              <div className="rounded-xl border border-slate-100 bg-white p-3">
                <p className="text-[11px] font-semibold uppercase tracking-wide text-slate-500">
                  Recent Transactions
                </p>
                <ul className="mt-2 divide-y divide-slate-100 text-sm">
                  {recentTransactions.length === 0 ? (
                    <li className="py-3 text-xs text-slate-500">
                      No recent transactions
                    </li>
                  ) : (
                    recentTransactions.map((txn) => {
                      const patient = txn?.caseId?.patient_name || "Unknown";
                      const caseId = txn?.caseId?.p_id || "—";
                      const amount = txn?.amount ?? 0;
                      const createdAt = txn?.createdAt
                        ? new Date(txn.createdAt).toLocaleDateString("en-IN")
                        : "—";

                      return (
                        <li
                          key={txn._id}
                          className="flex items-center justify-between py-2.5"
                        >
                          <div className="flex items-center gap-3">
                            <div className="grid h-9 w-9 place-items-center rounded-full bg-indigo-50 text-[13px] font-semibold text-indigo-700">
                              {(patient?.[0] || "U").toUpperCase()}
                            </div>
                            <div>
                              <p className="text-sm font-medium text-slate-900">
                                {patient}
                              </p>
                              <p className="text-[11px] text-slate-500">
                                Case ID:{" "}
                                <span className="font-mono">{caseId}</span> ·{" "}
                                {fmtINR(amount)}
                              </p>
                            </div>
                          </div>

                          <div className="flex items-center gap-3">
                            <span className="text-xs font-medium text-slate-600">
                              {createdAt}
                            </span>
                            <button
                              type="button"
                              className="rounded-full border border-slate-200 bg-slate-50 p-1.5 text-slate-500 hover:bg-slate-100"
                              title="More"
                            >
                              <MoreHorizontal className="h-4 w-4" />
                            </button>
                          </div>
                        </li>
                      );
                    })
                  )}
                </ul>

                <Link
                  to="/admin/txnList"
                  className="mt-3 inline-block text-[11px] font-semibold text-indigo-600 hover:underline"
                >
                  View all transactions →
                </Link>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      
    </div>
  );
};

export default NeonDashboard;
