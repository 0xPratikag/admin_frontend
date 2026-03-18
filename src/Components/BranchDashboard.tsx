import React, { useEffect, useMemo, useState } from "react";
import axios from "axios";
import { Link } from "react-router-dom";
import {
  Briefcase,
  Stethoscope,
  RefreshCcw,
  TrendingUp,
  PieChart as PieChartIcon,
} from "lucide-react";
import { motion } from "framer-motion";
import {
  ResponsiveContainer,
  CartesianGrid,
  Tooltip,
  XAxis,
  YAxis,
  AreaChart,
  Area,
  BarChart,
  Bar,
  PieChart,
  Pie,
  Cell,
} from "recharts";

const BranchDashboard = () => {
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  const [summary, setSummary] = useState(null);
  const [casesTrend, setCasesTrend] = useState([]);
  const [therapyDistribution, setTherapyDistribution] = useState({
    byTherapyAndType: [],
    totalsByTherapy: [],
  });

  const token = localStorage.getItem("token");
  const API_BASE = import.meta.env.VITE_API_BASE_URL;

  const axiosConfig = useMemo(
    () => ({
      headers: {
        Authorization: `Bearer ${token}`,
      },
    }),
    [token]
  );

  const getCurrentMonthRange = () => {
    const now = new Date();
    const from = new Date(now.getFullYear(), now.getMonth(), 1);
    const to = new Date(now.getFullYear(), now.getMonth() + 1, 0);

    const format = (d) => {
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, "0");
      const day = String(d.getDate()).padStart(2, "0");
      return `${y}-${m}-${day}`;
    };

    return {
      from: format(from),
      to: format(to),
    };
  };

  const fetchDashboard = async ({ silent = false } = {}) => {
    try {
      if (silent) {
        setRefreshing(true);
      } else {
        setLoading(true);
      }

      const { from, to } = getCurrentMonthRange();

      const [summaryRes, casesTrendRes, therapyRes] = await Promise.all([
        axios.get(`${API_BASE}/reports/dashboard-summary`, axiosConfig),
        axios.get(
          `${API_BASE}/reports/cases-trend?from=${from}&to=${to}`,
          axiosConfig
        ),
        axios.get(`${API_BASE}/reports/therapy-distribution`, axiosConfig),
      ]);

      setSummary(summaryRes?.data?.data || null);
      setCasesTrend(casesTrendRes?.data?.data?.trend || []);
      setTherapyDistribution(
        therapyRes?.data?.data || {
          byTherapyAndType: [],
          totalsByTherapy: [],
        }
      );
    } catch (error) {
      console.error("Dashboard fetch error:", error);
      setSummary(null);
      setCasesTrend([]);
      setTherapyDistribution({
        byTherapyAndType: [],
        totalsByTherapy: [],
      });
    } finally {
      setLoading(false);
      setRefreshing(false);
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

  const cards = useMemo(() => {
    return [
      {
        title: "Total Cases",
        value: summary?.cases?.total ?? 0,
        sub: `${summary?.cases?.newThisMonth ?? 0} new this month`,
        icon: <Briefcase className="h-4 w-4" />,
        chip: "Cases",
        chipColor: "bg-fuchsia-50 text-fuchsia-700",
        link: "/admin/view-cases",
      },
      {
        title: "Top Therapy Count",
        value: summary?.topTherapies?.[0]?.count ?? 0,
        sub: summary?.topTherapies?.[0]?.therapy_name || "No therapy data",
        icon: <Stethoscope className="h-4 w-4" />,
        chip: "Therapy",
        chipColor: "bg-indigo-50 text-indigo-700",
        // link: "/admin/therapy-catalog",
      },
    ];
  }, [summary]);

  const caseStatusData = useMemo(() => {
    if (!summary?.cases) return [];
    return [
      {
        name: "Open",
        value: Number(summary.cases.open || 0),
        color: "#3b82f6",
      },
      {
        name: "In Progress",
        value: Number(summary.cases.inProgress || 0),
        color: "#f59e0b",
      },
      {
        name: "Closed",
        value: Number(summary.cases.closed || 0),
        color: "#10b981",
      },
    ].filter((item) => item.value > 0);
  }, [summary]);

  const topTherapyChartData = useMemo(() => {
    return (summary?.topTherapies || []).map((item) => ({
      name: item.therapy_name,
      count: item.count,
    }));
  }, [summary]);

  if (loading) {
    return (
      <div className="min-h-screen w-full bg-slate-50">
        <div className="grid min-h-screen place-items-center px-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-slate-900">
              Loading branch dashboard…
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Fetching summary and reports
            </p>
          </div>
        </div>
      </div>
    );
  }

  if (!summary) {
    return (
      <div className="min-h-screen w-full bg-slate-50">
        <div className="grid min-h-screen place-items-center px-4">
          <div className="rounded-2xl border border-slate-200 bg-white p-6 text-center shadow-sm">
            <p className="text-sm font-semibold text-rose-600">
              Failed to load dashboard
            </p>
            <p className="mt-1 text-xs text-slate-500">
              Please check token, API URL, or branch access.
            </p>
            <button
              onClick={() => fetchDashboard()}
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

  return (
    <div className="min-h-screen w-full bg-slate-50">
      <div className="border-b border-slate-200 bg-white/80 backdrop-blur">
        <div className="mx-auto flex w-full items-center justify-between px-4 py-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.18em] text-indigo-500">
              Branch Dashboard
            </p>
            <h1 className="text-xl font-bold text-slate-900">Overview</h1>
            <p className="text-xs text-slate-500">
              Cases and therapy reports
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2 text-xs">
            <button className="rounded-full border border-slate-200 bg-white px-3 py-1.5 text-slate-600 hover:bg-slate-50">
              Today: <span className="font-semibold">{todayLabel}</span>
            </button>

            <button
              onClick={() => fetchDashboard({ silent: true })}
              className="inline-flex items-center gap-2 rounded-full bg-indigo-600 px-4 py-1.5 font-semibold text-white shadow-md shadow-indigo-300/40 hover:bg-indigo-700"
            >
              <RefreshCcw
                className={`h-4 w-4 ${refreshing ? "animate-spin" : ""}`}
              />
              Refresh
            </button>
          </div>
        </div>
      </div>

      <div className="mx-auto w-full space-y-5 px-4 pb-6 pt-5">
        <div className="grid gap-4 md:grid-cols-2">
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

        <div className="grid gap-4 lg:grid-cols-2">
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
                  Cases Trend
                </p>
                <p className="text-[11px] text-slate-500">
                  New cases in current month
                </p>
              </div>
              <Link
                to="/admin/view-cases"
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
              >
                View cases
              </Link>
            </div>

            <div className="h-56">
              {casesTrend.length === 0 ? (
                <div className="grid h-full place-items-center rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500">No case trend available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart
                    data={casesTrend}
                    margin={{ left: 0, right: 8, top: 8, bottom: 0 }}
                  >
                    <defs>
                      <linearGradient id="colorCases" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#4f46e5" stopOpacity={0.45} />
                        <stop offset="95%" stopColor="#4f46e5" stopOpacity={0} />
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
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <Tooltip
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
                      fill="url(#colorCases)"
                    />
                  </AreaChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

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
                  Case Status Snapshot
                </p>
                <p className="text-[11px] text-slate-500">
                  Open / In Progress / Closed
                </p>
              </div>
              <Link
                to="/admin/view-cases"
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
              >
                Manage cases
              </Link>
            </div>

            <div className="h-56">
              {caseStatusData.length === 0 ? (
                <div className="grid h-full place-items-center rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500">No case status data</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <PieChart>
                    <Pie
                      data={caseStatusData}
                      dataKey="value"
                      nameKey="name"
                      cx="50%"
                      cy="50%"
                      outerRadius={80}
                      labelLine={false}
                      label={({ name, percent }) =>
                        `${name} ${(percent * 100).toFixed(0)}%`
                      }
                    >
                      {caseStatusData.map((entry, index) => (
                        <Cell key={index} fill={entry.color} />
                      ))}
                    </Pie>
                    <Tooltip />
                  </PieChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>
        </div>

        <div className="grid gap-4 lg:grid-cols-2">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.25 }}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <div className="mb-3 flex items-center justify-between">
              <div>
                <p className="flex items-center gap-2 text-xs font-semibold text-slate-700">
                  <Stethoscope className="h-4 w-4 text-indigo-600" />
                  Top Therapies
                </p>
                <p className="text-[11px] text-slate-500">
                  Most used active therapy items
                </p>
              </div>
              <Link
                to="/admin/therapy-catalog"
                className="rounded-full border border-slate-200 bg-slate-50 px-2 py-1 text-[11px] text-slate-600 hover:bg-slate-100"
              >
                Therapy catalog
              </Link>
            </div>

            <div className="h-60">
              {topTherapyChartData.length === 0 ? (
                <div className="grid h-full place-items-center rounded-xl border border-dashed border-slate-200">
                  <p className="text-xs text-slate-500">No therapy data available</p>
                </div>
              ) : (
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={topTherapyChartData} layout="vertical">
                    <CartesianGrid
                      strokeDasharray="3 3"
                      horizontal={false}
                      stroke="#e2e8f0"
                    />
                    <XAxis
                      type="number"
                      allowDecimals={false}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <YAxis
                      type="category"
                      dataKey="name"
                      width={120}
                      tickLine={false}
                      axisLine={false}
                      tick={{ fontSize: 11, fill: "#64748b" }}
                    />
                    <Tooltip />
                    <Bar dataKey="count" fill="#6366f1" radius={[0, 6, 6, 0]} />
                  </BarChart>
                </ResponsiveContainer>
              )}
            </div>
          </motion.div>

          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.3 }}
            className="rounded-2xl border border-slate-200 bg-white p-4 shadow-sm"
          >
            <p className="text-xs font-semibold text-slate-700">
              Therapy Distribution
            </p>
            <p className="mb-3 text-[11px] text-slate-500">
              Totals by therapy from active case items
            </p>

            <div className="space-y-3">
              {(therapyDistribution?.totalsByTherapy || []).length === 0 ? (
                <div className="rounded-xl border border-dashed border-slate-200 p-8 text-center text-xs text-slate-500">
                  No therapy distribution found
                </div>
              ) : (
                therapyDistribution.totalsByTherapy.map((item) => (
                  <div key={item.therapy_name}>
                    <div className="mb-1 flex items-center justify-between text-sm">
                      <span className="font-medium text-slate-800">
                        {item.therapy_name}
                      </span>
                      <span className="text-slate-500">{item.count}</span>
                    </div>
                    <div className="h-2 w-full overflow-hidden rounded-full bg-slate-100">
                      <div
                        className="h-full rounded-full bg-indigo-500"
                        style={{
                          width: `${
                            therapyDistribution.totalsByTherapy[0]?.count
                              ? (item.count /
                                  therapyDistribution.totalsByTherapy[0].count) *
                                100
                              : 0
                          }%`,
                        }}
                      />
                    </div>
                  </div>
                ))
              )}
            </div>
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default BranchDashboard;