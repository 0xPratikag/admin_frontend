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
  MenuItem,
  Button,
  Stack,
  Checkbox,
  FormControlLabel,
  Autocomplete,
  IconButton,
  InputAdornment,
  Box,
} from "@mui/material";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { DateTimePicker } from "@mui/x-date-pickers/DateTimePicker";
import { AdapterDayjs } from "@mui/x-date-pickers/AdapterDayjs";
import LinkIcon from "@mui/icons-material/Link";

const ScheduledSession = ({ onClose, onSuccess }) => {
  const user = JSON.parse(localStorage.getItem("user"));
  const token = localStorage.getItem("token");

  const [loadingLink, setLoadingLink] = useState(false);
  const [loadingSubmit, setLoadingSubmit] = useState(false);
  const [invites, setInvites] = useState([]);

  const [formData, setFormData] = useState({
    title: "",
    description: "",
    organizer: user.id,
    organizerModel: user?.subrole ? "Invite" : "Admin",
    startTime: null,
    endTime: null,
    location: "Online",
    meetingLink: "",
    status: "scheduled",
    participants: [],
    isadminJoined: !user?.subrole ? true : false,
    isRecurring: false,
    recurrence: "none",
  });

  // Fetch invites
  useEffect(() => {
    const fetchInvites = async () => {
      try {
        const res = await api.get("/invites", {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (res.data.success) setInvites(res.data.invites);
      } catch (err) {
        console.error(err);
        toast.error("Failed to fetch invites!");
      }
    };
    fetchInvites();
  }, []);

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData((prev) => ({
      ...prev,
      [name]: type === "checkbox" ? checked : value,
    }));
  };

  const handleDateChange = (name, value) => {
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleGenerateLink = async () => {
    if (!formData.startTime || !formData.endTime) {
      toast.error("Please select start and end time first!");
      return;
    }

    setLoadingLink(true);
    toast.loading("Generating Google Meet link...");
    try {
      const { data } = await api.post("/generateGoogleMeet", {
        title: formData.title || "Untitled Meeting",
        startTime: formData.startTime,
        endTime: formData.endTime,
      });
      setFormData((prev) => ({ ...prev, meetingLink: data.meetLink }));
      toast.dismiss();
      toast.success("Meeting link generated!");
    } catch (err) {
      console.error(err);
      toast.dismiss();
      toast.error("Failed to generate link!");
    } finally {
      setLoadingLink(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoadingSubmit(true);
    const loadingToast = toast.loading("Saving meeting...");
    try {
      await api.post("/createMeeting", formData);
      toast.dismiss(loadingToast);
      toast.success("Meeting scheduled successfully!");
      onSuccess();
    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error("Failed to schedule meeting!");
    } finally {
      setLoadingSubmit(false);
    }
  };

  const participantOptions = invites
    .map((inv) => ({ label: inv.email || inv.name, id: inv._id }))
    .filter((inv) => !formData.participants.includes(inv.id));

  return (
    <>
      <Toaster position="top-right" reverseOrder={false} />
      <Dialog open onClose={onClose} maxWidth="sm" fullWidth>
        <DialogTitle>📅 Schedule a Meeting</DialogTitle>
        <DialogContent dividers>
          <Stack spacing={2} mt={1}>
            {/* Title */}
            <TextField
              label="Title"
              name="title"
              value={formData.title}
              onChange={handleChange}
              required
              fullWidth
            />

            {/* Description */}
            <TextField
              label="Description"
              name="description"
              value={formData.description}
              onChange={handleChange}
              multiline
              rows={3}
              fullWidth
            />

            {/* Date Pickers */}
            <LocalizationProvider dateAdapter={AdapterDayjs}>
              <DateTimePicker
                label="Start Time"
                value={formData.startTime}
                onChange={(newValue) => handleDateChange("startTime", newValue)}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
              <DateTimePicker
                label="End Time"
                value={formData.endTime}
                onChange={(newValue) => handleDateChange("endTime", newValue)}
                slotProps={{ textField: { fullWidth: true, required: true } }}
              />
            </LocalizationProvider>

            {/* Location */}
            <TextField
              label="Location"
              name="location"
              value={formData.location}
              onChange={handleChange}
              fullWidth
            />

            {/* Meeting Link */}
            <TextField
              label="Meeting Link"
              name="meetingLink"
              value={formData.meetingLink}
              onChange={handleChange}
              fullWidth
              InputProps={{
                endAdornment: (
                  <InputAdornment position="end">
                    <IconButton onClick={handleGenerateLink} disabled={loadingLink}>
                      {loadingLink ? (
                        <ClipLoader size={20} color="#3b82f6" />
                      ) : (
                        <LinkIcon />
                      )}
                    </IconButton>
                  </InputAdornment>
                ),
              }}
              helperText="Paste link manually or click 🔗 to auto-generate Google Meet link"
            />

            {/* Participants */}
            <Autocomplete
              multiple
              options={participantOptions}
              getOptionLabel={(option) => option.label}
              value={formData.participants.map((id) => {
                const inv = invites.find((i) => i._id === id);
                return inv ? { label: inv.email || inv.name, id: inv._id } : { label: id, id };
              })}
              onChange={(e, newValue) =>
                setFormData((prev) => ({
                  ...prev,
                  participants: newValue.map((v) => v.id),
                }))
              }
              renderInput={(params) => <TextField {...params} label="Participants" />}
            />

            {/* Checkboxes */}
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isadminJoined}
                  onChange={handleChange}
                  name="isadminJoined"
                />
              }
              label="Admin Joined?"
            />
            <FormControlLabel
              control={
                <Checkbox
                  checked={formData.isRecurring}
                  onChange={handleChange}
                  name="isRecurring"
                />
              }
              label="Recurring Meeting"
            />

            {formData.isRecurring && (
              <TextField
                select
                label="Recurrence Pattern"
                name="recurrence"
                value={formData.recurrence}
                onChange={handleChange}
                fullWidth
              >
                <MenuItem value="daily">Daily</MenuItem>
                <MenuItem value="none">None</MenuItem>
                <MenuItem value="weekly">Weekly</MenuItem>
                <MenuItem value="monthly">Monthly</MenuItem>
              </TextField>
            )}
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
            disabled={loadingSubmit}
            startIcon={loadingSubmit && <ClipLoader size={20} color="#fff" />}
          >
            {loadingSubmit ? "Saving..." : "Save Meeting"}
          </Button>
        </DialogActions>
      </Dialog>
    </>
  );
};

export default ScheduledSession;
