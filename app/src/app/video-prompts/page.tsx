"use client";

import { useEffect, useState, useCallback } from "react";
import { db, createPrompt, updatePrompt, deletePrompt, type Prompt } from "@/lib/db";
import { formatDate, truncateText } from "@/lib/utils";
import {
  Video,
  Plus,
  Search,
  Copy,
  Edit3,
  Trash2,
  X,
  Save,
  Star,
  Play,
  Film,
} from "lucide-react";

const VideoPromptsPage = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [mounted, setMounted] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [searchQuery, setSearchQuery] = useState("");

  const loadPrompts = useCallback(async () => {
    const all = await db.prompts
      .where("type")
      .equals("video")
      .reverse()
      .sortBy("createdAt");
    setPrompts(all);
  }, []);

  useEffect(() => {
    setMounted(true);
    loadPrompts();
  }, [loadPrompts]);

  const filtered = prompts.filter(
    (p) =>
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase()),
  );

  const handleDelete = async (id: string) => {
    if (confirm("Xóa prompt này?")) {
      await deletePrompt(id);
      loadPrompts();
    }
  };

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
            <span className="gradient-text">Video Prompt</span>
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            {filtered.length} video prompt
          </p>
        </div>
        <button className="btn-primary" onClick={() => { setEditingPrompt(null); setEditorOpen(true); }}>
          <Plus size={16} />
          Thêm Video Prompt
        </button>
      </div>

      {/* Search */}
      <div style={{ position: "relative", maxWidth: 400, marginBottom: 20 }}>
        <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
        <input
          type="text"
          placeholder="Tìm video prompt..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="input-field"
          style={{ paddingLeft: 34, height: 38, fontSize: 13 }}
        />
      </div>

      {filtered.length === 0 ? (
        <div className="empty-state" style={{ minHeight: 300 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "var(--radius-full)",
              background: "rgba(6,182,212,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Film size={28} style={{ color: "var(--accent-cyan)" }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Chưa có video prompt</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Lưu prompt cho Kling, Runway, Sora, Pika...
          </p>
          <button className="btn-primary" onClick={() => setEditorOpen(true)}>
            <Plus size={16} />
            Thêm Video Prompt
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
          {filtered.map((prompt) => (
            <div key={prompt.id} className="glass-card glass-card-hover" style={{ padding: 20 }}>
              <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                <div
                  style={{
                    width: 32,
                    height: 32,
                    borderRadius: "var(--radius-sm)",
                    background: "rgba(6,182,212,0.15)",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                  }}
                >
                  <Play size={16} style={{ color: "var(--accent-cyan)" }} />
                </div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <h3 style={{ fontSize: 15, fontWeight: 600, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
                    {prompt.title || "Untitled"}
                  </h3>
                  <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
                    {formatDate(prompt.createdAt)}
                  </div>
                </div>
                {prompt.isFavorite && (
                  <Star size={14} fill="var(--accent-amber)" style={{ color: "var(--accent-amber)" }} />
                )}
              </div>

              <div
                style={{
                  fontSize: 13,
                  color: "var(--text-secondary)",
                  lineHeight: 1.6,
                  background: "var(--bg-tertiary)",
                  padding: "10px 12px",
                  borderRadius: "var(--radius-sm)",
                  marginBottom: 12,
                  maxHeight: 80,
                  overflow: "hidden",
                }}
              >
                {truncateText(prompt.content, 180)}
              </div>

              {prompt.tags.length > 0 && (
                <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 12 }}>
                  {prompt.tags.slice(0, 4).map((tag) => (
                    <span key={tag} className="tag tag-cyan" style={{ fontSize: 11, padding: "2px 8px" }}>
                      {tag}
                    </span>
                  ))}
                </div>
              )}

              <div style={{ display: "flex", gap: 4, borderTop: "1px solid var(--border-primary)", paddingTop: 12 }}>
                <button className="btn-ghost" onClick={() => navigator.clipboard.writeText(prompt.content)}>
                  <Copy size={14} /> Copy
                </button>
                <button className="btn-ghost" onClick={() => { setEditingPrompt(prompt); setEditorOpen(true); }}>
                  <Edit3 size={14} /> Sửa
                </button>
                <button className="btn-ghost" onClick={() => handleDelete(prompt.id)} style={{ color: "var(--accent-red)", marginLeft: "auto" }}>
                  <Trash2 size={14} />
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {editorOpen && (
        <VideoPromptEditor
          prompt={editingPrompt}
          onClose={() => { setEditorOpen(false); setEditingPrompt(null); }}
          onSave={() => { setEditorOpen(false); setEditingPrompt(null); loadPrompts(); }}
        />
      )}
    </div>
  );
};

const VideoPromptEditor = ({ prompt, onClose, onSave }: { prompt: Prompt | null; onClose: () => void; onSave: () => void }) => {
  const [form, setForm] = useState({
    title: prompt?.title || "",
    content: prompt?.content || "",
    negativePrompt: prompt?.negativePrompt || "",
    model: prompt?.model || "",
    creator: prompt?.creator || "",
    tags: prompt?.tags?.join(", ") || "",
    notes: prompt?.notes || "",
    isFavorite: prompt?.isFavorite || false,
  });

  const handleSubmit = async () => {
    const data = {
      ...form,
      type: "video" as const,
      lora: "",
      seed: "",
      sampler: "",
      cfgScale: 0,
      steps: 0,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
    };
    if (prompt) {
      await updatePrompt(prompt.id, data);
    } else {
      await createPrompt(data);
    }
    onSave();
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content animate-scaleIn" onClick={(e) => e.stopPropagation()} style={{ maxWidth: 640, padding: 0 }}>
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-primary)", display: "flex", justifyContent: "space-between" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}><span className="gradient-text">{prompt ? "Sửa" : "Thêm"} Video Prompt</span></h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Tiêu đề</label>
            <input type="text" value={form.title} onChange={(e) => setForm({ ...form, title: e.target.value })} className="input-field" placeholder="Tên prompt..." />
          </div>
          <div>
            <label style={labelStyle}>Prompt</label>
            <textarea value={form.content} onChange={(e) => setForm({ ...form, content: e.target.value })} className="textarea-field" placeholder="Video prompt..." style={{ minHeight: 120 }} />
          </div>
          <div>
            <label style={labelStyle}>Negative Prompt</label>
            <textarea value={form.negativePrompt} onChange={(e) => setForm({ ...form, negativePrompt: e.target.value })} className="textarea-field" placeholder="Negative..." style={{ minHeight: 60 }} />
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Model / Tool</label>
              <input type="text" value={form.model} onChange={(e) => setForm({ ...form, model: e.target.value })} className="input-field" placeholder="Kling, Runway, Sora..." />
            </div>
            <div>
              <label style={labelStyle}>Creator</label>
              <input type="text" value={form.creator} onChange={(e) => setForm({ ...form, creator: e.target.value })} className="input-field" placeholder="Tên..." />
            </div>
          </div>
          <div>
            <label style={labelStyle}>Tags</label>
            <input type="text" value={form.tags} onChange={(e) => setForm({ ...form, tags: e.target.value })} className="input-field" placeholder="tag1, tag2..." />
          </div>
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-primary)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn-secondary" onClick={onClose}>Hủy</button>
          <button className="btn-primary" onClick={handleSubmit}><Save size={16} /> {prompt ? "Cập nhật" : "Tạo"}</button>
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  fontSize: 12, fontWeight: 600, color: "var(--text-muted)", marginBottom: 6, display: "block", textTransform: "uppercase", letterSpacing: "0.05em",
};

export default VideoPromptsPage;
