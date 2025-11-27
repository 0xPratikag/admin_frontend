// TherapyCatalog.tsx
import React, { useState } from "react";
import {
  Stethoscope,
  Blocks,
  TestTube,
  Filter,
  Download,
  Settings,
} from "lucide-react";
import { TherapyCatalogContent, Button } from "./CatalogPanels";

export default function TherapyCatalog() {
  const [activeTab, setActiveTab] = useState<"therapies" | "subtherapies" | "tests">("therapies");
  const [selectedTherapyId, setSelectedTherapyId] = useState<string | null>(null);

  const tabs = [
    { id: "therapies", label: "Therapies", icon: <Stethoscope className="w-4 h-4" /> },
    { id: "subtherapies", label: "Sub-therapies", icon: <Blocks className="w-4 h-4" /> },
    { id: "tests", label: "Tests", icon: <TestTube className="w-4 h-4" /> },
  ] as const;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-100 via-white to-gray-100 p-6">
      <div className="max-w-[1400px] mx-auto space-y-6">
        {/* Header */}
        <div className="bg-white rounded-3xl shadow-xl p-6 border border-gray-200">
          <div className="flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-blue-600 via-purple-600 to-pink-600 flex items-center justify-center shadow-lg">
                <Stethoscope className="w-8 h-8 text-white" />
              </div>
              <div>
                <h1 className="text-3xl font-black text-gray-900">Therapy Catalog</h1>
                <p className="text-gray-600 font-medium">Complete therapy management system</p>
              </div>
            </div>
            <div className="flex items-center gap-2">
              <Button variant="outline" size="sm" icon={<Filter className="w-4 h-4" />}>Filter</Button>
              <Button variant="outline" size="sm" icon={<Download className="w-4 h-4" />}>Export</Button>
              <Button variant="outline" size="sm" icon={<Settings className="w-4 h-4" />}>Settings</Button>
            </div>
          </div>
        </div>

        {/* Tabs */}
        <div className="bg-white rounded-2xl shadow-lg p-2 border border-gray-200">
          <div className="flex gap-2">
            {tabs.map((tab) => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-bold transition-all duration-300 ${
                  activeTab === tab.id
                    ? "bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg"
                    : "bg-gray-50 text-gray-600 hover:bg-gray-100"
                }`}
              >
                {tab.icon}
                {tab.label}
              </button>
            ))}
          </div>
        </div>

        {/* Content */}
        <TherapyCatalogContent
          activeTab={activeTab}
          selectedTherapyId={selectedTherapyId}
          onSelectTherapy={setSelectedTherapyId}
        />
      </div>
    </div>
  );
}
