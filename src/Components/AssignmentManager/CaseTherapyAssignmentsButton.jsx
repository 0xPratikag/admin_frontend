// src/components/CaseTherapyAssignmentsButton.jsx
import React, { useState } from "react";
import { Button, Tooltip } from "antd";
import { TeamOutlined } from "@ant-design/icons";
import TherapyAssignmentDetailsModal from "./TherapyAssignmentDetailsModal";

const CaseTherapyAssignmentsButton = ({ caseId, therapyId }) => {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Tooltip title="View therapists & assistants for this therapy">
        <Button
          size="small"
          type="primary"
          icon={<TeamOutlined />}
          onClick={() => setOpen(true)}
        >
          Staff Map
        </Button>
      </Tooltip>

      {open && (
        <TherapyAssignmentDetailsModal
          open={open}
          onClose={() => setOpen(false)}
          caseId={caseId}
          therapyId={therapyId}
        />
      )}
    </>
  );
};

export default CaseTherapyAssignmentsButton;
