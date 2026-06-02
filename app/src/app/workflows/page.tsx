"use client";

import { useEffect, useState, useCallback } from "react";
import {
  db,
  createWorkflow,
  deleteWorkflow,
  type Workflow,
  type WorkflowType,
} from "@/lib/db";
import { formatDate, truncateText } from "@/lib/utils";
import {
  Workflow as WorkflowIcon,
  Plus,
  Search,
  Copy,
  Edit3,
  Trash2,
  X,
  Save,
  Zap,
  Cpu,
  Layers,
  Star,
} from "lucide-react";

const typeConfig: Record<WorkflowType, { label: string; color: string }> = {
  comfyui: { label: "ComfyUI", color: "var(--accent-purple)" },
  automatic1111: { label: "A1111", color: "var(--accent-cyan)" },
  flux: { label: "Flux", color: "var(--accent-pink)" },
  other: { label: "Khác", color: "var(--accent-amber)" },
};

const WorkflowsPage = () => {
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [mounted, setMounted] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [filterType, setFilterType] = useState<WorkflowType | "all">("all");

  const loadWorkflows = useCallback(async () => {
    const all = await db.workflows.orderBy("createdAt").reverse().toArray();
    setWorkflows(all);
  }, []);

  useEffect(() => {
    setMounted(true);
    loadWorkflows();
  }, [loadWorkflows]);

  const handleDelete = async (id: string) => {
    if (confirm("Xóa workflow này?")) {
      await deleteWorkflow(id);
      loadWorkflows();
    }
  };

  const filtered =
    filterType === "all"
      ? workflows
      : workflows.filter((w) => w.type === filterType);

  if (!mounted) return null;

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 1400, margin: "0 auto" }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            <span className="gradient-text">Workflows</span>
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            {filtered.length} workflow
          </p>
        </div>
        <button className="btn-primary" onClick={() => setEditorOpen(true)}>
          <Plus size={16} />
          Thêm Workflow
        </button>
      </div>

      {/* Filters */}
      <div style={{ display: "flex", gap: 4, marginBottom: 20 }}>
        <button
          className={filterType === "all" ? "btn-primary" : "btn-secondary"}
          onClick={() => setFilterType("all")}
          style={{ padding: "6px 14px", fontSize: 13 }}
        >
          Tất cả
        </button>
        {(Object.keys(typeConfig) as WorkflowType[]).map((type) => (
          <button
            key={type}
            className={filterType === type ? "btn-primary" : "btn-secondary"}
            onClick={() => setFilterType(type)}
            style={{ padding: "6px 14px", fontSize: 13 }}
          >
            {typeConfig[type].label}
          </button>
        ))}
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state" style={{ minHeight: 300 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "var(--radius-full)",
              background: "rgba(244,114,182,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <WorkflowIcon size={28} style={{ color: "var(--accent-pink)" }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Chưa có workflow nào</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Lưu workflow ComfyUI, A1111, Flux của bạn.
          </p>
          <button className="btn-primary" onClick={() => setEditorOpen(true)}>
            <Plus size={16} />
            Thêm Workflow
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(340px, 1fr))",
            gap: 16,
          }}
        >
          {filtered.map((wf) => (
            <div key={wf.id} className="glass-card glass-card-hover" style={{ padding: 20 }}>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 12 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
                  <div
                    style={{
                      width: 32,
                      height: 32,
                      borderRadius: "var(--radius-sm)",
                      background: `${typeConfig[wf.type].color}20`,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                    }}
                  >
                    <Zap size={16} style={{ color: typeConfig[wf.type].color }} />
                  </div>
                  <div>
                    <h3 style={{ fontSize: 15, fontWeight: 600 }}>
                      {wf.title || "Untitled"}
                    </h3>
                    <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                      {typeConfig[wf.type].label} • {formatDate(wf.createdAt)}
                    </div>
                  </div>
                </div>
              </div>

              {wf.description && (
                <p style={{ fontSize: 13, color: "var(--text-secondary)", marginBottom: 12, lineHeight: 1.5 }}>
                  {truncateText(wf.description, 120)}
                </p>
              )}

              {wf.tags.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
                  {wf.tags.map((tag) => (
                    <span key={tag} className="tag" style={{ fontSize: 11, padding: "2px 8px" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 4, borderTop: "1px solid var(--border-primary)", paddingTop: 12 }}>
                <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(wf.content)}>
                  <Copy size={14} /> Copy
                </button>
                <button
                  className="btn-ghost"
                  onClick={() => handleDelete(wf.id)}
                  style={{ color: "var(--accent-red)", marginLeft: "auto" }}
                >
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Editor Modal */}
      {editorOpen && (
        <WorkflowEditor
          onClose={() => setEditorOpen(false)}
          onSave={() => {
            setEditorOpen(false);
            loadWorkflows();
          }}
        />
      )}
    </div>
  );
};

const WorkflowEditor = ({
  onClose,
  onSave,
}: {
  onClose: () => void;
  onSave: () => void;
}) => {
  const [form, setForm] = useState({
    title: "",
    description: "",
    content: "",
    type: "comfyui" as WorkflowType,
    creator: "",
    tags: "",
  });

  const handleSubmit = async () => {
    await createWorkflow({
      ...form,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      isFavorite: false,
    });
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 640, padding: 0 }}
      >
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-primary)", display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>
            <span className="gradient-text">Thêm Workflow</span>
          </h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
            <div>
              <label style={labelStyle}>Tiêu đề</label>
              <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Workflow name..." />
            </div>
            <div>
              <label style={labelStyle}>Loại</label>
              <select value={form.type} onChange={(e) => setForm({ ...form, type: e.target.value as WorkflowType })} className="select-field" style={{ width: 140 }}>
                <option value="comfyui">ComfyUI</option>
                <option value="automatic1111">A1111</option>
                <option value="flux">Flux</option>
                <option value="other">Khác</option>
              </select>
            </div>
          </div>
          <div>
            <label style={labelStyle}>Mô tả</label>
            <textarea value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="textarea-field" placeholder="Mô tả ngắn..." style={{ minHeight: 60 }} />
          </div>
          <div>
            <label style={labelStyle}>Nội dung / JSON</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="textarea-field" placeholder="Paste workflow JSON hoặc nội dung..." style={{ minHeight: 120, fontFamily: "monospace", fontSize: 12 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Creator</label>
              <input type="text" value={form.creator} onChange={(e) => setForm({ ...form, creator: e.target.value })} className="input-field" placeholder="Tên..." />
            </div>
            <div>
              <label style={labelStyle}>Tags</label>
              <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="input-field" placeholder="tag1, tag2..." />
            </div>
          </div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-primary)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn-secondary" onClick={onClose}>Hủy</button>
          <button className="btn-primary" onClick={handleSubmit}><Save size={16} /> Tạo Workflow</button>
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  fontSize: 12,
  fontWeight: 600,
  color: "var(--text-muted)",
  marginBottom: 6,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

export default WorkflowsPage;
