import React, { useEffect, useMemo, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import axios from "axios";
import { ShieldAlert } from "lucide-react";
import { toast } from "react-hot-toast";

const CaseDetail = () => {
  const { caseId } = useParams();
  const navigate = useNavigate();

  const [caseData, setCaseData] = useState(null);
  const [caseItems, setCaseItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [errorState, setErrorState] = useState(null);

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
      const res = await api.get(`/cases/${caseId}`);
      const doc = res.data?.data || res.data || null;
      setCaseData(doc);

      // prefer populated virtual items
      if (Array.isArray(doc?.items)) {
        setCaseItems(doc.items);
      } else {
        // fallback to explicit endpoint
        const itemsRes = await api.get(`/cases/${caseId}/line-items`);
        setCaseItems(itemsRes.data?.data || []);
      }
    } catch (error) {
      console.error("Error fetching case details:", error);
      const status = error?.response?.status;
      const apiMsg = error?.response?.data?.error || error?.response?.data?.message || "Unable to fetch case details.";

      const friendly =
        status === 403
          ? "You don’t have permission to view this case. Please contact your administrator."
          : status === 404
          ? "This case could not be found."
          : "Something went wrong while loading this case.";

      setErrorState({ status: status || "NETWORK", message: apiMsg, friendly });
      toast.error(apiMsg, { id: "case-detail-error" });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchCaseDetail();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [caseId]);

  const formatDate = (iso) => {
    if (!iso) return "N/A";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? "N/A"
      : d.toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" });
  };

  const formatDateTime = (iso) => {
    if (!iso) return "N/A";
    const d = new Date(iso);
    return Number.isNaN(d.getTime())
      ? "N/A"
      : d.toLocaleString("en-IN", { day: "2-digit", month: "short", year: "numeric", hour: "2-digit", minute: "2-digit" });
  };

  const inr = (n) =>
    new Intl.NumberFormat("en-IN", { style: "currency", currency: "INR" }).format(Number(n || 0));

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
    return <span className={`inline-block px-2 py-1 text-xs rounded ${map[variant] || map.gray}`}>{children}</span>;
  };

  const Label = ({ children }) => <span className="text-xs uppercase tracking-wide text-gray-500">{children}</span>;

  const copyText = async (t) => {
    try {
      await navigator.clipboard.writeText(String(t || ""));
      toast.success("Copied to clipboard");
    } catch (e) {
      toast.error("Unable to copy");
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-slate-50">
        <div className="bg-white shadow-md rounded-xl px-6 py-4 text-sm text-gray-700">Loading case details...</div>
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
              <p className="text-sm font-semibold text-red-600">{errorState.friendly}</p>
              <p className="text-xs text-gray-600">
                <span className="font-medium text-gray-700">Server says:</span> {errorState.message}
              </p>
              <p className="text-[11px] uppercase tracking-wide text-gray-400">
                HTTP Status: <span className="font-semibold">{errorState.status}</span>
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
              onClick={() => fetchCaseDetail()}
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
        <div className="bg-white shadow-md rounded-xl px-6 py-4 text-sm text-red-600">Case not found.</div>
      </div>
    );
  }

  const {
    _id,
    case_uid,
    client_id,
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

  const itemsActive = (caseItems || []).filter((x) => x?.status !== "removed");

  const subItems = itemsActive.filter((x) => x.item_type === "SUB");
  const testItems = itemsActive.filter((x) => x.item_type === "TEST");

  return (
    <div className="min-h-screen w-full bg-gradient-to-br from-indigo-50 via-white to-purple-100 py-10 px-4 sm:px-8">
      <div className="max-w-6xl mx-auto bg-white shadow-2xl rounded-xl p-8 md:p-10 border border-indigo-100">
        {/* Header */}
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between mb-8">
          <div className="space-y-2">
            <h2 className="text-3xl md:text-4xl font-extrabold text-indigo-800">📝 Case Details</h2>

            <div className="flex flex-wrap items-center gap-2">
              <div className="flex items-center gap-2">
                <Label>Case UID</Label>
                <Chip variant="green">{case_uid || "N/A"}</Chip>
                {case_uid && (
                  <button onClick={() => copyText(case_uid)} className="text-xs text-indigo-600 hover:underline">
                    Copy
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Label>Client ID</Label>
                <Chip variant="indigo">{client_id ?? "N/A"}</Chip>
                {client_id != null && (
                  <button onClick={() => copyText(client_id)} className="text-xs text-indigo-600 hover:underline">
                    Copy
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Label>Case ID</Label>
                <Chip variant="gray">{_id}</Chip>
                {_id && (
                  <button onClick={() => copyText(_id)} className="text-xs text-indigo-600 hover:underline">
                    Copy
                  </button>
                )}
              </div>

              <div className="flex items-center gap-2">
                <Label>Status</Label>
                <Chip variant="slate">{status || "open"}</Chip>
              </div>
            </div>
          </div>

          <div className="flex flex-wrap gap-3">
            <button
              onClick={() => navigate(`/admin/edit-case/${caseId}`)}
              className="px-4 py-2 rounded-lg shadow text-sm font-semibold bg-indigo-600 hover:bg-indigo-700 text-white"
              title="Edit Case"
            >
              ✏️ Edit Case
            </button>
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
            {patient_phone_alt ? <p className="text-sm text-gray-600 mt-1">Alt: {patient_phone_alt}</p> : null}
          </div>

          <div className="bg-purple-50 p-4 rounded-md shadow-sm">
            <Label>Case Type</Label>
            <p className="font-medium text-base mt-1">{case_type || "—"}</p>
          </div>

          <div className="bg-yellow-50 p-4 rounded-md shadow-sm">
            <Label>Date of Birth</Label>
            <p className="font-medium text-base mt-1">{formatDate(dob)}</p>
            {Number.isFinite(Number(age)) ? <p className="text-xs text-gray-600 mt-1">Age: {age}</p> : null}
          </div>

          <div className="bg-yellow-50 p-4 rounded-md shadow-sm">
            <Label>Joining Date</Label>
            <p className="font-medium text-base mt-1">{formatDate(joining_date)}</p>
          </div>

          <div className="bg-green-50 p-4 rounded-md shadow-sm">
            <Label>Total Cost</Label>
            <p className="font-medium text-base mt-1">{inr(total_cost)}</p>
          </div>

          <div className="bg-green-50 p-4 rounded-md shadow-sm">
            <Label>App Access</Label>
            <p className="font-medium text-base mt-1">{grant_app_access ? "Granted" : "Not granted"}</p>
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
            <p className="font-medium text-base mt-1">{description?.trim() ? description : "No description provided."}</p>
          </div>

          {/* Address */}
          <div className="md:col-span-2 bg-slate-50 p-4 rounded-md shadow-sm">
            <Label>Address</Label>
            <div className="mt-1">
              <p className="text-gray-800">{[address.line1, address.line2].filter(Boolean).join(", ") || "—"}</p>
              <p className="text-gray-600">{[address.city, address.state, address.country].filter(Boolean).join(", ") || ""}</p>
              {address.pincode ? <p className="text-gray-600">Pincode: {address.pincode}</p> : null}
            </div>
          </div>

          {/* Programs & Referral */}
          <div className="bg-blue-50 p-4 rounded-md shadow-sm">
            <Label>Programs</Label>
            <div className="flex flex-wrap gap-2 mt-1">
              {(programs || []).length ? (
                programs.map((p, i) => (
                  <span key={`${p}-${i}`} className="text-xs px-2 py-1 rounded-full bg-white border border-blue-200 text-blue-800">
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
              {referral_type || referral_name ? `${referral_type || "—"} ${referral_name ? `· ${referral_name}` : ""}` : "—"}
            </p>
          </div>

          {/* Legacy tags */}
          <div className="bg-purple-100 p-4 rounded-md shadow-sm">
            <p className="text-sm text-gray-500 mb-1 font-semibold">🩺 Therapy Tags (legacy)</p>
            <div className="flex flex-wrap gap-2">
              {(therapies || []).length ? (
                therapies.map((t, i) => (
                  <span key={`${t}-${i}`} className="text-xs px-2 py-1 rounded-full bg-white border border-purple-200 text-purple-800">
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
                  <span key={`${c}-${i}`} className="text-xs px-2 py-1 rounded-full bg-white border border-purple-200 text-purple-800">
                    {c}
                  </span>
                ))
              ) : (
                <span className="text-gray-500">—</span>
              )}
            </div>
          </div>

          {/* Family */}
          <div className="md:col-span-2 bg-green-100 p-4 rounded-md shadow-sm">
            <p className="text-sm text-gray-500 mb-2 font-semibold">👨‍👩‍👧 Family Details & Additional Info</p>

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

        {/* Case Items */}
        <div className="mt-10">
          <h3 className="text-2xl font-bold text-indigo-800 mb-3">🧾 Case Items</h3>

          {!itemsActive.length ? (
            <div className="text-sm text-gray-600">No items added.</div>
          ) : (
            <div className="space-y-6">
              {/* SUB */}
              <div className="bg-white border border-indigo-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-indigo-700">SUB (Sub-therapy items)</div>
                  <div className="text-xs text-gray-500">Count: {subItems.length}</div>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600 border-b">
                        <th className="py-2 pr-4">Therapy</th>
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Sessions</th>
                        <th className="py-2 pr-4">Rate</th>
                        <th className="py-2 pr-4">Discount %</th>
                        <th className="py-2 pr-4">Start</th>
                        <th className="py-2 pr-4">End</th>
                        <th className="py-2 pr-4">Invoiced Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {subItems.length ? (
                        subItems.map((x) => (
                          <tr key={x._id} className="border-b last:border-b-0">
                            <td className="py-2 pr-4">{x.therapy_name || "—"}</td>
                            <td className="py-2 pr-4">{x.name || "—"}</td>
                            <td className="py-2 pr-4">{x.sessions_count ?? "—"}</td>
                            <td className="py-2 pr-4">{inr(x.price_per_session)}</td>
                            <td className="py-2 pr-4">{Number(x.discount_percent || 0)}%</td>
                            <td className="py-2 pr-4">{formatDate(x.start_date)}</td>
                            <td className="py-2 pr-4">{formatDate(x.end_date)}</td>
                            <td className="py-2 pr-4">{x.invoiced_count ?? 0}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={8} className="py-3 text-gray-500">
                            No SUB items.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>
              </div>

              {/* TEST */}
              <div className="bg-white border border-indigo-100 rounded-lg p-4">
                <div className="flex items-center justify-between">
                  <div className="font-semibold text-indigo-700">TEST (Test items)</div>
                  <div className="text-xs text-gray-500">Count: {testItems.length}</div>
                </div>

                <div className="mt-3 overflow-x-auto">
                  <table className="min-w-full text-sm">
                    <thead>
                      <tr className="text-left text-gray-600 border-b">
                        <th className="py-2 pr-4">Therapy</th>
                        <th className="py-2 pr-4">Name</th>
                        <th className="py-2 pr-4">Price / Test</th>
                        <th className="py-2 pr-4">Invoiced Count</th>
                      </tr>
                    </thead>
                    <tbody>
                      {testItems.length ? (
                        testItems.map((x) => (
                          <tr key={x._id} className="border-b last:border-b-0">
                            <td className="py-2 pr-4">{x.therapy_name || "—"}</td>
                            <td className="py-2 pr-4">{x.name || "—"}</td>
                            <td className="py-2 pr-4">{inr(x.price_per_test)}</td>
                            <td className="py-2 pr-4">{x.invoiced_count ?? 0}</td>
                          </tr>
                        ))
                      ) : (
                        <tr>
                          <td colSpan={4} className="py-3 text-gray-500">
                            No TEST items.
                          </td>
                        </tr>
                      )}
                    </tbody>
                  </table>
                </div>

                <div className="mt-4 text-xs text-gray-500">
                  Note: Invoiced Count sirf tracking hai — same item ko multiple invoices me include kar sakte ho.
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CaseDetail;
