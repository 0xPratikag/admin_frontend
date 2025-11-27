// src/pages/InvitePage.js
import { useEffect, useState } from "react";
import axios from "axios";
import { FaTrash, FaCheckCircle, FaTimesCircle } from "react-icons/fa";

export default function InvitePage() {
  const [invites, setInvites] = useState([]);
  const [subroles, setSubroles] = useState([]);
  const [loading, setLoading] = useState(false);
  const [sending, setSending] = useState(false); // new state for send invite button
  const [error, setError] = useState("");
  const [filter, setFilter] = useState("all");

  const userData = JSON.parse(localStorage.getItem("user") || "{}");
  const token = localStorage.getItem("token");

  const [form, setForm] = useState({
    email: "",
    subrole: "",
    isMainAdmin: userData?.subrole ? false : true,
    inviterId: userData?.id || "",
    inviterRole: userData?.role || userData?.subrole || "",
  });

  useEffect(() => {
    fetchInvites();
    fetchSubroles();
  }, []);

  const fetchInvites = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/invites`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res?.data?.success) setInvites(res.data.invites);
    } catch (err) {
      console.error(err);
      setError("Failed to fetch invites.");
    } finally {
      setLoading(false);
    }
  };

  const fetchSubroles = async () => {
    try {
      const res = await axios.get(
        `${import.meta.env.VITE_API_BASE_URL}/getSubRoles`,
        {
          headers: { Authorization: `Bearer ${token}` },
        }
      );
      if (res.status === 200) setSubroles(res.data);
    } catch (err) {
      console.error(err);
    }
  };

  const handleChange = (e) =>
    setForm({ ...form, [e.target.name]: e.target.value });

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSending(true);
    setError("");

    try {
      const res = await axios.post(
        `${import.meta.env.VITE_API_BASE_URL}/invite`,
        form,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        setForm({ ...form, email: "", subrole: "" });
        fetchInvites();
      } else {
        setError(res.data.message || "Failed to send invite.");
      }
    } catch (err) {
      console.error(err);
      // Check if response exists (server returned an error)
      if (err.response && err.response.data) {
        setError(err.response.data.message || "Server error occurred.");
      } else {
        // Network error
        setError("Network error! Please check your connection.");
      }
    } finally {
      setSending(false);
    }
  };

  const handleDelete = async (id) => {
    setLoading(true);
    setError("");

    try {
      const res = await axios.delete(
        `${import.meta.env.VITE_API_BASE_URL}/invites/${id}`,
        { headers: { Authorization: `Bearer ${token}` } }
      );

      if (res.data.success) {
        fetchInvites();
      } else {
        setError(res.data.message || "Failed to delete invite.");
      }
    } catch (err) {
      console.error(err);
      if (err.response && err.response.data) {
        setError(err.response.data.message || "Server error occurred.");
      } else {
        setError("Network error! Please check your connection.");
      }
    } finally {
      setLoading(false);
    }
  };

  const filteredInvites = invites.filter((inv) => {
    if (filter === "accepted") return inv.accepted;
    if (filter === "notAccepted") return !inv.accepted;
    return true;
  });

  return (
    <div className="p-8 bg-gradient-to-br from-gray-50 via-gray-100 to-gray-200 min-h-screen w-full max-w-7xl mx-auto">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">
        Invite Management
      </h2>

      {/* Invite Form */}
      <form
        onSubmit={handleSubmit}
        className="grid gap-3 md:grid-cols-3 mb-6 bg-white p-6 rounded-xl shadow-lg"
      >
        <input
          type="email"
          name="email"
          placeholder="Email"
          value={form.email}
          onChange={handleChange}
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
          required
        />
        <select
          name="subrole"
          value={form.subrole}
          onChange={handleChange}
          className="p-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-400"
          required
        >
          <option value="">Select Subrole</option>
          {subroles.map((role) => (
            <option key={role._id} value={role._id}>
              {role.name}
            </option>
          ))}
        </select>
        <button
          type="submit"
          disabled={sending}
          className={`bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg shadow hover:bg-blue-700 transition flex items-center justify-center ${
            sending ? "opacity-70 cursor-not-allowed" : ""
          }`}
        >
          {sending ? (
            <div className="w-5 h-5 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
          ) : (
            "Send Invite"
          )}
        </button>
      </form>

      {/* Filter Buttons */}
      <div className="flex gap-3 mb-6">
        <button
          onClick={() => setFilter("all")}
          className={`px-4 py-2 rounded-lg font-medium shadow ${
            filter === "all"
              ? "bg-blue-600 text-white"
              : "bg-white text-gray-700"
          }`}
        >
          All
        </button>
        <button
          onClick={() => setFilter("accepted")}
          className={`px-4 py-2 rounded-lg font-medium shadow ${
            filter === "accepted"
              ? "bg-green-600 text-white"
              : "bg-white text-gray-700"
          }`}
        >
          Accepted
        </button>
        <button
          onClick={() => setFilter("notAccepted")}
          className={`px-4 py-2 rounded-lg font-medium shadow ${
            filter === "notAccepted"
              ? "bg-red-600 text-white"
              : "bg-white text-gray-700"
          }`}
        >
          Not Accepted
        </button>
      </div>

      {/* Error */}
      {error && <p className="text-red-600 font-medium mb-4">{error}</p>}

      {/* Invite List */}
      <div className="grid md:grid-cols-3 gap-6">
        {loading
          ? Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="bg-white p-6 rounded-xl shadow animate-pulse flex flex-col gap-4"
              >
                <div className="h-6 bg-gray-300 rounded w-3/4"></div>
                <div className="h-4 bg-gray-300 rounded w-full"></div>
                <div className="h-4 bg-gray-300 rounded w-5/6"></div>
                <div className="h-4 bg-gray-300 rounded w-2/3"></div>
                <div className="h-8 bg-gray-300 rounded w-1/2 mt-auto"></div>
              </div>
            ))
          : filteredInvites.map((inv) => (
              <div
                key={inv._id}
                className="bg-white p-6 rounded-xl shadow hover:shadow-lg transition"
              >
                <h3 className="text-xl font-semibold mb-2">
                  {inv.name || "-"}
                </h3>
                <p className="text-gray-600 mb-1">
                  <strong>Email:</strong> {inv.email}
                </p>
                <p className="text-gray-600 mb-1">
                  <strong>Phone:</strong> {inv.phone || "-"}
                </p>
                <p className="text-gray-600 mb-1">
                  <strong>Subrole:</strong> {inv.subroleId?.name || "-"}
                </p>
                <p className="text-gray-600 mb-1">
                  <strong>Department:</strong> {inv.department || "-"}
                </p>
                <p className="text-gray-600 mb-3 flex items-center gap-2">
                  <strong>Accepted:</strong>{" "}
                  {inv.accepted ? (
                    <FaCheckCircle className="text-green-500" />
                  ) : (
                    <FaTimesCircle className="text-red-500" />
                  )}
                </p>
                <button
                  onClick={() => handleDelete(inv._id)}
                  className="bg-red-500 text-white px-4 py-2 rounded-lg hover:bg-red-600 transition flex items-center gap-2 justify-center"
                >
                  <FaTrash /> Delete
                </button>
              </div>
            ))}
        {!loading && filteredInvites.length === 0 && (
          <p className="col-span-full text-center text-gray-500 font-medium">
            No invites found.
          </p>
        )}
      </div>
    </div>
  );
}
