import React, { useEffect, useState } from "react";
import axios from "axios";
import {
  Plus,
  Pencil,
  Trash2,
  RefreshCw,
  Search,
  CheckCircle2,
  XCircle,
  Stethoscope,
  TestTube,
  Timer,
  Blocks,
  Sparkles,
  LayoutGrid,
  List,
  Activity,
  ChevronDown,
} from "lucide-react";

/* -------------------------------------------------------------------------
   Axios instance (uses interceptor to always attach latest token)
---------------------------------------------------------------------------*/
export const api = axios.create({ baseURL: import.meta.env.VITE_API_BASE_URL });
api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

/* -------------------------------------------------------------------------
   Tiny UI primitives
---------------------------------------------------------------------------*/
function Badge({ active }) {
  return (
    <span
      className={`inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-bold transition-all duration-300 ${
        active
          ? "bg-emerald-500 text-white shadow-sm shadow-emerald-200"
          : "bg-gray-400 text-white shadow-sm shadow-gray-200"
      }`}
    >
      {active ? <CheckCircle2 className="w-3 h-3" /> : <XCircle className="w-3 h-3" />}
      {active ? "Active" : "Inactive"}
    </span>
  );
}

function Card({ children, className = "", hover = true }) {
  return (
    <div
      className={`bg-white rounded-2xl border border-gray-100 shadow-sm transition-all duration-300 ${
        hover ? "hover:shadow-lg hover:border-gray-200" : ""
      } ${className}`}
    >
      {children}
    </div>
  );
}

function Input({ label, value, onChange, type = "text", placeholder, min, icon }) {
  return (
    <div className="space-y-1.5">
      {label && (
        <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide">
          {label}
        </label>
      )}
      <div className="relative">
        {icon && (
          <div className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400">{icon}</div>
        )}
        <input
          type={type}
          value={value ?? ""}
          min={min}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          className={`w-full rounded-xl border-2 border-gray-200 bg-gray-50 ${
            icon ? "pl-10 pr-4" : "px-4"
          } py-2.5 text-sm font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200`}
        />
      </div>
    </div>
  );
}

function NumberInput(props) {
  return <Input {...props} type="number" />;
}

export function Button({
  onClick,
  children,
  variant = "primary",
  className = "",
  icon,
  size = "md",
  type = "button",
  disabled,
}) {
  const variants = {
    primary: "bg-blue-600 hover:bg-blue-700 text-white shadow-md shadow-blue-200 hover:shadow-lg",
    success:
      "bg-emerald-600 hover:bg-emerald-700 text-white shadow-md shadow-emerald-200 hover:shadow-lg",
    danger: "bg-rose-600 hover:bg-rose-700 text-white shadow-md shadow-rose-200 hover:shadow-lg",
    secondary: "bg-gray-200 hover:bg-gray-300 text-gray-800 shadow-sm",
    outline: "bg-white hover:bg-gray-50 text-gray-700 border-2 border-gray-200 hover:border-gray-300",
  };

  const sizes = { sm: "px-3 py-1.5 text-xs", md: "px-4 py-2.5 text-sm", lg: "px-6 py-3 text-base" };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center justify-center gap-2 rounded-xl font-bold transition-all duration-200 transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed ${
        variants[variant]
      } ${sizes[size]} ${className}`}
    >
      {icon}
      {children}
    </button>
  );
}

function Toggle({ checked, onChange, label }) {
  return (
    <button type="button" onClick={() => onChange(!checked)} className="flex items-center gap-3 group">
      <div className={`w-14 h-8 rounded-full relative transition-all duration-300 ${checked ? "bg-emerald-500" : "bg-gray-300"}`}>
        <span
          className={`absolute top-1 left-1 w-6 h-6 bg-white rounded-full shadow-lg transition-all duration-300 flex items-center justify-center ${
            checked ? "translate-x-6" : "translate-x-0"
          }`}
        >
          {checked && <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />}
        </span>
      </div>
      {label && <span className="text-sm font-semibold text-gray-700">{label}</span>}
    </button>
  );
}

/* -------------------------------------------------------------------------
   NEW: TherapySelector component (dropdown to select therapy)
---------------------------------------------------------------------------*/
function TherapySelector({ selectedTherapyId, onSelectTherapy, label = "Select Therapy" }) {
  const [therapies, setTherapies] = useState([]);
  const [loading, setLoading] = useState(false);
  const [isOpen, setIsOpen] = useState(false);

  useEffect(() => {
    const fetchTherapies = async () => {
      setLoading(true);
      try {
        const res = await api.get("/therapies", { params: { limit: 100 } });
        setTherapies(res.data.items || []);
      } catch (e) {
        console.error(e);
      } finally {
        setLoading(false);
      }
    };
    fetchTherapies();
  }, []);

  const selectedTherapy = therapies.find((t) => t._id === selectedTherapyId);

  return (
    <div className="relative">
      <label className="block text-xs font-bold text-gray-700 uppercase tracking-wide mb-1.5">
        {label}
      </label>
      <button
        type="button"
        onClick={() => setIsOpen(!isOpen)}
        className="w-full rounded-xl border-2 border-gray-200 bg-gray-50 px-4 py-2.5 text-sm font-medium focus:outline-none focus:border-blue-500 focus:bg-white transition-all duration-200 flex items-center justify-between"
      >
        <span className={selectedTherapy ? "text-gray-800" : "text-gray-400"}>
          {selectedTherapy ? selectedTherapy.name : "Choose a therapy..."}
        </span>
        <ChevronDown className={`w-4 h-4 transition-transform ${isOpen ? "rotate-180" : ""}`} />
      </button>

      {isOpen && (
        <>
          <div className="fixed inset-0 z-10" onClick={() => setIsOpen(false)} />
          <div className="absolute z-20 mt-2 w-full bg-white rounded-xl border-2 border-gray-200 shadow-xl max-h-64 overflow-y-auto">
            {loading ? (
              <div className="p-4 text-center text-gray-500">Loading therapies...</div>
            ) : therapies.length === 0 ? (
              <div className="p-4 text-center text-gray-500">No therapies available</div>
            ) : (
              therapies.map((therapy) => (
                <button
                  key={therapy._id}
                  type="button"
                  onClick={() => {
                    onSelectTherapy(therapy._id);
                    setIsOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 hover:bg-blue-50 transition-colors flex items-center justify-between ${
                    selectedTherapyId === therapy._id ? "bg-blue-100" : ""
                  }`}
                >
                  <span className="font-medium text-gray-800">{therapy.name}</span>
                  <Badge active={!!therapy.isActive} />
                </button>
              ))
            )}
          </div>
        </>
      )}
    </div>
  );
}

// helper to coerce numbers safely
const num = (v) => (v === "" || v == null ? undefined : Number(v));

/* ========================================================================
   CHILD VIEW: TherapiesView (CRUD + select therapy via card/row click)
==========================================================================*/
function TherapiesView({ selectedTherapyId, onSelectTherapy }) {
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [q, setQ] = useState("");
  const [form, setForm] = useState({ name: "", description: "", isActive: true });
  const [editing, setEditing] = useState(null);
  const [viewMode, setViewMode] = useState("grid"); // "grid" | "list"

  const fetchItems = async (signal) => {
    setLoading(true);
    try {
      const res = await api.get(`/therapies`, { params: { q, limit: 100 }, signal });
      setItems(res.data.items || []);
    } catch (e) {
      if (e?.name !== "CanceledError") console.error(e);
    } finally {
      setLoading(false);
    }
  };

  // debounce + abort stale requests on search
  useEffect(() => {
    const ctl = new AbortController();
    const id = setTimeout(() => fetchItems(ctl.signal), 250);
    return () => {
      ctl.abort();
      clearTimeout(id);
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [q]);

  const resetForm = () => {
    setForm({ name: "", description: "", isActive: true });
    setEditing(null);
  };

  const createItem = async () => {
    if (!form.name.trim()) return;
    await api.post(`/therapies`, form);
    resetForm();
    fetchItems();
  };

  const updateItem = async () => {
    if (!editing) return;
    await api.patch(`/therapies/${editing}`, form);
    resetForm();
    fetchItems();
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Delete therapy? This may remove its children (if forced).")) return;
    await api.delete(`/therapies/${id}`, { params: { force: true } });
    if (selectedTherapyId === id) onSelectTherapy(null);
    fetchItems();
  };

  const toggleActive = async (id) => {
    // optimistic
    setItems((prev) => prev.map((x) => (x._id === id ? { ...x, isActive: !x.isActive } : x)));
    try {
      await api.patch(`/therapies/${id}/toggle`);
    } catch (e) {
      console.error(e);
      fetchItems(); // rollback
    }
  };

  const startEdit = (it) => {
    setEditing(it._id);
    setForm({ name: it.name, description: it.description || "", isActive: !!it.isActive });
  };

  return (
    <div className="space-y-6">
      {/* Top Bar */}
      <Card className="p-4">
        <div className="flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="flex items-center gap-3 flex-1 w-full">
            <Input
              value={q}
              onChange={setQ}
              placeholder="Search therapies..."
              icon={<Search className="w-4 h-4" />}
            />
            <Button onClick={() => fetchItems()} variant="outline" icon={<RefreshCw className="w-4 h-4" />}>
              Refresh
            </Button>
          </div>
          <div className="flex items-center gap-2">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "grid" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
              }`}
              aria-label="Grid view"
            >
              <LayoutGrid className="w-5 h-5" />
            </button>
            <button
              onClick={() => setViewMode("list")}
              className={`p-2 rounded-lg transition-colors ${
                viewMode === "list" ? "bg-blue-100 text-blue-600" : "bg-gray-100 text-gray-600"
              }`}
              aria-label="List view"
            >
              <List className="w-5 h-5" />
            </button>
          </div>
        </div>
      </Card>

      {/* Create/Edit Form */}
      <Card className="p-6 border-2 border-blue-100 bg-gradient-to-br from-blue-50/50 to-white">
        <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
          <Plus className="w-5 h-5" />
          {editing ? "Edit Therapy" : "Create New Therapy"}
        </h3>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Input
            label="Therapy Name"
            value={form.name}
            onChange={(v) => setForm((f) => ({ ...f, name: v }))}
            placeholder="Enter name"
          />
          <Input
            label="Description"
            value={form.description}
            onChange={(v) => setForm((f) => ({ ...f, description: v }))}
            placeholder="Brief description"
          />
          <div className="flex items-end gap-3">
            <Toggle
              checked={form.isActive}
              onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
              label="Active"
            />
            {editing ? (
              <>
                <Button onClick={updateItem} variant="primary" size="md" className="flex-1">
                  Update
                </Button>
                <Button onClick={resetForm} variant="secondary" size="md">
                  Cancel
                </Button>
              </>
            ) : (
              <Button
                onClick={createItem}
                variant="success"
                size="md"
                className="flex-1"
                icon={<Plus className="w-4 h-4" />}
              >
                Create
              </Button>
            )}
          </div>
        </div>
      </Card>

      {/* Items Grid/List (click to select therapy; no Select button) */}
      {loading ? (
        <div className="flex flex-col items-center justify-center py-20" aria-busy>
          <RefreshCw className="w-12 h-12 text-blue-500 animate-spin mb-4" />
          <p className="text-gray-600 font-semibold">Loading therapies...</p>
        </div>
      ) : items.length === 0 ? (
        <Card className="p-12">
          <div className="flex flex-col items-center gap-4" aria-live="polite">
            <Sparkles className="w-16 h-16 text-gray-300" />
            <h3 className="text-xl font-bold text-gray-800">No Therapies Yet</h3>
            <p className="text-gray-600">Create your first therapy to get started!</p>
          </div>
        </Card>
      ) : viewMode === "grid" ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {items.map((it) => (
            <Card
              key={it._id}
              className={`p-5 transition-all duration-300 cursor-pointer ${
                selectedTherapyId === it._id ? "ring-2 ring-blue-500 shadow-lg" : ""
              }`}
              onClick={() => onSelectTherapy(it._id)}
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex items-center gap-2">
                  <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center">
                    <Stethoscope className="w-5 h-5 text-white" />
                  </div>
                  <div>
                    <h4 className="font-bold text-gray-800">{it.name}</h4>
                    <Badge active={!!it.isActive} />
                  </div>
                </div>
              </div>
              <p className="text-sm text-gray-600 mb-4 line-clamp-2">
                {it.description || "No description"}
              </p>
              <div className="flex gap-2 flex-wrap">
                <Button onClick={(e) => { e.stopPropagation(); toggleActive(it._id); }} variant="secondary" size="sm">
                  Toggle
                </Button>
                <Button onClick={(e) => { e.stopPropagation(); startEdit(it); }} variant="outline" size="sm" icon={<Pencil className="w-3 h-3" />}>
                  Edit
                </Button>
                <Button onClick={(e) => { e.stopPropagation(); deleteItem(it._id); }} variant="danger" size="sm" icon={<Trash2 className="w-3 h-3" />}>
                  Delete
                </Button>
              </div>
            </Card>
          ))}
        </div>
      ) : (
        <Card>
          <div className="divide-y divide-gray-100">
            {items.map((it) => (
              <div
                key={it._id}
                className={`p-4 hover:bg-gray-50 transition-colors cursor-pointer ${
                  selectedTherapyId === it._id ? "bg-blue-50" : ""
                }`}
                onClick={() => onSelectTherapy(it._id)}
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4 flex-1">
                    <div className="w-12 h-12 rounded-xl bg-gradient-to-br from-blue-500 to-purple-600 flex items-center justify-center flex-shrink-0">
                      <Stethoscope className="w-6 h-6 text-white" />
                    </div>
                    <div className="flex-1">
                      <h4 className="font-bold text-gray-800 mb-1">{it.name}</h4>
                      <p className="text-sm text-gray-600">{it.description || "No description"}</p>
                    </div>
                    <Badge active={!!it.isActive} />
                  </div>
                  <div className="flex gap-2 ml-4 flex-wrap">
                    <Button onClick={(e) => { e.stopPropagation(); toggleActive(it._id); }} variant="secondary" size="sm">
                      Toggle
                    </Button>
                    <Button onClick={(e) => { e.stopPropagation(); startEdit(it); }} variant="outline" size="sm" icon={<Pencil className="w-3 h-3" />}>
                      Edit
                    </Button>
                    <Button onClick={(e) => { e.stopPropagation(); deleteItem(it._id); }} variant="danger" size="sm" icon={<Trash2 className="w-3 h-3" />}>
                      Delete
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </Card>
      )}

      {/* Selected Therapy Details */}
      {selectedTherapyId && (
        <Card className="p-6 bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-200">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-bold text-gray-800 flex items-center gap-2">
              <Activity className="w-5 h-5 text-blue-600" />
              Selected: {items.find((it) => it._id === selectedTherapyId)?.name || "—"}
            </h3>
            <Button onClick={() => onSelectTherapy(null)} variant="outline" size="sm">
              Clear Selection
            </Button>
          </div>
          <p className="text-sm text-gray-700">
            Go to the Sub-therapies or Tests tabs to add items for this therapy.
          </p>
        </Card>
      )}
    </div>
  );
}

/* ========================================================================
   CHILD VIEW: SubTherapiesView (CRUD with its own therapy selector)
==========================================================================*/
function SubTherapiesView() {
  const [selectedTherapyId, setSelectedTherapyId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    duration_mins: "",
    price_per_session: "",
    price_per_package: "",
    default_sessions_per_package: 1,
    notes: "",
    isActive: true,
  });
  const [editing, setEditing] = useState(null);

  const fetchItems = async () => {
    if (!selectedTherapyId) return;
    setLoading(true);
    try {
      const res = await api.get(`/therapies/${selectedTherapyId}/subtherapies`, { params: { limit: 200 } });
      setItems(res.data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setItems([]);
    setEditing(null);
    setForm({
      name: "",
      duration_mins: "",
      price_per_session: "",
      price_per_package: "",
      default_sessions_per_package: 1,
      notes: "",
      isActive: true,
    });
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTherapyId]);

  const resetForm = () => {
    setEditing(null);
    setForm({
      name: "",
      duration_mins: "",
      price_per_session: "",
      price_per_package: "",
      default_sessions_per_package: 1,
      notes: "",
      isActive: true,
    });
  };

  const createItem = async () => {
    if (!selectedTherapyId || !form.name.trim()) return;
    await api.post(`/therapies/${selectedTherapyId}/subtherapies`, {
      ...form,
      duration_mins: num(form.duration_mins),
      price_per_session: num(form.price_per_session),
      price_per_package: num(form.price_per_package),
      default_sessions_per_package: Number(form.default_sessions_per_package || 1),
    });
    resetForm();
    fetchItems();
  };

  const updateItem = async () => {
    if (!editing) return;
    await api.patch(`/subtherapies/${editing}`, {
      ...form,
      duration_mins: num(form.duration_mins),
      price_per_session: num(form.price_per_session),
      price_per_package: num(form.price_per_package),
      default_sessions_per_package: Number(form.default_sessions_per_package || 1),
    });
    resetForm();
    fetchItems();
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Delete sub-therapy?")) return;
    await api.delete(`/subtherapies/${id}`, { params: { force: true } });
    fetchItems();
  };

  const startEdit = (it) => {
    setEditing(it._id);
    setForm({
      name: it.name || "",
      duration_mins: it.duration_mins ?? "",
      price_per_session: it.price_per_session ?? "",
      price_per_package: it.price_per_package ?? "",
      default_sessions_per_package: it.default_sessions_per_package ?? 1,
      notes: it.notes || "",
      isActive: !!it.isActive,
    });
  };

  return (
    <div className="space-y-6">
      {/* Therapy Selector */}
      <Card className="p-6 border-2 border-purple-100 bg-gradient-to-br from-purple-50/50 to-white">
        <TherapySelector
          selectedTherapyId={selectedTherapyId}
          onSelectTherapy={setSelectedTherapyId}
          label="Select Therapy for Sub-therapies"
        />
      </Card>

      {!selectedTherapyId ? (
        <Card className="p-20">
          <div className="flex flex-col items-center gap-4">
            <Blocks className="w-20 h-20 text-gray-300" />
            <h3 className="text-2xl font-bold text-gray-800">Select a Therapy First</h3>
            <p className="text-gray-600">
              Choose a therapy from the dropdown above to manage its sub-therapies.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Form */}
          <Card className="p-6 border-2 border-cyan-100 bg-gradient-to-br from-cyan-50/50 to-white">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {editing ? "Edit Sub-therapy" : "Create New Sub-therapy"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Sub-therapy Name"
                  value={form.name}
                  onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                  placeholder="Enter name"
                />
              </div>
              <NumberInput
                label="Duration (mins)"
                value={form.duration_mins}
                onChange={(v) => setForm((f) => ({ ...f, duration_mins: v }))}
                min={1}
                icon={<Timer className="w-4 h-4" />}
              />
              <NumberInput
                label="Price/Session (₹)"
                value={form.price_per_session}
                onChange={(v) => setForm((f) => ({ ...f, price_per_session: v }))}
                min={0}
                placeholder="0.00"
              />
              <NumberInput
                label="Price/Package (₹)"
                value={form.price_per_package}
                onChange={(v) => setForm((f) => ({ ...f, price_per_package: v }))}
                min={0}
                placeholder="0.00"
              />
              <NumberInput
                label="Sessions/Package"
                value={form.default_sessions_per_package}
                onChange={(v) => setForm((f) => ({ ...f, default_sessions_per_package: v }))}
                min={1}
              />
              <div className="md:col-span-2">
                <Input
                  label="Notes"
                  value={form.notes}
                  onChange={(v) => setForm((f) => ({ ...f, notes: v }))}
                  placeholder="Additional notes"
                />
              </div>
              <div className="flex items-end gap-3 md:col-span-2">
                <Toggle
                  checked={form.isActive}
                  onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                  label="Active"
                />
                {editing ? (
                  <>
                    <Button onClick={updateItem} variant="primary" className="flex-1">
                      Update
                    </Button>
                    <Button onClick={resetForm} variant="secondary">
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={createItem} variant="success" className="flex-1" icon={<Plus className="w-4 h-4" />}>
                    Create
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Items */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20" aria-busy>
              <RefreshCw className="w-12 h-12 text-cyan-500 animate-spin mb-4" />
              <p className="text-gray-600 font-semibold">Loading sub-therapies...</p>
            </div>
          ) : items.length === 0 ? (
            <Card className="p-12">
              <div className="flex flex-col items-center gap-4" aria-live="polite">
                <Sparkles className="w-16 h-16 text-gray-300" />
                <h3 className="text-xl font-bold text-gray-800">No Sub-therapies Yet</h3>
                <p className="text-gray-600">Create your first sub-therapy for this therapy!</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {items.map((it) => (
                <Card key={it._id} className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-gray-800 mb-1">{it.name}</h4>
                      <Badge active={!!it.isActive} />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => startEdit(it)} variant="outline" size="sm" icon={<Pencil className="w-3 h-3" />}>
                        Edit
                      </Button>
                      <Button
                        onClick={() => deleteItem(it._id)}
                        variant="danger"
                        size="sm"
                        icon={<Trash2 className="w-3 h-3" />}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-semibold text-gray-800">{it.duration_mins ?? "—"} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price/Session:</span>
                      <span className="font-semibold text-gray-800">₹{it.price_per_session ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price/Package:</span>
                      <span className="font-semibold text-gray-800">₹{it.price_per_package ?? "—"}</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Sessions/Package:</span>
                      <span className="font-semibold text-gray-800">{it.default_sessions_per_package ?? "—"}</span>
                    </div>
                    {it.notes && (
                      <div className="pt-2 border-t border-gray-100">
                        <span className="text-gray-600 text-xs">Notes: </span>
                        <span className="text-gray-700 text-xs">{it.notes}</span>
                      </div>
                    )}
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ========================================================================
   CHILD VIEW: TestsView (CRUD with its own therapy selector)
==========================================================================*/
function TestsView() {
  const [selectedTherapyId, setSelectedTherapyId] = useState(null);
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(false);
  const [form, setForm] = useState({
    name: "",
    duration_mins: "",
    price_per_test: "",
    isActive: true,
  });
  const [editing, setEditing] = useState(null);

  const fetchItems = async () => {
    if (!selectedTherapyId) return;
    setLoading(true);
    try {
      const res = await api.get(`/therapies/${selectedTherapyId}/tests`, { params: { limit: 200 } });
      setItems(res.data.items || []);
    } catch (e) {
      console.error(e);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    setItems([]);
    setEditing(null);
    setForm({ name: "", duration_mins: "", price_per_test: "", isActive: true });
    fetchItems();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedTherapyId]);

  const resetForm = () => {
    setEditing(null);
    setForm({ name: "", duration_mins: "", price_per_test: "", isActive: true });
  };

  const createItem = async () => {
    if (!selectedTherapyId || !form.name.trim()) return;
    await api.post(`/therapies/${selectedTherapyId}/tests`, {
      ...form,
      duration_mins: num(form.duration_mins),
      price_per_test: num(form.price_per_test),
    });
    resetForm();
    fetchItems();
  };

  const updateItem = async () => {
    if (!editing) return;
    await api.patch(`/tests/${editing}`, {
      ...form,
      duration_mins: num(form.duration_mins),
      price_per_test: num(form.price_per_test),
    });
    resetForm();
    fetchItems();
  };

  const deleteItem = async (id) => {
    if (!window.confirm("Delete test?")) return;
    await api.delete(`/tests/${id}`, { params: { force: true } });
    fetchItems();
  };

  const startEdit = (it) => {
    setEditing(it._id);
    setForm({
      name: it.name || "",
      duration_mins: it.duration_mins ?? "",
      price_per_test: it.price_per_test ?? "",
      isActive: !!it.isActive,
    });
  };

  return (
    <div className="space-y-6">
      {/* Therapy Selector */}
      <Card className="p-6 border-2 border-emerald-100 bg-gradient-to-br from-emerald-50/50 to-white">
        <TherapySelector
          selectedTherapyId={selectedTherapyId}
          onSelectTherapy={setSelectedTherapyId}
          label="Select Therapy for Tests"
        />
      </Card>

      {!selectedTherapyId ? (
        <Card className="p-20">
          <div className="flex flex-col items-center gap-4">
            <TestTube className="w-20 h-20 text-gray-300" />
            <h3 className="text-2xl font-bold text-gray-800">Select a Therapy First</h3>
            <p className="text-gray-600">
              Choose a therapy from the dropdown above to manage its tests.
            </p>
          </div>
        </Card>
      ) : (
        <>
          {/* Form */}
          <Card className="p-6 border-2 border-green-100 bg-gradient-to-br from-green-50/50 to-white">
            <h3 className="text-lg font-bold text-gray-800 mb-4 flex items-center gap-2">
              <Plus className="w-5 h-5" />
              {editing ? "Edit Test" : "Create New Test"}
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
              <div className="md:col-span-2">
                <Input
                  label="Test Name"
                  value={form.name}
                  onChange={(v) => setForm((f) => ({ ...f, name: v }))}
                  placeholder="Enter name"
                />
              </div>
              <NumberInput
                label="Duration (mins)"
                value={form.duration_mins}
                onChange={(v) => setForm((f) => ({ ...f, duration_mins: v }))}
                min={1}
                icon={<Timer className="w-4 h-4" />}
              />
              <NumberInput
                label="Price/Test (₹)"
                value={form.price_per_test}
                onChange={(v) => setForm((f) => ({ ...f, price_per_test: v }))}
                min={0}
                placeholder="0.00"
              />
              <div className="flex items-end gap-3 md:col-span-5">
                <Toggle
                  checked={form.isActive}
                  onChange={(v) => setForm((f) => ({ ...f, isActive: v }))}
                  label="Active"
                />
                {editing ? (
                  <>
                    <Button onClick={updateItem} variant="primary" className="flex-1">
                      Update
                    </Button>
                    <Button onClick={resetForm} variant="secondary">
                      Cancel
                    </Button>
                  </>
                ) : (
                  <Button onClick={createItem} variant="success" className="flex-1" icon={<Plus className="w-4 h-4" />}>
                    Create
                  </Button>
                )}
              </div>
            </div>
          </Card>

          {/* Items */}
          {loading ? (
            <div className="flex flex-col items-center justify-center py-20" aria-busy>
              <RefreshCw className="w-12 h-12 text-green-500 animate-spin mb-4" />
              <p className="text-gray-600 font-semibold">Loading tests...</p>
            </div>
          ) : items.length === 0 ? (
            <Card className="p-12">
              <div className="flex flex-col items-center gap-4" aria-live="polite">
                <Sparkles className="w-16 h-16 text-gray-300" />
                <h3 className="text-xl font-bold text-gray-800">No Tests Yet</h3>
                <p className="text-gray-600">Create your first test for this therapy!</p>
              </div>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {items.map((it) => (
                <Card key={it._id} className="p-5">
                  <div className="flex items-start justify-between mb-3">
                    <div>
                      <h4 className="font-bold text-gray-800 mb-1">{it.name}</h4>
                      <Badge active={!!it.isActive} />
                    </div>
                    <div className="flex gap-2">
                      <Button onClick={() => startEdit(it)} variant="outline" size="sm" icon={<Pencil className="w-3 h-3" />}>
                        Edit
                      </Button>
                      <Button
                        onClick={() => deleteItem(it._id)}
                        variant="danger"
                        size="sm"
                        icon={<Trash2 className="w-3 h-3" />}
                      >
                        Delete
                      </Button>
                    </div>
                  </div>
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Duration:</span>
                      <span className="font-semibold text-gray-800">{it.duration_mins ?? "—"} min</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Price:</span>
                      <span className="font-semibold text-gray-800">₹{it.price_per_test}</span>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </>
      )}
    </div>
  );
}

/* ========================================================================
   COMPONENT 1: TherapyCatalogContent (tabs + rendering of child views)
==========================================================================*/
export function TherapyCatalogContent({ activeTab, selectedTherapyId, onSelectTherapy }) {
  return (
    <div>
      {activeTab === "therapies" && (
        <TherapiesView
          selectedTherapyId={selectedTherapyId}
          onSelectTherapy={onSelectTherapy}
        />
      )}
      {activeTab === "subtherapies" && <SubTherapiesView />}
      {activeTab === "tests" && <TestsView />}
    </div>
  );
}