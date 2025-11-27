import React, { useEffect, useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { finalBaseUrl } from "../utils/axios";

const AcceptInvitation = () => {
  const { Invitation_token } = useParams();
  const navigate = useNavigate();

  const [inviteData, setInviteData] = useState(null);
  const [formData, setFormData] = useState({
    name: "",
    phone: "",
    department: "",
    speciality: "",
  });
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ text: "", type: "" }); // type: 'error' | 'success'

  // ✅ Fetch invitation details on mount
  useEffect(() => {
    const fetchInvite = async () => {
      try {
        setLoading(true);
        const { data } = await finalBaseUrl.get(
          `/invites/verify/${Invitation_token}`
        );

        if (data.success) {
          setInviteData(data.invite);
          setMessage({
            text: "Invitation is valid! Please complete your profile.",
            type: "success",
          });
        } else {
          setMessage({ text: "Invalid or expired invitation.", type: "error" });
        }
      } catch (err) {
        let msg = "Network error. Please check your connection.";
        if (err.response?.data?.message) msg = err.response.data.message;
        setMessage({ text: msg, type: "error" });
      } finally {
        setLoading(false);
      }
    };
    fetchInvite();
  }, [Invitation_token]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  // ✅ Accept Invitation
  const handleAccept = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      setMessage({ text: "", type: "" });

      const { data } = await finalBaseUrl.post(
        `/invites/accept/${Invitation_token}`,
        { ...formData }
      );

      if (data.success) {
        setMessage({
          text: data.message || "Invitation accepted successfully!",
          type: "success",
        });
        // Redirect after 2s
        setTimeout(() => navigate("/dashboard"), 2000);
      }
    } catch (err) {
      let msg = "Network error. Please try again.";
      if (err.response?.data?.message) msg = err.response.data.message;
      setMessage({ text: msg, type: "error" });
    } finally {
      setLoading(false);
    }
  };

  if (loading && !inviteData)
    return (
      <p className="text-center text-blue-600 mt-10 font-semibold">
        Loading invitation...
      </p>
    );

  if (!inviteData)
    return (
      <p className="text-center text-red-600 mt-10 font-semibold">
        {message.text || "Invitation not found"}
      </p>
    );

  return (
    <div className="max-w-lg mx-auto mt-10 bg-white shadow-lg rounded-xl p-6">
      <h2 className="text-2xl font-bold mb-4 text-center">Accept Invitation</h2>

      {message.text && (
        <p
          className={`mb-4 p-3 rounded ${
            message.type === "success"
              ? "bg-green-100 text-green-800"
              : "bg-red-100 text-red-800"
          }`}
        >
          {message.text}
        </p>
      )}

      <form onSubmit={handleAccept} className="space-y-4">
        {/* Read-only fields */}
        <div>
          <label className="block font-semibold">Email</label>
          <input
            type="email"
            value={inviteData.email}
            readOnly
            className="w-full border px-3 py-2 rounded-md bg-gray-100"
          />
        </div>

        <div>
          <label className="block font-semibold">Subrole</label>
          <input
            type="text"
            value={inviteData.subrole?.name || ""}
            readOnly
            className="w-full border px-3 py-2 rounded-md bg-gray-100"
          />
        </div>

        <div>
          <label className="block font-semibold">Invited By</label>
          <input
            type="text"
            value={inviteData.invitedByRole || "Admin"}
            readOnly
            className="w-full border px-3 py-2 rounded-md bg-gray-100"
          />
        </div>

        {/* Editable fields */}
        {["name", "phone", "department", "speciality"].map((field) => (
          <div key={field}>
            <label className="block font-semibold capitalize">{field}</label>
            <input
              type="text"
              name={field}
              value={formData[field]}
              onChange={handleChange}
              className="w-full border px-3 py-2 rounded-md"
              required={field === "name" || field === "phone"}
            />
          </div>
        ))}

        <button
          type="submit"
          disabled={loading}
          className="w-full bg-blue-600 text-white py-2 rounded-md hover:bg-blue-700 disabled:opacity-50"
        >
          {loading ? "Processing..." : "Accept Invitation"}
        </button>
      </form>
    </div>
  );
};

export default AcceptInvitation;
