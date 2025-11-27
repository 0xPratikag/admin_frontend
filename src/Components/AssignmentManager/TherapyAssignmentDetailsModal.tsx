import React, { useEffect, useState } from "react";
import {
  Modal,
  Spin,
  Alert,
  Tag,
  Collapse,
  Table,
  Statistic,
  Row,
  Col,
  Card,
  Typography,
  Divider,
  Space,
} from "antd";
import type { ColumnsType } from "antd/es/table";
import {
  TeamOutlined,
  UserOutlined,
  UsergroupAddOutlined,
  ClockCircleOutlined,
  PhoneOutlined,
  MailOutlined,
  CalendarOutlined,
} from "@ant-design/icons";
import { getTherapyAssignmentSummary } from "../../api/assignmentSummaryApi";

const { Title, Text } = Typography;
const { Panel } = Collapse;

interface Assistant {
  assistantId: string;
  assistant_name: string;
  assistant_phone?: string;
  assistant_email?: string;
  totalSlots: number;
  subTherapySlots: number;
  testSlots: number;
}

interface Slot {
  date: string;
  from_time: string;
  to_time: string;
  kind: "subtherapy" | "test";
  target_name: string;
  assistants?: Array<{
    assistantId: string;
    assistant_name: string;
  }>;
}

interface Therapist {
  therapistId: string;
  therapist_name: string;
  therapist_phone?: string;
  therapist_email?: string;
  totalSlots: number;
  subTherapySlots: number;
  testSlots: number;
  assistantsCount: number;
  assistants: Assistant[];
  slots: Slot[];
}

interface SubTherapy {
  subTherapyId: string;
  subTherapy_name: string;
  therapistsCount: number;
  assistantsCount: number;
}

interface Test {
  testId: string;
  test_name: string;
  therapistsCount: number;
  assistantsCount: number;
}

interface CaseInfo {
  p_id: string;
  patient_name: string;
  patient_phone?: string;
  case_type?: string;
}

interface TherapyInfo {
  name: string;
  description?: string;
}

interface Totals {
  therapists: number;
  assistants: number;
  slots: number;
}

interface AssignmentSummary {
  case: CaseInfo;
  therapy: TherapyInfo;
  totals: Totals;
  therapists: Therapist[];
  subTherapies: SubTherapy[];
  tests: Test[];
  assistants: Array<{
    assistantId: string;
    assistant_name: string;
  }>;
}

interface TherapyAssignmentDetailsModalProps {
  open: boolean;
  onClose: () => void;
  caseId: string;
  therapyId: string;
}

const TherapyAssignmentDetailsModal: React.FC<
  TherapyAssignmentDetailsModalProps
> = ({ open, onClose, caseId, therapyId }) => {
  const [loading, setLoading] = useState(false);
  const [summary, setSummary] = useState<AssignmentSummary | null>(null);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!open || !caseId || !therapyId) return;

    setLoading(true);
    setError(null);

    getTherapyAssignmentSummary(caseId, therapyId)
      .then((data) => {
        setSummary(data);
      })
      .catch((err: any) => {
        const msg =
          err?.response?.data?.error ||
          err?.message ||
          "Failed to load assignment summary";
        setError(msg);
      })
      .finally(() => {
        setLoading(false);
      });
  }, [open, caseId, therapyId]);

  const assistantsColumns: ColumnsType<Assistant> = [
    {
      title: "Assistant",
      dataIndex: "assistant_name",
      key: "assistant_name",
      render: (name: string) => (
        <Text strong className="text-gray-900">
          {name || "(Unnamed)"}
        </Text>
      ),
    },
    {
      title: "Total Slots",
      dataIndex: "totalSlots",
      key: "totalSlots",
      width: 120,
      render: (count: number) => (
        <Tag color="blue" className="font-semibold">
          {count}
        </Tag>
      ),
    },
    {
      title: "Sub-therapy",
      dataIndex: "subTherapySlots",
      key: "subTherapySlots",
      width: 120,
      render: (count: number) => (
        <Tag color="green" className="font-semibold">
          {count}
        </Tag>
      ),
    },
    {
      title: "Tests",
      dataIndex: "testSlots",
      key: "testSlots",
      width: 100,
      render: (count: number) => (
        <Tag color="purple" className="font-semibold">
          {count}
        </Tag>
      ),
    },
    {
      title: "Contact",
      key: "contact",
      render: (_: any, row: Assistant) =>
        row.assistant_phone || row.assistant_email ? (
          <div className="space-y-1">
            {row.assistant_phone && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <PhoneOutlined className="text-indigo-600" />
                <span>{row.assistant_phone}</span>
              </div>
            )}
            {row.assistant_email && (
              <div className="flex items-center gap-1.5 text-xs text-gray-600">
                <MailOutlined className="text-indigo-600" />
                <span>{row.assistant_email}</span>
              </div>
            )}
          </div>
        ) : (
          <Text type="secondary">N/A</Text>
        ),
    },
  ];

  const slotsColumns: ColumnsType<Slot> = [
    {
      title: "Date",
      dataIndex: "date",
      key: "date",
      width: 120,
      render: (date: string) => (
        <div className="flex items-center gap-2">
          <CalendarOutlined className="text-indigo-600" />
          <span className="font-semibold text-gray-900">{date}</span>
        </div>
      ),
    },
    {
      title: "Time",
      key: "time",
      width: 150,
      render: (_: any, row: Slot) => (
        <div className="flex items-center gap-2">
          <ClockCircleOutlined className="text-indigo-600" />
          <span className="text-gray-700 font-medium">
            {row.from_time} — {row.to_time}
          </span>
        </div>
      ),
    },
    {
      title: "Type",
      dataIndex: "kind",
      key: "kind",
      width: 120,
      render: (kind: string) => (
        <Tag
          color={kind === "subtherapy" ? "green" : "blue"}
          className="font-semibold"
        >
          {kind === "subtherapy" ? "Sub-therapy" : kind === "test" ? "Test" : "-"}
        </Tag>
      ),
    },
    {
      title: "Target",
      dataIndex: "target_name",
      key: "target_name",
      render: (name: string) => (
        <Text strong className="text-gray-900">
          {name}
        </Text>
      ),
    },
    {
      title: "Assistants",
      key: "assistants",
      render: (_: any, row: Slot) =>
        row.assistants?.length ? (
          <Space size="small" wrap>
            {row.assistants.map((a) => (
              <Tag key={a.assistantId} color="cyan" className="font-medium">
                {a.assistant_name || "Unnamed"}
              </Tag>
            ))}
          </Space>
        ) : (
          <Text type="secondary">No assistants</Text>
        ),
    },
  ];

  const subTherapyColumns: ColumnsType<SubTherapy> = [
    {
      title: "Sub-therapy",
      dataIndex: "subTherapy_name",
      key: "subTherapy_name",
      render: (name: string) => (
        <Text strong className="text-gray-900">
          {name}
        </Text>
      ),
    },
    {
      title: "Therapists",
      dataIndex: "therapistsCount",
      key: "therapistsCount",
      width: 120,
      render: (count: number) => (
        <Tag color="processing" icon={<UserOutlined />} className="font-semibold">
          {count}
        </Tag>
      ),
    },
    {
      title: "Assistants",
      dataIndex: "assistantsCount",
      key: "assistantsCount",
      width: 120,
      render: (count: number) => (
        <Tag color="cyan" icon={<UsergroupAddOutlined />} className="font-semibold">
          {count}
        </Tag>
      ),
    },
  ];

  const testColumns: ColumnsType<Test> = [
    {
      title: "Test",
      dataIndex: "test_name",
      key: "test_name",
      render: (name: string) => (
        <Text strong className="text-gray-900">
          {name}
        </Text>
      ),
    },
    {
      title: "Therapists",
      dataIndex: "therapistsCount",
      key: "therapistsCount",
      width: 120,
      render: (count: number) => (
        <Tag color="processing" icon={<UserOutlined />} className="font-semibold">
          {count}
        </Tag>
      ),
    },
    {
      title: "Assistants",
      dataIndex: "assistantsCount",
      key: "assistantsCount",
      width: 120,
      render: (count: number) => (
        <Tag color="cyan" icon={<UsergroupAddOutlined />} className="font-semibold">
          {count}
        </Tag>
      ),
    },
  ];

  const renderContent = () => {
    if (loading) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-4">
          <Spin size="large" />
          <Text className="text-gray-600">
            Loading therapist & assistant mapping...
          </Text>
        </div>
      );
    }

    if (error) {
      return (
        <Alert
          type="error"
          message="Error Loading Data"
          description={error}
          showIcon
          className="rounded-xl"
        />
      );
    }

    if (!summary) {
      return (
        <div className="flex flex-col items-center justify-center py-16 gap-3">
          <div className="w-20 h-20 rounded-2xl bg-gray-100 flex items-center justify-center">
            <TeamOutlined className="text-4xl text-gray-400" />
          </div>
          <Text type="secondary" className="text-base">
            No assignments found for this case + therapy.
          </Text>
        </div>
      );
    }

    const { case: caseInfo, therapy, totals } = summary;

    return (
      <div className="assignment-modal-body space-y-6">
        {/* Top cards with gradient backgrounds */}
        <Row gutter={[16, 16]}>
          <Col xs={24} md={12}>
            <Card
              className="rounded-2xl shadow-lg border-2 border-indigo-100 hover:shadow-xl transition-all"
              style={{
                background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
              }}
              bordered={false}
            >
              <div className="text-white">
                <Title level={5} className="!text-white !mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <UserOutlined />
                  </div>
                  Case Information
                </Title>
                <div className="space-y-2 bg-white/10 rounded-xl p-4 backdrop-blur">
                  <div className="flex items-start gap-2">
                    <Text strong className="!text-white/80 min-w-[80px]">
                      Patient ID:
                    </Text>
                    <Text className="!text-white font-semibold">
                      {caseInfo?.p_id}
                    </Text>
                  </div>
                  <div className="flex items-start gap-2">
                    <Text strong className="!text-white/80 min-w-[80px]">
                      Patient:
                    </Text>
                    <Text className="!text-white font-semibold">
                      {caseInfo?.patient_name}
                    </Text>
                  </div>
                  <div className="flex items-start gap-2">
                    <Text strong className="!text-white/80 min-w-[80px]">
                      Phone:
                    </Text>
                    <Text className="!text-white">
                      {caseInfo?.patient_phone || "N/A"}
                    </Text>
                  </div>
                  <div className="flex items-start gap-2">
                    <Text strong className="!text-white/80 min-w-[80px]">
                      Case Type:
                    </Text>
                    <Text className="!text-white">
                      {caseInfo?.case_type || "-"}
                    </Text>
                  </div>
                </div>
              </div>
            </Card>
          </Col>

          <Col xs={24} md={12}>
            <Card
              className="rounded-2xl shadow-lg border-2 border-purple-100 hover:shadow-xl transition-all"
              style={{
                background: "linear-gradient(135deg, #f093fb 0%, #f5576c 100%)",
              }}
              bordered={false}
            >
              <div className="text-white">
                <Title level={5} className="!text-white !mb-4 flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-white/20 flex items-center justify-center">
                    <TeamOutlined />
                  </div>
                  Therapy Details
                </Title>
                <div className="space-y-3">
                  <div className="bg-white/10 rounded-xl p-4 backdrop-blur">
                    <Text strong className="!text-white text-lg">
                      {therapy?.name}
                    </Text>
                    {therapy?.description && (
                      <div className="mt-2">
                        <Text className="!text-white/80 text-sm">
                          {therapy?.description}
                        </Text>
                      </div>
                    )}
                  </div>
                  <Row gutter={8}>
                    <Col span={8}>
                      <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur">
                        <div className="text-2xl font-bold text-white">
                          {totals?.therapists}
                        </div>
                        <div className="text-xs text-white/80 mt-1">
                          Therapists
                        </div>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur">
                        <div className="text-2xl font-bold text-white">
                          {totals?.assistants}
                        </div>
                        <div className="text-xs text-white/80 mt-1">
                          Assistants
                        </div>
                      </div>
                    </Col>
                    <Col span={8}>
                      <div className="bg-white/10 rounded-xl p-3 text-center backdrop-blur">
                        <div className="text-2xl font-bold text-white">
                          {totals?.slots}
                        </div>
                        <div className="text-xs text-white/80 mt-1">
                          Total Slots
                        </div>
                      </div>
                    </Col>
                  </Row>
                </div>
              </div>
            </Card>
          </Col>
        </Row>

        {/* Therapist wise detail */}
        <Card
          className="rounded-2xl shadow-lg border-2 border-indigo-100"
          bordered={false}
          title={
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center">
                <TeamOutlined className="text-white text-lg" />
              </div>
              <span className="text-lg font-bold text-gray-900">
                Therapists & Assistants
              </span>
            </div>
          }
        >
          {summary.therapists?.length ? (
            <Collapse
              ghost
              expandIconPosition="end"
              className="custom-collapse"
            >
              {summary.therapists.map((th) => (
                <Panel
                  key={th.therapistId}
                  header={
                    <div className="flex items-center justify-between pr-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-indigo-100 flex items-center justify-center">
                          <UserOutlined className="text-indigo-600 text-lg" />
                        </div>
                        <div>
                          <Text strong className="text-base text-gray-900">
                            {th.therapist_name || "Unnamed"}
                          </Text>
                          {th.therapist_phone && (
                            <div className="flex items-center gap-1.5 text-xs text-gray-500 mt-0.5">
                              <PhoneOutlined />
                              <span>{th.therapist_phone}</span>
                            </div>
                          )}
                        </div>
                      </div>
                      <Space size="small" wrap>
                        <Tag color="blue" className="font-semibold">
                          {th.totalSlots} Slots
                        </Tag>
                        <Tag color="green" className="font-semibold">
                          {th.subTherapySlots} Sub
                        </Tag>
                        <Tag color="purple" className="font-semibold">
                          {th.testSlots} Tests
                        </Tag>
                        <Tag color="cyan" className="font-semibold">
                          {th.assistantsCount} Assist.
                        </Tag>
                      </Space>
                    </div>
                  }
                  className="bg-gray-50 rounded-xl mb-3 border border-gray-200 overflow-hidden"
                >
                  <div className="space-y-6 p-4">
                    {/* Assistants table */}
                    <div>
                      <Title level={5} className="!mb-3 flex items-center gap-2">
                        <UsergroupAddOutlined className="text-indigo-600" />
                        <span>Assistants</span>
                      </Title>
                      {th.assistants?.length ? (
                        <Table
                          size="small"
                          rowKey="assistantId"
                          columns={assistantsColumns}
                          dataSource={th.assistants}
                          pagination={false}
                          className="custom-table rounded-xl overflow-hidden shadow-sm"
                        />
                      ) : (
                        <div className="bg-gray-100 rounded-xl p-4 text-center">
                          <Text type="secondary">
                            No assistants assigned to this therapist in this therapy.
                          </Text>
                        </div>
                      )}
                    </div>

                    <Divider className="!my-4" />

                    {/* Slot timeline */}
                    <div>
                      <Title level={5} className="!mb-3 flex items-center gap-2">
                        <ClockCircleOutlined className="text-indigo-600" />
                        <span>Scheduled Slots</span>
                      </Title>
                      {th.slots?.length ? (
                        <Table
                          size="small"
                          rowKey={(row, idx) => `${th.therapistId}-${idx}`}
                          columns={slotsColumns}
                          dataSource={th.slots}
                          pagination={false}
                          className="custom-table rounded-xl overflow-hidden shadow-sm"
                        />
                      ) : (
                        <div className="bg-gray-100 rounded-xl p-4 text-center">
                          <Text type="secondary">
                            No slots scheduled for this therapist.
                          </Text>
                        </div>
                      )}
                    </div>
                  </div>
                </Panel>
              ))}
            </Collapse>
          ) : (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <Text type="secondary" className="text-base">
                No therapists assigned to this therapy for this case.
              </Text>
            </div>
          )}
        </Card>

        {/* Sub-therapy and Test wise summary */}
        <Row gutter={[16, 16]}>
          <Col xs={24} lg={12}>
            <Card
              className="rounded-2xl shadow-lg border-2 border-emerald-100 h-full"
              bordered={false}
              title={
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-emerald-100 flex items-center justify-center">
                    <span className="text-emerald-600 font-bold">S</span>
                  </div>
                  <span className="font-bold text-gray-900">
                    Sub-therapy Summary
                  </span>
                </div>
              }
            >
              {summary.subTherapies?.length ? (
                <Table
                  size="small"
                  rowKey="subTherapyId"
                  columns={subTherapyColumns}
                  dataSource={summary.subTherapies}
                  pagination={false}
                  className="custom-table"
                />
              ) : (
                <div className="bg-emerald-50 rounded-xl p-6 text-center">
                  <Text type="secondary">
                    No sub-therapy assignments for this therapy.
                  </Text>
                </div>
              )}
            </Card>
          </Col>

          <Col xs={24} lg={12}>
            <Card
              className="rounded-2xl shadow-lg border-2 border-sky-100 h-full"
              bordered={false}
              title={
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-lg bg-sky-100 flex items-center justify-center">
                    <span className="text-sky-600 font-bold">T</span>
                  </div>
                  <span className="font-bold text-gray-900">Test Summary</span>
                </div>
              }
            >
              {summary.tests?.length ? (
                <Table
                  size="small"
                  rowKey="testId"
                  columns={testColumns}
                  dataSource={summary.tests}
                  pagination={false}
                  className="custom-table"
                />
              ) : (
                <div className="bg-sky-50 rounded-xl p-6 text-center">
                  <Text type="secondary">
                    No test assignments for this therapy.
                  </Text>
                </div>
              )}
            </Card>
          </Col>
        </Row>

        {/* All assistants list */}
        {summary.assistants?.length ? (
          <Card
            className="rounded-2xl shadow-lg border-2 border-cyan-100"
            bordered={false}
            title={
              <div className="flex items-center gap-2">
                <div className="w-8 h-8 rounded-lg bg-cyan-100 flex items-center justify-center">
                  <UsergroupAddOutlined className="text-cyan-600" />
                </div>
                <span className="font-bold text-gray-900">
                  All Assistants ({summary.assistants.length})
                </span>
              </div>
            }
          >
            <Space size="small" wrap>
              {summary.assistants.map((a) => (
                <Tag
                  key={a.assistantId}
                  color="cyan"
                  className="px-4 py-2 text-sm font-medium rounded-lg"
                >
                  {a.assistant_name || "Unnamed"}
                </Tag>
              ))}
            </Space>
          </Card>
        ) : null}
      </div>
    );
  };

  return (
    <Modal
      open={open}
      onCancel={onClose}
      onOk={onClose}
      width={1200}
      destroyOnClose
      className="assignment-modal-modern"
      footer={[
        <button
          key="close"
          onClick={onClose}
          className="px-6 py-2.5 rounded-xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-semibold shadow-lg shadow-indigo-500/30 transition-all"
        >
          Close
        </button>,
      ]}
      title={
        <div className="flex items-center gap-3 py-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center shadow-lg">
            <TeamOutlined className="text-white text-xl" />
          </div>
          <div>
            <div className="text-xl font-bold text-gray-900">
              Therapy Staff Map
            </div>
            <div className="text-xs text-gray-500 font-normal mt-0.5">
              Complete assignment overview for this therapy
            </div>
          </div>
        </div>
      }
    >
      {renderContent()}
    </Modal>
  );
};

export default TherapyAssignmentDetailsModal;