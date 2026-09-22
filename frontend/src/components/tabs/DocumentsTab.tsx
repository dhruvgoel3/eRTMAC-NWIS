import React, { useState, useEffect } from "react";
import { FileText, Search, Filter, Bot, ExternalLink, Sparkles, BookOpen } from "lucide-react";
import { DocumentItem } from "../../types";
import { api } from "../../services/api";

interface DocumentsTabProps {
  onAskAIAboutDoc?: (docTitle: string) => void;
}

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ onAskAIAboutDoc }) => {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);

  useEffect(() => {
    fetchDocs();
  }, [selectedType]);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedType !== "ALL") params.doc_type = selectedType;
      const data = await api.getDocuments(params);
      setDocs(data);
      if (data.length > 0 && !activeDoc) {
        setActiveDoc(data[0]);
      }
    } catch (err) {
      console.error("Failed to fetch documents", err);
    } finally {
      setLoading(false);
    }
  };

  const filteredDocs = docs.filter((d) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.file_name.toLowerCase().includes(q) ||
      (d.summary && d.summary.toLowerCase().includes(q)) ||
      (d.well_id && d.well_id.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "380px 1fr", gap: 20, height: "calc(100vh - 180px)" }}>
      {/* Left Documents List */}
      <div className="glass-card" style={{ display: "flex", flexDirection: "column", height: "100%", padding: 16 }}>
        <div className="card-header" style={{ marginBottom: 12 }}>
          <div className="card-title">
            <BookOpen size={18} color="var(--accent-cyan)" />
            Institutional Reports ({docs.length})
          </div>
        </div>

        {/* Filter Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 10, marginBottom: 14 }}>
          <input
            type="text"
            className="input-control"
            placeholder="Search report title, well ID..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />

          <select
            className="input-control"
            value={selectedType}
            onChange={(e) => setSelectedType(e.target.value)}
          >
            <option value="ALL">All Document Types</option>
            <option value="WCR">Well Completion Reports (WCR)</option>
            <option value="DDR">Daily Drilling Reports (DDR)</option>
            <option value="MUD_LOG">Mud Logging Summaries</option>
            <option value="CEMENTING">Cementing & Casing Records</option>
          </select>
        </div>

        {/* List of Documents */}
        <div
          style={{
            flex: 1,
            overflowY: "auto",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            paddingRight: 4,
          }}
        >
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
              Loading reports catalog...
            </div>
          ) : filteredDocs.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--text-muted)" }}>
              No documents matched.
            </div>
          ) : (
            filteredDocs.map((doc) => {
              const isSelected = activeDoc?.id === doc.id;

              return (
                <div
                  key={doc.id}
                  onClick={() => setActiveDoc(doc)}
                  style={{
                    background: isSelected ? "rgba(0, 210, 255, 0.12)" : "var(--bg-elevated)",
                    border: "1px solid " + (isSelected ? "var(--accent-cyan)" : "var(--border-subtle)"),
                    borderRadius: "var(--radius-sm)",
                    padding: "10px 12px",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span
                      className={`badge ${
                        doc.doc_type === "WCR"
                          ? "badge-cyan"
                          : doc.doc_type === "DDR"
                          ? "badge-amber"
                          : "badge-emerald"
                      }`}
                    >
                      {doc.doc_type}
                    </span>
                    <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {doc.well_id}
                    </span>
                  </div>

                  <strong style={{ fontSize: 13, color: isSelected ? "var(--accent-cyan)" : "inherit" }}>
                    {doc.title}
                  </strong>

                  <div style={{ fontSize: 11, color: "var(--text-secondary)", marginTop: 2 }}>
                    {doc.file_name}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Right Document Viewer */}
      <div className="glass-card" style={{ overflowY: "auto", height: "100%", padding: 24 }}>
        {activeDoc ? (
          <div>
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                borderBottom: "1px solid var(--border-subtle)",
                paddingBottom: 16,
                marginBottom: 20,
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6 }}>
                  <span className="badge badge-cyan">{activeDoc.doc_type}</span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    Well: <strong>{activeDoc.well_id || "Regional"}</strong>
                  </span>
                  <span style={{ fontSize: 12, color: "var(--text-muted)" }}>
                    File: <code>{activeDoc.file_name}</code>
                  </span>
                </div>
                <h1 style={{ fontSize: 20, fontWeight: 700 }}>{activeDoc.title}</h1>
              </div>

              {onAskAIAboutDoc && (
                <button
                  className="btn-primary"
                  onClick={() => onAskAIAboutDoc(activeDoc.title)}
                >
                  <Bot size={14} />
                  Ask AI About This Report
                </button>
              )}
            </div>

            {/* Document Summary */}
            <div style={{ marginBottom: 24 }}>
              <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                EXECUTIVE ENGINEERING SUMMARY
              </h3>
              <div
                style={{
                  background: "var(--bg-elevated)",
                  padding: 16,
                  borderRadius: "var(--radius-md)",
                  border: "1px solid var(--border-subtle)",
                  fontSize: 13,
                  lineHeight: 1.6,
                  color: "var(--text-secondary)",
                }}
              >
                {activeDoc.summary}
              </div>
            </div>

            {/* Key Findings */}
            {activeDoc.key_findings && (
              <div>
                <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)", marginBottom: 8 }}>
                  EXTRACTED DRILLING LESSONS & CRITICAL FINDINGS
                </h3>
                <div
                  style={{
                    background: "rgba(11, 17, 32, 0.7)",
                    padding: 16,
                    borderRadius: "var(--radius-md)",
                    border: "1px solid var(--border-subtle)",
                    fontSize: 13,
                    lineHeight: 1.6,
                    color: "var(--text-primary)",
                  }}
                >
                  <ul style={{ paddingLeft: 20, display: "flex", flexDirection: "column", gap: 8 }}>
                    {activeDoc.key_findings.split("\n").map((finding, idx) => (
                      <li key={idx}>{finding.replace(/^[•\-\*]\s*/, "")}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: 40, textAlign: "center", color: "var(--text-muted)" }}>
            Select a document from the left catalog to inspect.
          </div>
        )}
      </div>
    </div>
  );
};
