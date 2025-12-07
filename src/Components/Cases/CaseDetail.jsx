// src/pages/CaseDetail.jsx
import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ShieldAlert } from "lucide-react";
import { toast } from "react-hot-toast";

const CaseDetail = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);

  // ---- bill state (single bill per case) ----
  const [bill, setBill] = useState(null);
  const [billLoading, setBillLoading] = useState(true);
  const [billError, setBillError] = useState("");

  const api = useMemo(
    () =>
      axios.create({
        baseURL: import.meta.env.VITE_API_BASE_URL,
        headers: { Authorization: `Bearer ${localStorage.getItem("token")}` },
      }),
    []
  );

  const fetchCaseDetail = async () => {
    setLoading(true);
    setErrorState(null);
    try {
      // 🔁 controller: GET /api/branch/cases/:id
      const res = await api.get(`/view-case/${caseId}`);
      setCaseData(res.data || null);
    } catch (error) {
      console.error("Error fetching case details:", error);
      const status = error?.response?.status;
      const apiMsg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Unable to fetch case details.";

      const friendly =
        status === 403
          ? "You don’t have permission to view this case. Please contact your administrator."
          : status === 404
          ? "This case could not be found. It may have been deleted or you may not have access."
          : "Something went wrong while loading this case.";

      setErrorState({
        status: status || "NETWORK",
        message: apiMsg,
        friendly,
      });

      toast.error(apiMsg, {
        id: "case-detail-error",
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBill = async () => {
    setBillLoading(true);
    setBillError("");
    try {
      const res = await api.get(`/cases/${caseId}/bill`);
      setBill(res.data || null);
    } catch (error) {
      if (error?.response?.status === 404) {
        setBill(null); // no bill yet for this case
      } else {
        console.error("Error fetching bill:", error);
        const msg =
          error?.response?.data?.message ||
          error?.response?.data?.error ||
          "Unable to fetch bill.";
        setBillError(msg);
        toast.error(msg, { id: "bill-error" });
      }
    } finally {
      setBillLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseDetail();
    fetchBill();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  // Navigate to bill editor — existing page (PUT /cases/:caseId/bill)
  const handleGenerateOrEditBill = () => {
    navigate(`/admin/generate-bill`, { state: { caseData, existingBill: bill } });
  };

  // Edit case
  const handleEdit = () => {
    navigate(`/admin/edit-case/${caseId}`);
  };

  // ---- helpers ----
  const formatDate = (iso) => {
    if (!iso) return "N/A";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? "N/A"
      : d.toLocaleDateString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
        });
  };

  const formatDateTime = (iso) => {
    if (!iso) return "N/A";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? "N/A"
      : d.toLocaleString("en-IN", {
          day: "2-digit",
          month: "short",
          year: "numeric",
          hour: "2-digit",
          minute: "2-digit",
        });
  };

  const fmtMins = (n) => (Number.isFinite(Number(n)) ? `${Number(n)} min` : "—");

  const inr = (n) =>
    new Intl.NumberFormat("en-IN", {
      style: "currency",
      currency: "INR",
    }).format(Number(n || 0));

  const Chip = ({ children, variant = "gray" }) => {
    const map = {
      gray: "bg-gray-100 text-gray-800",
      indigo: "bg-indigo-50 text-indigo-700",
      slate: "bg-slate-100 text-slate-800",
      amber: "bg-amber-50 text-amber-700",
      green: "bg-green-50 text-green-700",
      red: "bg-red-50 text-red-700",
      purple: "bg-purple-50 text-purple-700",
    };
    return (
      <span className={`inline-block px-2 py-1 text-xs rounded ${map[variant] || map.gray}`}>
        {children}
      </span>
    );
  };

  const Label = ({ children }) => (
    <span className="text-xs uppercase tracking-wide text-gray-500">{children}</span>
  );

  const copyText = async (t) => {
    try {
      await navigator.clipboard.writeText(String(t || ""));
      toast.success("Copied to clipboard");
    } catch (e) {
      console.warn("Clipboard not available:", e);
      toast.error("Unable to copy");
    }
  };

  // ---- payments ----
  const refreshAfterPayment = async () => {
    await fetchBill();
  };

  const handleOfflinePayment = async () => {
    if (!bill?._id) return;
    const rawAmount = window.prompt("Enter amount received (INR):", "");
    if (!rawAmount) return;
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }
    const provider = window.prompt("Provider / Notes (e.g., Cash, Bank, Ref):", "Cash") || "Cash";
    try {
      const { data } = await api.post(`/bills/${bill._id}/payments/offline`, {
        amount,
        provider,
        notes: `Recorded from CaseDetail`,
      });
      if (data?.billing) setBill(data.billing);
      await refreshAfterPayment();
      toast.success("Payment recorded successfully.");
    } catch (error) {
      console.error("Offline payment error:", error);
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        "Failed to record payment.";
      toast.error(msg);
    }
  };

  // Dynamically load Razorpay if needed
  const loadRzp = () =>
    new Promise((resolve, reject) => {
      if (window.Razorpay) return resolve(true);
      const s = document.createElement("script");
      s.src = "https://checkout.razorpay.com/v1/checkout.js";
      s.onload = () => resolve(true);
      s.onerror = () => reject(new Error("Failed to load Razorpay"));
      document.body.appendChild(s);
    });

  const handleOnlinePayment = async () => {
    if (!bill?._id) return;
    const rawAmount = window.prompt("Enter amount to pay online (INR):", "");
    if (!rawAmount) return;
    const amount = Number(rawAmount);
    if (!Number.isFinite(amount) || amount <= 0) {
      alert("Please enter a valid amount.");
      return;
    }

    try {
      // 1) initiate
      const initRes = await api.post(`/bills/${bill._id}/payments/online/initiate`, { amount });
      const { orderId, currency, amount: amtPaise } = initRes.data || {};
      if (!orderId) throw new Error("Failed to initiate order");

      // 2) ensure Razorpay SDK
      await loadRzp();

      // 3) open checkout
      const rzp = new window.Razorpay({
        key: import.meta.env.VITE_RAZORPAY_KEY_ID,
        amount: amtPaise,
        currency: currency || "INR",
        name: "India Therapy Centre",
        description: `Payment for Bill ${bill._id}`,
        order_id: orderId,
        prefill: {
          name: caseData?.patient_name || "Patient",
          contact: caseData?.patient_phone || "",
        },
        handler: async (response) => {
          try {
            await api.post(`/bills/${bill._id}/payments/online/verify`, {
              razorpay_order_id: response.razorpay_order_id,
              razorpay_payment_id: response.razorpay_payment_id,
              razorpay_signature: response.razorpay_signature,
              amount,
              provider: "razorpay",
              notes: "Online payment via CaseDetail",
            });
            await refreshAfterPayment();
            toast.success("Payment successful!");
          } catch (err) {
            console.error("Verify error:", err);
            const msg =
              err?.response?.data?.error ||
              err?.response?.data?.message ||
              "Payment verification failed.";
            toast.error(msg);
          }
        },
        modal: { ondismiss: () => {} },
        theme: { color: "#4f46e5" },
      });

      rzp.open();
    } catch (error) {
      console.error("Online payment error:", error);
      const msg =
        error?.response?.data?.error ||
        error?.response?.data?.message ||
        error?.message ||
        "Failed to start online payment.";
      toast.error(msg);
    }
  };

  // ---- early exits (NO HOOKS AFTER THIS LINE) ----
  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white shadow-md rounded-xl px-6 py-4 text-sm text-gray-700">
          Loading case details...
        </div>
      </div>
    );
  }

  if (errorState) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
        <div className="max-w-md w-full bg-white border border-red-100 shadow-2xl rounded-2xl p-6 space-y-4">
          <div className="flex items-start gap-3">
            <div className="mt-1">
              <ShieldAlert className="w-9 h-9 text-red-500" />
            </div>
            <div className="space-y-1">
              <p className="text-sm font-semibold text-red-600">
                {errorState.friendly}
              </p>
              <p className="text-xs text-gray-600">
                <span className="font-medium text-gray-700">Server says:</span>{" "}
                {errorState.message}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">
                HTTP Status:{" "}
                <span className="font-semibold">{errorState.status}</span>
              </p>
            </div>
          </div>

          <div className="flex justify-end gap-3 pt-2">
            <button
              onClick={() => navigate(-1)}
              className="px-4 py-2 rounded-lg border border-gray-200 text-xs font-medium text-gray-700 hover:bg-gray-50"
            >
              ← Go Back
            </button>
            <button
              onClick={() => {
                setErrorState(null);
                fetchCaseDetail();
              }}
              className="px-4 py-2 rounded-lg bg-red-600 text-xs font-semibold text-white hover:bg-red-700 shadow-sm"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  if (!caseData) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white shadow-md rounded-xl px-6 py-4 text-sm text-red-600">
          Case not found.
        </div>
      </div>
    );
  }

  // Safe destructure after guards
  const {
    _id,
    branchId,
    created_by,
    assigned_to,
    p_id,
    patient_name,
    patient_phone,
    patient_phone_alt,
    gender,
    dob,
    age,
    joining_date,
    grant_app_access,
    case_type,
    status,
    description,
    total_cost,
    therapies = [],
    conditions = [],
    programs = [],
    referral_type,
    referral_name,
    address = {},
    other_details = {},
    selected_therapies = [],
    therapy_plan = [],
    createdAt,
    updatedAt,
  } = caseData;

  const {
    father = { name: "", occupation: "" },
    mother = { name: "", occupation: "" },
    husband = { name: "", occupation: "" },
    spouse = { name: "", occupation: "" },
    additional_info = "",
  } = other_details || {};

  // Plain derived map (not a hook) to avoid hook-order issues
  const therapyNameById = (() => {
    const m = {};
    (therapy_plan || []).forEach((t) => {
      if (t?.therapyId) m[String(t.therapyId)] = t?.therapy_name || "Therapy";
    });
    return m;
  })();

  const remaining =
    bill && typeof bill.total_amount === "number"
      ? Math.max(0, Number(bill.total_amount) - Number(bill.paid_amount || 0))
      : 0;

  const paymentChipVariant =
    bill?.payment_status === "paid"
      ? "green"
      : bill?.payment_status === "partial"
      ? "amber"
      : bill?.payment_status === "pending"
      ? "slate"
      : "gray";

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-purple-100 py-10 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto bg-white shadow-2xl rounded-xl p-8 md:p-10 border border-indigo-100">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-extrabold text-indigo-800">
              📝 Case Details
            </h2>
            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Label>P.ID</Label>
                <Chip variant="indigo">{p_id || "N/A"}</Chip>
                {p_id && (
                  <button
                    onClick={() => copyText(p_id)}
                    className="text-xs text-indigo-600 hover:underline"
                    title="Copy P.ID"
                  >
                    Copy
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Label>Case ID</Label>
                <Chip variant="gray">{_id}</Chip>
                {_id && (
                  <button
                    onClick={() => copyText(_id)}
                    className="text-xs text-indigo-600 hover:underline"
                    title="Copy Case ID"
                  >
                    Copy
                  </button>
                )}
              </div>
              <div className="flex items-center gap-2">
                <Label>Status</Label>
                <Chip variant="slate" title="Case status">
                  {status || "open"}
                </Chip>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={handleEdit}
              className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow text-sm font-semibold"
            >
              ✏️ Edit Case
            </button>
            <button
              onClick={handleGenerateOrEditBill}
              className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow text-sm font-semibold"
              title={bill ? "Edit Bill" : "Create Bill"}
            >
              {bill ? "✏️ Edit Bill" : "➕ Create Bill"}
            </button>
          </div>
        </div>

        {/* Meta / Ownership */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mb-8 text-sm">
          <div className="bg-indigo-50 p-3 rounded">
            <Label>Branch</Label>
            <p className="mt-1 break-all">{branchId || "—"}</p>
          </div>
          <div className="bg-indigo-50 p-3 rounded">
            <Label>Created By</Label>
            <p className="mt-1 break-all">{created_by || "—"}</p>
          </div>
          <div className="bg-indigo-50 p-3 rounded">
            <Label>Assigned To (Therapist)</Label>
            <p className="mt-1 break-all">{assigned_to || "—"}</p>
          </div>
        </div>

        {/* Patient + Contact */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-gray-800">
          <div className="bg-indigo-50 p-4 rounded-md shadow-sm">
            <Label>Patient Name</Label>
            <p className="font-semibold text-lg mt-1">{patient_name || "N/A"}</p>
          </div>
          <div className="bg-indigo-50 p-4 rounded-md shadow-sm">
            <Label>Gender</Label>
            <p className="font-medium text-base mt-1">{gender || "N/A"}</p>
          </div>

          <div className="bg-purple-50 p-4 rounded-md shadow-sm">
            <Label>Primary Phone</Label>
            <p className="font-medium text-base mt-1">{patient_phone || "N/A"}</p>
            {patient_phone_alt ? (
              <p className="text-sm text-gray-600 mt-1">Alt: {patient_phone_alt}</p>
            ) : null}
          </div>
          <div className="bg-purple-50 p-4 rounded-md shadow-sm">
            <Label>Case Type</Label>
            <p className="font-medium text-base mt-1">{case_type || "—"}</p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-md shadow-sm">
            <Label>Date of Birth</Label>
            <p className="font-medium text-base mt-1">{formatDate(dob)}</p>
            {Number.isFinite(Number(age)) ? (
              <p className="text-xs text-gray-600 mt-1">Age: {age}</p>
            ) : null}
          </div>
          <div className="bg-yellow-50 p-4 rounded-md shadow-sm">
            <Label>Joining Date</Label>
            <p className="font-medium text-base mt-1">{formatDate(joining_date)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-md shadow-sm">
            <Label>Total Cost (legacy)</Label>
            <p className="font-medium text-base mt-1">₹ {Number(total_cost || 0)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-md shadow-sm">
            <Label>App Access</Label>
            <p className="font-medium text-base mt-1">
              {grant_app_access ? "Granted" : "Not granted"}
            </p>
          </div>

          <div className="bg-green-50 p-4 rounded-md shadow-sm">
            <Label>Created At</Label>
            <p className="font-medium text-base mt-1">{formatDateTime(createdAt)}</p>
          </div>
          <div className="bg-green-50 p-4 rounded-md shadow-sm">
            <Label>Updated At</Label>
            <p className="font-medium text-base mt-1">{formatDateTime(updatedAt)}</p>
          </div>

          {/* Description */}
          <div className="md:col-span-2 bg-indigo-50 p-4 rounded-md shadow-sm">
            <Label>Description</Label>
            <p className="font-medium text-base mt-1">
              {description?.trim() ? description : "No description provided."}
            </p>
          </div>

          {/* Address */}
          <div className="md:col-span-2 bg-slate-50 p-4 rounded-md shadow-sm">
            <Label>Address</Label>
            <div className="mt-1">
              <p className="text-gray-800">
                {[address.line1, address.line2].filter(Boolean).join(", ") || "—"}
              </p>
              <p className="text-gray-600">
                {[address.city, address.state, address.country].filter(Boolean).join(", ") ||
                  ""}
              </p>
              {address.pincode ? (
                <p className="text-gray-600">Pincode: {address.pincode}</p>
              ) : null}
            </div>
          </div>

          {/* Programs & Referral */}
          <div className="bg-blue-50 p-4 rounded-md shadow-sm">
            <Label>Programs</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {(programs || []).length ? (
                programs.map((p, i) => (
                  <span
                    key={`${p}-${i}`}
                    className="text-xs px-2 py-1 rounded-full bg-white border border-blue-200 text-blue-800"
                  >
                    {p}
                  </span>
                ))
              ) : (
                <span className="text-gray-500">—</span>
              )}
            </div>
          </div>
          <div className="bg-blue-50 p-4 rounded-md shadow-sm">
            <Label>Referral</Label>
            <p className="font-medium text-base mt-1">
              {referral_type || referral_name
                ? `${referral_type || "—"} ${
                    referral_name ? `· ${referral_name}` : ""
                  }`
                : "—"}
            </p>
          </div>

          {/* Therapies & Conditions (legacy tags) */}
          <div className="bg-purple-100 p-4 rounded-md shadow-sm">
            <p className="text-sm text-gray-500 mb-1 font-semibold">
              🩺 Therapy Tags (legacy)
            </p>
            <div className="flex flex-wrap gap-2">
              {(therapies || []).length ? (
                therapies.map((t, i) => (
                  <span
                    key={`${t}-${i}`}
                    className="text-xs px-2 py-1 rounded-full bg-white border border-purple-200 text-purple-800"
                  >
                    {t}
                  </span>
                ))
              ) : (
                <span className="text-gray-500">—</span>
              )}
            </div>
          </div>

          <div className="bg-purple-100 p-4 rounded-md shadow-sm">
            <p className="text-sm text-gray-500 mb-1 font-semibold">⚕️ Conditions</p>
            <div className="flex flex-wrap gap-2">
              {(conditions || []).length ? (
                conditions.map((c, i) => (
                  <span
                    key={`${c}-${i}`}
                    className="text-xs px-2 py-1 rounded-full bg-white border border-purple-200 text-purple-800"
                  >
                    {c}
                  </span>
                ))
              ) : (
                <span className="text-gray-500">—</span>
              )}
            </div>
          </div>

          {/* Family / Other Details */}
          <div className="md:col-span-2 bg-green-100 p-4 rounded-md shadow-sm">
            <p className="text-sm text-gray-500 mb-2 font-semibold">
              👨‍👩‍👧 Family Details & Additional Info
            </p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
              {[
                ["Father", father],
                ["Mother", mother],
                ["Husband", husband],
                ["Spouse", spouse],
              ].map(([title, person]) => (
                <div key={title} className="bg-white rounded-md p-3 border border-green-200">
                  <Label>{title}</Label>
                  <p className="mt-1">
                    <strong>{person?.name || "—"}</strong>
                    {person?.occupation ? ` (${person.occupation})` : ""}
                  </p>
                </div>
              ))}

              <div className="md:col-span-2 bg-white rounded-md p-3 border border-green-200">
                <Label>Additional Info</Label>
                <p className="mt-1">{additional_info || "N/A"}</p>
              </div>
            </div>
          </div>
        </div>

        {/* ===================== SELECTED THERAPIES (from snapshot) ===================== */}
        <div className="mt-8">
          <h3 className="text-xl font-bold text-indigo-800 mb-2">Selected Therapies</h3>
          <div className="flex flex-wrap gap-2">
            {(selected_therapies || []).length ? (
              selected_therapies.map((id, i) => (
                <Chip key={`${id}-${i}`} variant="purple">
                  {therapyNameById[String(id)] || String(id)}
                </Chip>
              ))
            ) : (
              <span className="text-sm text-gray-500">None</span>
            )}
          </div>
        </div>

        {/* ===================== THERAPY PLAN SNAPSHOT ===================== */}
        <div className="mt-8">
          <h3 className="text-2xl font-bold text-indigo-800 mb-3">
            🩺 Therapy Plan Snapshot
          </h3>

          {!therapy_plan?.length ? (
            <div className="text-sm text-gray-600">No therapy plan added.</div>
          ) : (
            <div className="space-y-6">
              {therapy_plan.map((blk, idx) => {
                const tid = String(blk?.therapyId || idx);
                const subList = Array.isArray(blk?.subTherapy) ? blk.subTherapy : [];
                const testsList = Array.isArray(blk?.tests) ? blk.tests : [];

                return (
                  <div
                    key={`${tid}-${idx}`}
                    className="border rounded-lg p-4 bg-white shadow-sm border-indigo-100"
                  >
                    {/* Block header */}
                    <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-2">
                      <div className="flex items-center gap-3">
                        <span className="font-semibold text-indigo-700 text-lg">
                          {blk?.therapy_name || "Therapy"}
                        </span>
                        <Chip variant="gray">{tid}</Chip>
                      </div>
                      <div className="flex flex-wrap items-center gap-2 text-xs text-gray-600">
                        <span>
                          <Label>Snapshot At</Label> {formatDateTime(blk?.snapshot_at)}
                        </span>
                        <span>•</span>
                        <span>
                          <Label>Created</Label> {formatDateTime(blk?.createdAt)}
                        </span>
                        <span>•</span>
                        <span>
                          <Label>Updated</Label> {formatDateTime(blk?.updatedAt)}
                        </span>
                      </div>
                    </div>

                    {/* Sub-therapies */}
                    <div className="mt-4">
                      <Label>Sub-Therapies</Label>
                      <div className="mt-2 overflow-x-auto">
                        <table className="min-w-full text-sm">
                          <thead>
                            <tr className="text-left text-gray-600 border-b">
                              <th className="py-2 pr-4">Name</th>
                              <th className="py-2 pr-4">Duration</th>
                              <th className="py-2 pr-4">Price / Session</th>
                              <th className="py-2 pr-4">Price / Package</th>
                              <th className="py-2 pr-4">Sessions/Package</th>
                              <th className="py-2 pr-4">Per Session?</th>
                              <th className="py-2 pr-4">Per Package?</th>
                              <th className="py-2 pr-4">Created</th>
                              <th className="py-2 pr-4">Updated</th>
                            </tr>
                          </thead>
                          <tbody>
                            {subList.length ? (
                              subList.map((s, i2) => (
                                <tr
                                  key={`${s?.subTherapyId || i2}`}
                                  className="border-b last:border-b-0"
                                >
                                  <td className="py-2 pr-4">{s?.name || "—"}</td>
                                  <td className="py-2 pr-4">
                                    {fmtMins(s?.duration_mins)}
                                  </td>
                                  <td className="py-2 pr-4">
                                    {inr(s?.price_per_session)}
                                  </td>
                                  <td className="py-2 pr-4">
                                    {inr(s?.price_per_package)}
                                  </td>
                                  <td className="py-2 pr-4">
                                    {Number.isFinite(
                                      Number(s?.default_sessions_per_package)
                                    )
                                      ? Number(s?.default_sessions_per_package)
                                      : "—"}
                                  </td>
                                  <td className="py-2 pr-4">
                                    {s?.flags?.pricePerSession ? (
                                      <Chip variant="green">Yes</Chip>
                                    ) : (
                                      <Chip>No</Chip>
                                    )}
                                  </td>
                                  <td className="py-2 pr-4">
                                    {s?.flags?.pricePerPackage ? (
                                      <Chip variant="green">Yes</Chip>
                                    ) : (
                                      <Chip>No</Chip>
                                    )}
                                  </td>
                                  <td className="py-2 pr-4">
                                    {formatDateTime(s?.createdAt)}
                                  </td>
                                  <td className="py-2 pr-4">
                                    {formatDateTime(s?.updatedAt)}
                                  </td>
                                </tr>
                              ))
                            ) : (
                              <tr>
                                <td className="py-3 text-gray-500" colSpan={9}>
                                  No sub-therapies selected.
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                    </div>

                    {/* Tests */}
                    <div className="mt-6">
                      <div className="flex items-center gap-2">
                        <Label>Tests</Label>
                        <Chip variant={blk?.therapyTestsEnabled ? "green" : "gray"}>
                          {blk?.therapyTestsEnabled ? "Enabled" : "Disabled"}
                        </Chip>
                      </div>

                      {blk?.therapyTestsEnabled ? (
                        <div className="mt-2 overflow-x-auto">
                          <table className="min-w-full text-sm">
                            <thead>
                              <tr className="text-left text-gray-600 border-b">
                                <th className="py-2 pr-4">Name</th>
                                <th className="py-2 pr-4">Duration</th>
                                <th className="py-2 pr-4">Price / Test</th>
                                <th className="py-2 pr-4">Created</th>
                                <th className="py-2 pr-4">Updated</th>
                              </tr>
                            </thead>
                            <tbody>
                              {testsList.length ? (
                                testsList.map((t, i3) => (
                                  <tr
                                    key={`${t?.testId || i3}`}
                                    className="border-b last:border-b-0"
                                  >
                                    <td className="py-2 pr-4">{t?.name || "—"}</td>
                                    <td className="py-2 pr-4">
                                      {fmtMins(t?.duration_mins)}
                                    </td>
                                    <td className="py-2 pr-4">
                                      {inr(t?.price_per_test)}
                                    </td>
                                    <td className="py-2 pr-4">
                                      {formatDateTime(t?.createdAt)}
                                    </td>
                                    <td className="py-2 pr-4">
                                      {formatDateTime(t?.updatedAt)}
                                    </td>
                                  </tr>
                                ))
                              ) : (
                                <tr>
                                  <td className="py-3 text-gray-500" colSpan={5}>
                                    Tests are enabled, but none were selected.
                                  </td>
                                </tr>
                              )}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="text-sm text-gray-500 mt-1">
                          Tests not enabled for this therapy.
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* ======================== BILL SECTION ======================== */}
        <div className="mt-12">
          <h3 className="text-2xl font-bold text-indigo-800 mb-3">🧾 Bill</h3>

          {billLoading ? (
            <div className="text-gray-600">Loading bill...</div>
          ) : billError ? (
            <div className="bg-red-50 border border-red-200 rounded-lg p-4 text-sm text-red-700">
              <span className="font-semibold">Bill Error: </span>
              {billError}
            </div>
          ) : !bill ? (
            <div className="bg-white border border-dashed border-indigo-200 rounded-lg p-6 text-sm">
              <p className="text-gray-700 mb-3">
                No bill exists for this case yet. Create one to start recording
                payments.
              </p>
              <button
                onClick={handleGenerateOrEditBill}
                className="bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded-lg shadow text-sm font-semibold"
              >
                ➕ Create Bill
              </button>
            </div>
          ) : (
            <div className="bg-white rounded-lg border border-gray-200 p-6">
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="flex flex-col gap-1">
                  <div className="text-sm text-gray-600">
                    <Label>Bill Date</Label> <span>{formatDate(bill.bill_date)}</span>
                  </div>
                  <div className="text-sm text-gray-600">
                    <Label>Due Date</Label> <span>{formatDate(bill.due_date)}</span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label>Status</Label>
                  <Chip variant={paymentChipVariant}>{bill.payment_status}</Chip>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 mt-4 text-sm">
                <div className="bg-indigo-50 p-3 rounded">
                  <Label>Subtotal</Label>
                  <div className="font-semibold mt-1">
                    {inr(bill.summary?.subtotal || 0)}
                  </div>
                </div>
                <div className="bg-indigo-50 p-3 rounded">
                  <Label>Grand Total</Label>
                  <div className="font-semibold mt-1">
                    {inr(bill.summary?.grand_total || bill.total_amount || 0)}
                  </div>
                </div>
                <div className="bg-indigo-50 p-3 rounded">
                  <Label>Paid</Label>
                  <div className="font-semibold mt-1">
                    {inr(bill.paid_amount || 0)}
                  </div>
                </div>
                <div className="bg-indigo-50 p-3 rounded md:col-span-3">
                  <Label>Remaining</Label>
                  <div className="font-semibold mt-1">{inr(remaining)}</div>
                </div>
              </div>

              {/* Line items */}
              <div className="mt-6">
                <Label>Items</Label>
                <div className="mt-2 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-500">
                        <th className="py-2 pr-4">Description</th>
                        <th className="py-2 pr-4">Qty</th>
                        <th className="py-2 pr-4">Rate</th>
                        <th className="py-2 pr-4">Amount</th>
                      </tr>
                    </thead>
                    <tbody>
                      {(bill.line_items || []).map((li, idx) => (
                        <tr key={idx} className="border-t">
                          <td className="py-2 pr-4">{li.description}</td>
                          <td className="py-2 pr-4">{li.quantity}</td>
                          <td className="py-2 pr-4">{inr(li.rate)}</td>
                          <td className="py-2 pr-4">{inr(li.amount)}</td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* Bill actions */}
              <div className="flex flex-wrap gap-3 mt-6">
                <button
                  onClick={handleGenerateOrEditBill}
                  className="bg-indigo-600 hover:bg-indigo-700 text-white px-4 py-2 rounded-lg shadow text-sm font-semibold"
                >
                  ✏️ Edit Bill
                </button>

                <button
                  onClick={handleOfflinePayment}
                  disabled={remaining <= 0}
                  className={`px-4 py-2 rounded-lg shadow text-sm font-semibold ${
                    remaining <= 0
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-amber-600 hover:bg-amber-700 text-white"
                  }`}
                  title={
                    remaining <= 0 ? "Bill is fully paid" : "Record an offline payment"
                  }
                >
                  💵 Record Offline Payment
                </button>

                <button
                  onClick={handleOnlinePayment}
                  disabled={remaining <= 0}
                  className={`px-4 py-2 rounded-lg shadow text-sm font-semibold ${
                    remaining <= 0
                      ? "bg-gray-300 text-gray-600 cursor-not-allowed"
                      : "bg-emerald-600 hover:bg-emerald-700 text-white"
                  }`}
                  title={
                    remaining <= 0 ? "Bill is fully paid" : "Collect payment online"
                  }
                >
                  🧾 Pay Online (Razorpay)
                </button>
              </div>
            </div>
          )}
        </div>
        {/* ====================== /BILL SECTION ======================= */}
      </div>
    </div>
  );
};

export default CaseDetail;
