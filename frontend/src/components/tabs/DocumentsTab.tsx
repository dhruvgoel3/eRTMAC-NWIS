import React, { useState, useEffect } from "react";
import { FileText, Search, Bot, BookOpen, Tag, Calendar } from "lucide-react";
import { DocumentItem } from "../../types";
import { api } from "../../services/api";

interface DocumentsTabProps {
  onAskAIAboutDoc?: (docTitle: string) => void;
}

const DOC_TYPE_BADGE: Record<string, string> = {
  WCR:        "badge-canopy",
  DDR:        "badge-amber",
  MUD_LOG:    "badge-emerald",
  CEMENTING:  "badge-violet",
};

export const DocumentsTab: React.FC<DocumentsTabProps> = ({ onAskAIAboutDoc }) => {
  const [docs, setDocs] = useState<DocumentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [selectedType, setSelectedType] = useState("ALL");
  const [searchQuery, setSearchQuery] = useState("");
  const [activeDoc, setActiveDoc] = useState<DocumentItem | null>(null);

  useEffect(() => { fetchDocs(); }, [selectedType]);

  const fetchDocs = async () => {
    try {
      setLoading(true);
      const params: any = {};
      if (selectedType !== "ALL") params.doc_type = selectedType;
      const data = await api.getDocuments(params);
      setDocs(data);
      if (data.length > 0 && !activeDoc) setActiveDoc(data[0]);
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
      (d.title && d.title.toLowerCase().includes(q)) ||
      (d.file_name && d.file_name.toLowerCase().includes(q)) ||
      (d.summary && d.summary.toLowerCase().includes(q)) ||
      (d.well_id && d.well_id.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ display: "grid", gridTemplateColumns: "360px 1fr", gap: 20, height: "calc(100vh - 220px)" }}>

      {/* Document List */}
      <div className="glass-card" style={{ display: "flex", flexDirection: "column", height: "100%", padding: "16px" }}>
        <div className="card-header" style={{ marginBottom: 14 }}>
          <div className="card-title">
            <BookOpen size={16} color="var(--color-canopy)" />
            Institutional Reports ({docs.length})
          </div>
        </div>

        {/* Filters */}
        <div style={{ display: "flex", flexDirection: "column", gap: 8, marginBottom: 14 }}>
          <div style={{ position: "relative" }}>
            <Search size={13} style={{ position: "absolute", left: 9, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted-slate)" }} />
            <input
              type="text"
              className="input-control"
              style={{ paddingLeft: 28 }}
              placeholder="Search report title, well ID…"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
            />
          </div>
          <select className="input-control" value={selectedType} onChange={(e) => setSelectedType(e.target.value)}>
            <option value="ALL">All Document Types</option>
            <option value="WCR">Well Completion Reports (WCR)</option>
            <option value="DDR">Daily Drilling Reports (DDR)</option>
            <option value="MUD_LOG">Mud Logging Summaries</option>
            <option value="CEMENTING">Cementing &amp; Casing Records</option>
          </select>
        </div>

        {/* Doc List */}
        <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 6, paddingRight: 4 }}>
          {loading ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--color-muted-slate)" }}>Loading reports…</div>
          ) : filteredDocs.length === 0 ? (
            <div style={{ padding: 20, textAlign: "center", color: "var(--color-muted-slate)" }}>No documents matched.</div>
          ) : (
            filteredDocs.map((doc) => {
              const isSelected = activeDoc?.id === doc.id;
              return (
                <div
                  key={doc.id}
                  onClick={() => setActiveDoc(doc)}
                  style={{
                    padding: "10px 12px",
                    borderRadius: 8,
                    border: "1px solid",
                    borderColor: isSelected ? "var(--color-canopy)" : "var(--color-sage-mist)",
                    background: isSelected ? "rgba(16,67,54,0.06)" : "var(--bg-elevated)",
                    cursor: "pointer",
                    transition: "all 0.15s ease",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 4 }}>
                    <span className={`badge ${DOC_TYPE_BADGE[doc.doc_type] || "badge-canopy"}`}>
                      {doc.doc_type}
                    </span>
                    <span style={{ fontSize: 10, color: "var(--color-muted-slate)", fontWeight: 600 }}>
                      {doc.well_id}
                    </span>
                  </div>
                  <strong style={{ fontSize: 13, color: isSelected ? "var(--color-canopy)" : "var(--color-bark)", display: "block", lineHeight: 1.4 }}>
                    {doc.title}
                  </strong>
                  <div style={{ fontSize: 11, color: "var(--color-muted-slate)", marginTop: 2 }}>
                    {doc.file_name}
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Document Viewer */}
      <div className="glass-card" style={{ overflowY: "auto", height: "100%", padding: 28 }}>
        {activeDoc ? (
          <div>
            {/* Header */}
            <div
              style={{
                display: "flex",
                alignItems: "flex-start",
                justifyContent: "space-between",
                paddingBottom: 20,
                marginBottom: 24,
                borderBottom: "1px solid var(--color-sage-mist)",
              }}
            >
              <div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 8 }}>
                  <span className={`badge ${DOC_TYPE_BADGE[activeDoc.doc_type] || "badge-canopy"}`}>
                    {activeDoc.doc_type}
                  </span>
                  <span style={{ fontSize: 12, color: "var(--color-muted-slate)" }}>
                    Well: <strong style={{ color: "var(--color-canopy)" }}>{activeDoc.well_id || "Regional"}</strong>
                  </span>
                  <span style={{ fontSize: 12, color: "var(--color-muted-slate)" }}>
                    <code style={{ background: "var(--bg-elevated)", padding: "2px 6px", borderRadius: 4, border: "1px solid var(--color-sage-mist)", fontSize: 11 }}>
                      {activeDoc.file_name}
                    </code>
                  </span>
                </div>
                <h1 style={{ fontSize: 22, fontWeight: 500, color: "var(--color-ink)", letterSpacing: "-0.02em", lineHeight: 1.2 }}>
                  {activeDoc.title}
                </h1>
              </div>

              {onAskAIAboutDoc && (
                <button
                  className="btn-primary"
                  onClick={() => onAskAIAboutDoc(activeDoc.title)}
                  style={{ flexShrink: 0, gap: 6 }}
                >
                  <Bot size={13} />
                  Ask AI About This Report
                </button>
              )}
            </div>

            {/* Summary */}
            <div style={{ marginBottom: 28 }}>
              <div
                style={{
                  fontSize: 10,
                  fontWeight: 700,
                  letterSpacing: "0.07em",
                  textTransform: "uppercase",
                  color: "var(--color-muted-slate)",
                  marginBottom: 12,
                }}
              >
                Executive Engineering Summary
              </div>
              <div
                style={{
                  background: "var(--bg-elevated)",
                  padding: "18px 20px",
                  borderRadius: 10,
                  border: "1px solid var(--color-sage-mist)",
                  fontSize: 13,
                  lineHeight: 1.7,
                  color: "var(--color-slate)",
                }}
              >
                {activeDoc.summary}
              </div>
            </div>

            {/* Key Findings */}
            {activeDoc.key_findings && (
              <div>
                <div
                  style={{
                    fontSize: 10,
                    fontWeight: 700,
                    letterSpacing: "0.07em",
                    textTransform: "uppercase",
                    color: "var(--color-muted-slate)",
                    marginBottom: 12,
                  }}
                >
                  Extracted Drilling Lessons &amp; Critical Findings
                </div>
                <div
                  style={{
                    background: "rgba(16,67,54,0.04)",
                    padding: "18px 20px",
                    borderRadius: 10,
                    border: "1px solid rgba(16,67,54,0.14)",
                    borderLeft: "3px solid var(--color-canopy)",
                  }}
                >
                  <ul style={{ paddingLeft: 18, display: "flex", flexDirection: "column", gap: 8 }}>
                    {activeDoc.key_findings.split("\n").map((finding, idx) => (
                      <li key={idx} style={{ fontSize: 13, lineHeight: 1.6, color: "var(--color-bark)" }}>
                        {finding.replace(/^[•\-\*]\s*/, "")}
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        ) : (
          <div style={{ padding: 60, textAlign: "center", color: "var(--color-muted-slate)" }}>
            <BookOpen size={32} style={{ marginBottom: 12, opacity: 0.3, display: "block", margin: "0 auto 12px" }} />
            Select a document from the left catalog to inspect.
          </div>
        )}
      </div>
    </div>
  );
};
