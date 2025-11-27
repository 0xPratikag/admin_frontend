import React, { useEffect, useState } from "react";
import api from "../utils/axios";
import dayjs from "dayjs";
import ScheduleMeetingModal from "./ScheduleMeetingModal";
import EditMeetingModal from "./EditMeetingModal"; // <-- Import Edit Modal
import toast, { Toaster } from "react-hot-toast";
import ClipLoader from "react-spinners/ClipLoader";

// MUI
import { DataGrid } from "@mui/x-data-grid";
import {
  Button,
  IconButton,
  Dialog,
  DialogTitle,
  DialogContent,
  Typography,
  Stack,
  Box,
} from "@mui/material";
import InfoIcon from "@mui/icons-material/Info";

const MeetingManager = () => {
  const [meetings, setMeetings] = useState([]);
  const [loading, setLoading] = useState(false);
  const [openModal, setOpenModal] = useState(false);
  const [selectedMeeting, setSelectedMeeting] = useState(null);
  const [editMeeting, setEditMeeting] = useState(null); // <-- state for edit modal

  // Fetch all meetings
  const fetchMeetings = async () => {
    setLoading(true);
    const loadingToast = toast.loading("Fetching meetings...");
    try {
      const res = await api.get("/getmeetings");
      setMeetings(res.data.data || []);
      toast.dismiss(loadingToast);
    } catch (err) {
      console.error(err);
      toast.dismiss(loadingToast);
      toast.error(err.response?.data?.message || "Failed to fetch meetings");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchMeetings();
  }, []);

  // Helper to display organizer nicely
  const renderOrganizer = (params) => {
    const org = params.row.organizer;
    const organizerModel = params.row.organizerModel;

    if (!org) return "—";

    return (
      <Typography variant="body2" noWrap>
        {org.name || org.Branch_name}{" "}
        <Typography component="span" variant="caption" color="textSecondary">
          ({organizerModel})
        </Typography>
      </Typography>
    );
  };

  // Columns definition
  const columns = [
    { field: "title", headerName: "Title", flex: 1, minWidth: 150 },
    {
      field: "organizer",
      headerName: "Organizer",
      flex: 1.5,
      minWidth: 180,
      renderCell: renderOrganizer,
    },
    {
      field: "startTime",
      headerName: "Start Time",
      flex: 1,
      valueFormatter: (params) =>
        dayjs(params.value).format("DD/MM/YYYY HH:mm"),
    },
    {
      field: "endTime",
      headerName: "End Time",
      flex: 1,
      valueFormatter: (params) =>
        dayjs(params.value).format("DD/MM/YYYY HH:mm"),
    },
    {
      field: "status",
      headerName: "Status",
      flex: 1,
      renderCell: (params) => {
        const statusColors = {
          scheduled: "bg-blue-100 text-blue-700",
          ongoing: "bg-green-100 text-green-700",
          completed: "bg-gray-200 text-gray-800",
          canceled: "bg-red-100 text-red-700",
        };
        return (
          <span
            className={`px-2 py-1 rounded text-xs font-semibold ${
              statusColors[params.value]
            }`}
          >
            {params.value}
          </span>
        );
      },
    },
    { field: "location", headerName: "Location", flex: 1 },
    {
      field: "meetingLink",
      headerName: "Meeting Link",
      flex: 1,
      renderCell: (params) =>
        params.value ? (
          <a
            href={params.value}
            target="_blank"
            rel="noopener noreferrer"
            className="text-blue-600 underline"
          >
            Join
          </a>
        ) : (
          "—"
        ),
    },
    {
      field: "isadminJoined",
      headerName: "Admin Joined?",
      flex: 0.8,
      renderCell: (params) =>
        params.value ? (
          <span className="text-green-600 font-bold">✅ Yes</span>
        ) : (
          <span className="text-red-600 font-bold">❌ No</span>
        ),
    },
    {
      field: "actions",
      headerName: "Actions",
      flex: 1,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <IconButton onClick={() => setSelectedMeeting(params.row)}>
            <InfoIcon />
          </IconButton>
       
        </Stack>
      ),
    },

       {
      field: "Edit",
      headerName: "Edit",
      flex: 1,
      renderCell: (params) => (
        <Stack direction="row" spacing={1}>
          <Button
            variant="outlined"
            size="small"
            onClick={() => setEditMeeting(params.row)}
          >
            Edit
          </Button>
        </Stack>
      ),
    },
  ];

  return (
    <div className="p-6 w-full px-20 relative">
      <Toaster position="top-right" reverseOrder={false} />

      {/* Loading Overlay */}
      {loading && (
        <Box
          sx={{
            position: "absolute",
            top: 0,
            left: 0,
            width: "100%",
            height: "100%",
            bgcolor: "rgba(255,255,255,0.7)",
            zIndex: 1000,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            flexDirection: "column",
            gap: 2,
          }}
        >
          <ClipLoader size={50} color="#3b82f6" />
          <Typography variant="h6">Loading meetings...</Typography>
        </Box>
      )}

      {/* Header */}
      <div className="flex justify-between items-center mb-6">
        <Typography variant="h4" className="flex items-center gap-2 font-bold">
          📅 Scheduled Meetings
        </Typography>
        <Button
          variant="contained"
          color="primary"
          onClick={() => setOpenModal(true)}
        >
          ➕ Schedule Meeting
        </Button>
      </div>

      {/* DataGrid */}
      <div style={{ height: 500, width: "100%" }}>
        <DataGrid
          rows={meetings}
          columns={columns}
          getRowId={(row) => row._id}
          pageSize={7}
          rowsPerPageOptions={[7, 15, 30]}
          disableSelectionOnClick
          sx={{
            borderRadius: 2,
            boxShadow: 2,
            "& .MuiDataGrid-columnHeaders": {
              backgroundColor: "#f3f4f6",
              fontWeight: "bold",
            },
          }}
        />
      </div>

      {/* Schedule Meeting Modal */}
      {openModal && (
        <ScheduleMeetingModal
          onClose={() => setOpenModal(false)}
          onSuccess={() => {
            setOpenModal(false);
            fetchMeetings();
          }}
        />
      )}

      {/* Edit Meeting Modal */}
      {editMeeting && (
        <EditMeetingModal
          open={!!editMeeting}
          meeting={editMeeting}
          onClose={() => setEditMeeting(null)}
          onSuccess={() => fetchMeetings()}
        />
      )}

      {/* Participants Dialog */}
      <Dialog
        open={!!selectedMeeting}
        onClose={() => setSelectedMeeting(null)}
        fullWidth
        maxWidth="sm"
      >
        <DialogTitle>👥 Participants</DialogTitle>
        <DialogContent>
          {selectedMeeting?.participants?.length > 0 ? (
            <Stack spacing={1} mt={1}>
              {selectedMeeting.participants.map((p) => (
                <div key={p._id}>
                  <Typography variant="body2">{p.name}</Typography>
                  <Typography variant="caption" color="textSecondary">
                    {p.email}
                  </Typography>
                </div>
              ))}
            </Stack>
          ) : (
            <Typography color="textSecondary">No participants added</Typography>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default MeetingManager;
