import React, { useState, useEffect } from "react";
import { Link } from "react-router-dom";
import {
  FileText,
  Upload,
  RefreshCw,
  Search,
  Trash2,
  Play,
  CheckCircle2,
  Clock,
  AlertTriangle,
  FolderPlus,
  ArrowLeft,
  X,
  FileCheck,
} from "lucide-react";
import { api } from "../../services/api";

export const AdminDocumentsPage: React.FC = () => {
  const [documents, setDocuments] = useState<any[]>([]);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [search, setSearch] = useState<string>("");
  const [isUploadOpen, setIsUploadOpen] = useState<boolean>(false);

  // Upload modal state
  const [title, setTitle] = useState<string>("");
  const [docType, setDocType] = useState<string>("WCR");
  const [wellId, setWellId] = useState<string>("OIL-X104");
  const [formation, setFormation] = useState<string>("Tipam");
  const [depthStart, setDepthStart] = useState<number>(3150);
  const [depthEnd, setDepthEnd] = useState<number>(3300);
  const [textContent, setTextContent] = useState<string>("");
  const [uploadError, setUploadError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState<boolean>(false);

  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = async () => {
    setIsLoading(true);
    try {
      const data = await api.getAdminDocuments();
      setDocuments(data || []);
    } catch (err) {
      console.error("Failed to load documents:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) {
      setUploadError("Document title is required.");
      return;
    }
    setIsSubmitting(true);
    setUploadError(null);
    try {
      await api.uploadAdminDocument({
        title,
        document_type: docType,
        well_id: wellId,
        formation,
        depth_start: depthStart,
        depth_end: depthEnd,
        text_content: textContent,
      });
      setIsUploadOpen(false);
      resetForm();
      await loadDocuments();
    } catch (err: any) {
      setUploadError(err.response?.data?.detail || "Failed to upload document.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleProcess = async (docId: number) => {
    try {
      await api.processAdminDocument(docId);
      await loadDocuments();
    } catch (err) {
      console.error("Failed to process document:", err);
    }
  };

  const handleDelete = async (docId: number) => {
    if (!window.confirm("Are you sure you want to remove this document from the institutional repository?")) {
      return;
    }
    try {
      await api.deleteAdminDocument(docId);
      await loadDocuments();
    } catch (err) {
      console.error("Failed to delete document:", err);
    }
  };

  const resetForm = () => {
    setTitle("");
    setTextContent("");
    setDepthStart(3150);
    setDepthEnd(3300);
    setUploadError(null);
  };

  const filteredDocs = documents.filter((d) => {
    const q = search.toLowerCase();
    return (
      d.title.toLowerCase().includes(q) ||
      d.document_id.toLowerCase().includes(q) ||
      (d.formation && d.formation.toLowerCase().includes(q)) ||
      (d.well_name && d.well_name.toLowerCase().includes(q))
    );
  });

  return (
    <div style={{ maxWidth: 1400, margin: "0 auto", padding: "24px 32px", display: "flex", flexDirection: "column", gap: 24 }}>
      {/* Header */}
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", borderBottom: "1px solid var(--color-sage-mist)", paddingBottom: 16 }}>
        <div>
          <div style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "4px 10px", borderRadius: 9999, background: "rgba(37, 99, 235, 0.08)", color: "#1d4ed8", fontSize: 11, fontFamily: "var(--font-mono)", fontWeight: 700, marginBottom: 6 }}>
            <FileText size={12} />
            <span>KNOWLEDGE INGESTION &amp; REPOSITORY</span>
          </div>
          <h1 style={{ fontSize: 24, fontWeight: 800, color: "var(--color-bark)", margin: 0 }}>
            Document Administration
          </h1>
          <p style={{ margin: "4px 0 0", color: "var(--color-slate)", fontSize: 13 }}>
            Manage institutional Well Completion Reports (WCR), Daily Drilling Reports (DDR), and geological logs.
          </p>
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <button
            onClick={() => setIsUploadOpen(true)}
            style={{
              display: "inline-flex",
              alignItems: "center",
              gap: 8,
              padding: "9px 18px",
              borderRadius: 10,
              background: "var(--color-canopy)",
              color: "#ffffff",
              fontSize: 12,
              fontWeight: 700,
              border: "none",
              cursor: "pointer",
              boxShadow: "0 4px 12px rgba(16, 67, 54, 0.2)",
            }}
          >
            <FolderPlus size={15} />
            <span>Ingest Document</span>
          </button>
          <button
            onClick={loadDocuments}
            style={{
              padding: "9px 12px",
              borderRadius: 10,
              border: "1px solid var(--color-sage-mist)",
              background: "var(--bg-elevated)",
              color: "var(--color-bark)",
              cursor: "pointer",
            }}
          >
            <RefreshCw size={15} className={isLoading ? "animate-spin" : ""} />
          </button>
        </div>
      </div>

      {/* Search and Filters */}
      <div style={{ display: "flex", gap: 16, alignItems: "center" }}>
        <div style={{ position: "relative", flex: 1 }}>
          <Search size={16} style={{ position: "absolute", left: 14, top: "50%", transform: "translateY(-50%)", color: "var(--color-muted-slate)" }} />
          <input
            type="text"
            placeholder="Search by title, document ID, well name, or formation..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            style={{
              width: "100%",
              padding: "10px 14px 10px 40px",
              borderRadius: 10,
              border: "1px solid var(--color-sage-mist)",
              background: "var(--color-sheet-white)",
              fontSize: 13,
              color: "var(--color-bark)",
              outline: "none",
            }}
          />
        </div>
        <div style={{ fontSize: 12, color: "var(--color-slate)", fontFamily: "var(--font-mono)" }}>
          Showing <strong>{filteredDocs.length}</strong> of <strong>{documents.length}</strong> documents
        </div>
      </div>

      {/* Documents Table */}
      <div style={{ background: "var(--color-sheet-white)", border: "1px solid var(--color-sage-mist)", borderRadius: 14, overflow: "hidden" }}>
        <table style={{ width: "100%", borderCollapse: "collapse", textAlign: "left", fontSize: 13 }}>
          <thead>
            <tr style={{ background: "var(--bg-elevated)", borderBottom: "1px solid var(--color-sage-mist)", color: "var(--color-slate)", fontSize: 11, fontFamily: "var(--font-mono)", textTransform: "uppercase" }}>
              <th style={{ padding: "12px 18px" }}>Doc Code</th>
              <th style={{ padding: "12px 18px" }}>Title &amp; Type</th>
              <th style={{ padding: "12px 18px" }}>Offset Well</th>
              <th style={{ padding: "12px 18px" }}>Formation &amp; Depth</th>
              <th style={{ padding: "12px 18px" }}>Chunks</th>
              <th style={{ padding: "12px 18px" }}>Ingestion Status</th>
              <th style={{ padding: "12px 18px", textAlign: "right" }}>Actions</th>
            </tr>
          </thead>
          <tbody>
            {filteredDocs.map((doc) => {
              const isProcessed = doc.status === "Processed";
              return (
                <tr key={doc.id} style={{ borderBottom: "1px solid var(--color-sage-mist)" }}>
                  <td style={{ padding: "14px 18px", fontFamily: "var(--font-mono)", fontWeight: 700, color: "var(--color-canopy)" }}>
                    {doc.document_id}
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <div style={{ fontWeight: 700, color: "var(--color-bark)" }}>{doc.title}</div>
                    <span style={{ fontSize: 10, padding: "2px 6px", borderRadius: 4, background: "rgba(0,0,0,0.06)", fontWeight: 700, color: "var(--color-slate)" }}>
                      {doc.document_type}
                    </span>
                  </td>
                  <td style={{ padding: "14px 18px", color: "var(--color-bark)" }}>
                    {doc.well_name || doc.well_id || "Cross-Basin Reference"}
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <div>{doc.formation || "Assam Strata"}</div>
                    <div style={{ fontSize: 11, color: "var(--color-muted-slate)", fontFamily: "var(--font-mono)" }}>
                      {doc.depth_start ?? 3000}m – {doc.depth_end ?? 3200}m
                    </div>
                  </td>
                  <td style={{ padding: "14px 18px", fontFamily: "var(--font-mono)", fontWeight: 700 }}>
                    {doc.chunks_count ?? 1}
                  </td>
                  <td style={{ padding: "14px 18px" }}>
                    <span
                      style={{
                        display: "inline-flex",
                        alignItems: "center",
                        gap: 5,
                        padding: "3px 8px",
                        borderRadius: 9999,
                        fontSize: 11,
                        fontWeight: 700,
                        fontFamily: "var(--font-mono)",
                        background: isProcessed ? "rgba(13, 122, 78, 0.1)" : "rgba(217, 119, 6, 0.1)",
                        color: isProcessed ? "#0d7a4e" : "#b45309",
                        border: isProcessed ? "1px solid rgba(13, 122, 78, 0.25)" : "1px solid rgba(217, 119, 6, 0.25)",
                      }}
                    >
                      {isProcessed ? <CheckCircle2 size={12} /> : <Clock size={12} />}
                      {doc.status || "Processed"}
                    </span>
                  </td>
                  <td style={{ padding: "14px 18px", textAlign: "right" }}>
                    <div style={{ display: "flex", justifyContent: "flex-end", gap: 8 }}>
                      {!isProcessed && (
                        <button
                          onClick={() => handleProcess(doc.id)}
                          title="Trigger OCR & Chunk Processing"
                          style={{
                            display: "inline-flex",
                            alignItems: "center",
                            gap: 4,
                            padding: "5px 10px",
                            borderRadius: 6,
                            background: "rgba(37, 99, 235, 0.1)",
                            color: "#1d4ed8",
                            border: "1px solid rgba(37, 99, 235, 0.2)",
                            cursor: "pointer",
                            fontSize: 11,
                            fontWeight: 700,
                          }}
                        >
                          <Play size={11} />
                          <span>Process</span>
                        </button>
                      )}
                      <button
                        onClick={() => handleDelete(doc.id)}
                        title="Delete Document"
                        style={{
                          padding: "6px",
                          borderRadius: 6,
                          background: "none",
                          border: "1px solid transparent",
                          color: "#b91c42",
                          cursor: "pointer",
                        }}
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

      {/* Upload Modal */}
      {isUploadOpen && (
        <div style={{ position: "fixed", inset: 0, background: "rgba(0, 0, 0, 0.5)", zIndex: 1000, display: "flex", alignItems: "center", justifyContent: "center" }}>
          <div style={{ background: "var(--color-sheet-white)", borderRadius: 16, width: "100%", maxWidth: 600, padding: 24, boxShadow: "0 20px 40px rgba(0,0,0,0.2)" }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, borderBottom: "1px solid var(--color-sage-mist)", paddingBottom: 12 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Upload size={18} color="var(--color-canopy)" />
                <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: "var(--color-bark)" }}>
                  Ingest New Operational Document
                </h3>
              </div>
              <button onClick={() => setIsUploadOpen(false)} style={{ background: "none", border: "none", cursor: "pointer", color: "var(--color-muted-slate)" }}>
                <X size={18} />
              </button>
            </div>

            {uploadError && (
              <div style={{ padding: "10px 14px", borderRadius: 8, background: "rgba(185, 28, 66, 0.1)", border: "1px solid rgba(185, 28, 66, 0.25)", color: "#b91c42", fontSize: 12, marginBottom: 16 }}>
                {uploadError}
              </div>
            )}

            <form onSubmit={handleUpload} style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>Document Title *</label>
                <input
                  type="text"
                  required
                  placeholder="e.g. OIL-X104 Daily Drilling Report - Stuck Pipe Incident"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-sage-mist)", fontSize: 13 }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>Document Type</label>
                  <select
                    value={docType}
                    onChange={(e) => setDocType(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-sage-mist)", fontSize: 13 }}
                  >
                    <option value="WCR">Well Completion Report (WCR)</option>
                    <option value="DDR">Daily Drilling Report (DDR)</option>
                    <option value="MUD_LOG">Mud Log</option>
                    <option value="INCIDENT">Incident Summary</option>
                  </select>
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>Associated Well</label>
                  <input
                    type="text"
                    value={wellId}
                    onChange={(e) => setWellId(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-sage-mist)", fontSize: 13 }}
                  />
                </div>
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 12 }}>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>Formation</label>
                  <input
                    type="text"
                    value={formation}
                    onChange={(e) => setFormation(e.target.value)}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-sage-mist)", fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>Depth Start (m)</label>
                  <input
                    type="number"
                    value={depthStart}
                    onChange={(e) => setDepthStart(parseFloat(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-sage-mist)", fontSize: 13 }}
                  />
                </div>
                <div>
                  <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>Depth End (m)</label>
                  <input
                    type="number"
                    value={depthEnd}
                    onChange={(e) => setDepthEnd(parseFloat(e.target.value))}
                    style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-sage-mist)", fontSize: 13 }}
                  />
                </div>
              </div>

              <div>
                <label style={{ display: "block", fontSize: 12, fontWeight: 700, color: "var(--color-bark)", marginBottom: 4 }}>Text &amp; Geological Findings Content</label>
                <textarea
                  rows={4}
                  placeholder="Paste OCR extract, operational narrative, or incident logs..."
                  value={textContent}
                  onChange={(e) => setTextContent(e.target.value)}
                  style={{ width: "100%", padding: "8px 12px", borderRadius: 8, border: "1px solid var(--color-sage-mist)", fontSize: 13, resize: "vertical" }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "flex-end", gap: 10, marginTop: 12 }}>
                <button
                  type="button"
                  onClick={() => setIsUploadOpen(false)}
                  style={{ padding: "8px 16px", borderRadius: 8, border: "1px solid var(--color-sage-mist)", background: "var(--bg-elevated)", color: "var(--color-slate)", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  style={{ padding: "8px 20px", borderRadius: 8, border: "none", background: "var(--color-canopy)", color: "#ffffff", cursor: "pointer", fontSize: 12, fontWeight: 700 }}
                >
                  {isSubmitting ? "Ingesting..." : "Ingest Document"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
