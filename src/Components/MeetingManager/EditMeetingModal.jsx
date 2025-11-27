import React, { useState, useEffect } from "react";
import api from "../utils/axios";
import toast, { Toaster } from "react-hot-toast";
import ClipLoader from "react-spinners/ClipLoader";

import {
  Dialog,
  DialogTitle,
  DialogContent,
  DialogActions,
  TextField,
  Button,
  Stack,
} from "@mui/material";

const EditMeetingModal = ({ open, onClose, meeting, onSuccess }) => {
  const [formData, setFormData] = useState({
    title: "",
    description: "",
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (meeting) {
      setFormData({
        title: meeting.title || "",
        description: meeting.description || "",
      });
    }
  }, [meeting]);

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmit = async () => {
    setLoading(true);
    const loadingToast = toast.loading("Updating meeting...");
    try {
      await api.put(`/updateMeeting/${meeting._id}`, formData);
      toast.dismiss(loadingToast);
      toast.success("Meeting updated successfully!");
      onSuccess();
      onClose();
    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || "Failed to update meeting");
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <Dialog open={open} onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>✏️ Edit Meeting</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            <TextField
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              fullWidth
              required
            />
            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              fullWidth
              multiline
              rows={3}
            />
          </Stack>
        </DialogContent>
        <DialogActions>
          <Button onClick={onClose} color="inherit">
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            variant="contained"
            color="primary"
            disabled={loading}
            startIcon={loading && <ClipLoader size={20} color="#fff" />}
          >
            {loading ? "Updating..." : "Update"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default EditMeetingModal;
