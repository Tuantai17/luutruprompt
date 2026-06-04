"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import {
  db,
  createPrompt,
  updatePrompt,
  deletePrompt,
  type Prompt,
  type PromptType,
} from "@/lib/db";
import { formatDate, truncateText } from "@/lib/utils";
import {
  BookOpen,
  Plus,
  Search,
  Filter,
  Copy,
  Edit3,
  Trash2,
  Heart,
  X,
  Save,
  ImageIcon,
  Video,
  MessageSquare,
  Workflow,
  ChevronDown,
  Star,
  Square,
  CheckSquare,
  Check,
} from "lucide-react";

const typeConfig: Record<
  PromptType,
  { label: string; icon: typeof ImageIcon; color: string }
> = {
  image: { label: "Ảnh", icon: ImageIcon, color: "var(--accent-purple)" },
  video: { label: "Video", icon: Video, color: "var(--accent-cyan)" },
  chatbot: { label: "Chatbot", icon: MessageSquare, color: "var(--accent-pink)" },
  workflow: { label: "Workflow", icon: Workflow, color: "var(--accent-green)" },
};

const PromptsPage = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [mounted, setMounted] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [filterType, setFilterType] = useState<PromptType | "all">("all");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteProgress, setDeleteProgress] = useState({ current: 0, total: 0 });

  const loadPrompts = useCallback(async () => {
    const all = await db.prompts.orderBy("createdAt").reverse().toArray();
    setPrompts(all);
  }, []);

  useEffect(() => {
    setMounted(true);
    loadPrompts();
  }, [loadPrompts]);

  // Reset selectedIds khi thay đổi bộ lọc
  useEffect(() => {
    setSelectedIds([]);
  }, [filterType, searchQuery]);

  const filteredPrompts = prompts.filter((p) => {
    const matchesType = filterType === "all" || p.type === filterType;
    const matchesSearch =
      !searchQuery ||
      p.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.creator.toLowerCase().includes(searchQuery.toLowerCase());
    return matchesType && matchesSearch;
  });

  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  const toggleSelectAll = () => {
    if (selectedIds.length === filteredPrompts.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredPrompts.map((p) => p.id));
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc muốn xóa prompt này?")) {
      await deletePrompt(id);
      setSelectedIds((prev) => prev.filter((x) => x !== id));
      loadPrompts();
    }
  };

  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;
    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} prompt đã chọn?`)) {
      setIsDeleting(true);
      setDeleteProgress({ current: 0, total: selectedIds.length });
      try {
        for (let i = 0; i < selectedIds.length; i++) {
          const id = selectedIds[i];
          setDeleteProgress((prev) => ({ ...prev, current: i + 1 }));
          await deletePrompt(id);
        }
        alert(`Đã xóa thành công ${selectedIds.length} prompt.`);
      } catch (err: any) {
        alert(`Có lỗi xảy ra khi xóa hàng loạt: ${err.message || err}`);
      } finally {
        setIsDeleting(false);
        setSelectedIds([]);
        loadPrompts();
      }
    }
  };

  const handleCopy = (text: string) => {
    navigator.clipboard.writeText(text);
  };

  const openEditor = (prompt?: Prompt) => {
    setEditingPrompt(prompt || null);
    setEditorOpen(true);
  };

  if (!mounted) return null;

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 1200, margin: "0 auto", padding: "0 16px 60px" }}>
      {/* Header */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 12,
        }}
      >
        <div>
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
            <span className="gradient-text">Prompt Library</span>
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            {filteredPrompts.length} prompt
          </p>
        </div>

        <button className="btn-primary" onClick={() => openEditor()}>
          <Plus size={16} />
          Thêm Prompt
        </button>
      </div>

      {/* Filters */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 20,
          flexWrap: "wrap",
          alignItems: "center",
        }}
      >
        {/* Search */}
        <div style={{ position: "relative", flex: "1", minWidth: 200, maxWidth: 380 }}>
          <Search
            size={14}
            style={{
              position: "absolute",
              left: 12,
              top: "50%",
              transform: "translateY(-50%)",
              color: "var(--text-muted)",
            }}
          />
          <input
            type="text"
            placeholder="Tìm prompt..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 34, height: 38, fontSize: 13 }}
          />
        </div>

        {/* Type filter */}
        <div style={{ display: "flex", gap: 4 }}>
          <button
            className={filterType === "all" ? "btn-primary" : "btn-secondary"}
            onClick={() => setFilterType("all")}
            style={{ padding: "6px 14px", fontSize: 13 }}
          >
            Tất cả
          </button>
          {(Object.keys(typeConfig) as PromptType[]).map((type) => {
            const config = typeConfig[type];
            const Icon = config.icon;
            return (
              <button
                key={type}
                className={filterType === type ? "btn-primary" : "btn-secondary"}
                onClick={() => setFilterType(type)}
                style={{ padding: "6px 14px", fontSize: 13 }}
              >
                <Icon size={14} />
                {config.label}
              </button>
            );
          })}
        </div>
      </div>

      {/* Tiến trình Xóa hàng loạt (In-page Banner) */}
      {isDeleting && (
        <div
          className="glass-card animate-fadeIn"
          style={{
            padding: "16px 20px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid rgba(239, 68, 68, 0.25)",
            background: "rgba(239, 68, 68, 0.04)",
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
            <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-red)" }}>
              Đang xóa hàng loạt prompt...
            </span>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Tiến trình: <strong>{deleteProgress.current}</strong> / <strong>{deleteProgress.total}</strong>
            </span>
          </div>

          <div style={{ width: "100%", height: 6, background: "var(--border-primary)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
            <div
              style={{
                width: `${(deleteProgress.current / deleteProgress.total) * 100}%`,
                height: "100%",
                background: "linear-gradient(90deg, #ef4444 0%, #b91c1c 100%)",
                borderRadius: "var(--radius-full)",
                transition: "width 0.2s ease-out",
              }}
            />
          </div>
        </div>
      )}

      {/* Bulk Action Bar */}
      {filteredPrompts.length > 0 && (
        <div
          className="glass-card animate-fadeIn"
          style={{
            padding: "12px 16px",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 12,
            marginBottom: 20,
            border: "1px solid rgba(139, 92, 246, 0.1)",
          }}
        >
          <div style={{ display: "flex", gap: 8 }}>
            <button
              onClick={toggleSelectAll}
              className="btn-secondary"
              style={{ padding: "6px 12px", fontSize: 13, height: 34, display: "flex", alignItems: "center", gap: 6 }}
            >
              {selectedIds.length === filteredPrompts.length ? (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <CheckSquare size={14} style={{ color: "var(--accent-purple)" }} />
                  <span>Bỏ chọn tất cả</span>
                </span>
              ) : (
                <span style={{ display: "flex", alignItems: "center", gap: 6 }}>
                  <Square size={14} />
                  <span>Chọn tất cả ({selectedIds.length}/{filteredPrompts.length})</span>
                </span>
              )}
            </button>
          </div>

          {selectedIds.length > 0 && (
            <button
              onClick={handleBulkDelete}
              className="btn-secondary"
              style={{
                padding: "0 14px",
                height: 34,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--accent-red)",
                borderColor: "rgba(239, 68, 68, 0.2)",
                background: "rgba(239, 68, 68, 0.05)",
                display: "flex",
                alignItems: "center",
                gap: 6,
              }}
            >
              <Trash2 size={14} />
              <span>Xóa đã chọn ({selectedIds.length})</span>
            </button>
          )}
        </div>
      )}

      {/* Prompt Grid */}
      {filteredPrompts.length === 0 ? (
        <div className="empty-state" style={{ minHeight: 300 }}>
          <div
            style={{
              width: 64,
              height: 64,
              borderRadius: "var(--radius-full)",
              background: "rgba(139,92,246,0.1)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <BookOpen size={28} style={{ color: "var(--accent-purple)" }} />
          </div>
          <h3 style={{ fontSize: 16, fontWeight: 600 }}>Chưa có prompt nào</h3>
          <p style={{ color: "var(--text-secondary)", fontSize: 14 }}>
            Thêm prompt đầu tiên để bắt đầu thư viện.
          </p>
          <button className="btn-primary" onClick={() => openEditor()}>
            <Plus size={16} />
            Thêm Prompt
          </button>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 20,
          }}
        >
          {filteredPrompts.map((prompt, idx) => (
            <PromptCard
              key={prompt.id}
              prompt={prompt}
              isSelected={selectedIds.includes(prompt.id)}
              onSelect={() => toggleSelect(prompt.id)}
              onEdit={() => openEditor(prompt)}
              onDelete={() => handleDelete(prompt.id)}
              onCopy={() => handleCopy(prompt.content)}
              style={{ animationDelay: `${idx * 0.04}s` }}
            />
          ))}
        </div>
      )}

      {/* Prompt Editor Modal */}
      {mounted && editorOpen && createPortal(
        <PromptEditor
          prompt={editingPrompt}
          onClose={() => {
            setEditorOpen(false);
            setEditingPrompt(null);
          }}
          onSave={() => {
            setEditorOpen(false);
            setEditingPrompt(null);
            loadPrompts();
          }}
        />,
        document.body
      )}
    </div>
  );
};

// ===== Prompt Card =====
const PromptCard = ({
  prompt,
  isSelected,
  onSelect,
  onEdit,
  onDelete,
  onCopy,
  style,
}: {
  prompt: Prompt;
  isSelected: boolean;
  onSelect: () => void;
  onEdit: () => void;
  onDelete: () => void;
  onCopy: () => void;
  style?: React.CSSProperties;
}) => {
  const config = typeConfig[prompt.type];
  const Icon = config.icon;

  return (
    <div
      className="glass-card glass-card-hover animate-fadeIn"
      style={{
        opacity: 0,
        padding: 20,
        border: isSelected ? "1.5px solid var(--accent-purple)" : "1px solid var(--border-primary)",
        boxShadow: isSelected ? "0 8px 30px rgba(139, 92, 246, 0.15)" : "none",
        position: "relative",
        ...style,
      }}
    >
      {/* Header */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 12,
        }}
      >
        <div style={{ display: "flex", alignItems: "center", gap: 10, flex: 1 }}>
          {/* Checkbox chọn */}
          <button
            onClick={(e) => {
              e.stopPropagation();
              onSelect();
            }}
            style={{
              background: isSelected ? "var(--accent-purple)" : "rgba(255,255,255,0.03)",
              border: isSelected ? "none" : "1.5px solid var(--border-secondary)",
              borderRadius: "4px",
              width: 18,
              height: 18,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
              color: "#fff",
              flexShrink: 0,
            }}
            title={isSelected ? "Bỏ chọn" : "Chọn prompt này"}
          >
            {isSelected && <Check size={12} strokeWidth={3} />}
          </button>

          <div
            style={{
              width: 32,
              height: 32,
              borderRadius: "var(--radius-sm)",
              background: `${config.color}20`,
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <Icon size={16} style={{ color: config.color }} />
          </div>
          <div style={{ minWidth: 0 }}>
            <h3
              style={{
                fontSize: 15,
                fontWeight: 600,
                whiteSpace: "nowrap",
                overflow: "hidden",
                textOverflow: "ellipsis",
              }}
            >
              {prompt.title || "Untitled"}
            </h3>
            <div style={{ fontSize: 11, color: "var(--text-muted)" }}>
              {config.label} • {formatDate(prompt.createdAt)}
            </div>
          </div>
        </div>

        {prompt.isFavorite && (
          <Star
            size={16}
            fill="var(--accent-amber)"
            style={{ color: "var(--accent-amber)", flexShrink: 0 }}
          />
        )}
      </div>

      {/* Content */}
      <div
        style={{
          fontSize: 13,
          color: "var(--text-secondary)",
          lineHeight: 1.6,
          marginBottom: 12,
          background: "var(--bg-tertiary)",
          padding: "10px 12px",
          borderRadius: "var(--radius-sm)",
          maxHeight: 100,
          overflow: "hidden",
          position: "relative",
        }}
      >
        {truncateText(prompt.content, 200)}
        <div
          style={{
            position: "absolute",
            bottom: 0,
            left: 0,
            right: 0,
            height: 30,
            background: "linear-gradient(transparent, var(--bg-tertiary))",
          }}
        />
      </div>

      {/* Model & Creator */}
      <div
        style={{
          display: "flex",
          gap: 8,
          marginBottom: 12,
          fontSize: 12,
          flexWrap: "wrap",
        }}
      >
        {prompt.model && (
          <span className="tag tag-cyan" style={{ fontSize: 11, padding: "2px 8px" }}>
            {prompt.model}
          </span>
        )}
        {prompt.creator && (
          <span className="tag tag-pink" style={{ fontSize: 11, padding: "2px 8px" }}>
            {prompt.creator}
          </span>
        )}
      </div>

      {/* Tags */}
      {prompt.tags.length > 0 && (
        <div
          style={{
            display: "flex",
            gap: 4,
            flexWrap: "wrap",
            marginBottom: 12,
          }}
        >
          {prompt.tags.slice(0, 5).map((tag) => (
            <span
              key={tag}
              className="tag"
              style={{ fontSize: 11, padding: "2px 8px" }}
            >
              {tag}
            </span>
          ))}
          {prompt.tags.length > 5 && (
            <span style={{ fontSize: 11, color: "var(--text-muted)" }}>
              +{prompt.tags.length - 5}
            </span>
          )}
        </div>
      )}

      {/* Actions */}
      <div
        style={{
          display: "flex",
          gap: 4,
          borderTop: "1px solid var(--border-primary)",
          paddingTop: 12,
        }}
      >
        <button className="btn-ghost" onClick={onCopy} title="Copy prompt">
          <Copy size={14} /> Copy
        </button>
        <button className="btn-ghost" onClick={onEdit} title="Sửa">
          <Edit3 size={14} /> Sửa
        </button>
        <button
          className="btn-ghost"
          onClick={onDelete}
          style={{ color: "var(--accent-red)", marginLeft: "auto" }}
          title="Xóa"
        >
          <Trash2 size={14} />
        </button>
      </div>
    </div>
  );
};

// ===== Prompt Editor Modal =====
const PromptEditor = ({
  prompt,
  onClose,
  onSave,
}: {
  prompt: Prompt | null;
  onClose: () => void;
  onSave: () => void;
}) => {
  const [form, setForm] = useState({
    title: prompt?.title || "",
    content: prompt?.content || "",
    negativePrompt: prompt?.negativePrompt || "",
    type: (prompt?.type || "image") as PromptType,
    model: prompt?.model || "",
    lora: prompt?.lora || "",
    seed: prompt?.seed || "",
    sampler: prompt?.sampler || "",
    cfgScale: prompt?.cfgScale || 7,
    steps: prompt?.steps || 20,
    creator: prompt?.creator || "",
    tags: prompt?.tags?.join(", ") || "",
    notes: prompt?.notes || "",
    isFavorite: prompt?.isFavorite || false,
  });

  const handleSubmit = async () => {
    const data = {
      title: form.title,
      content: form.content,
      negativePrompt: form.negativePrompt,
      type: form.type,
      model: form.model,
      lora: form.lora,
      seed: form.seed,
      sampler: form.sampler,
      cfgScale: form.cfgScale,
      steps: form.steps,
      creator: form.creator,
      tags: form.tags
        .split(",")
        .map((t) => t.trim())
        .filter(Boolean),
      notes: form.notes,
      isFavorite: form.isFavorite,
    };

    if (prompt) {
      await updatePrompt(prompt.id, data);
    } else {
      await createPrompt(data);
    }
    onSave();
  };

  const updateField = (field: string, value: string | number | boolean) => {
    setForm((prev) => ({ ...prev, [field]: value }));
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content animate-scaleIn"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: 720, maxHeight: "90vh", padding: 0 }}
      >
        {/* Header */}
        <div
          style={{
            padding: "20px 24px",
            borderBottom: "1px solid var(--border-primary)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
          }}
        >
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>
            <span className="gradient-text">
              {prompt ? "Sửa Prompt" : "Thêm Prompt mới"}
            </span>
          </h2>
          <button className="btn-icon" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        {/* Form */}
        <div
          style={{
            padding: 24,
            overflowY: "auto",
            maxHeight: "calc(90vh - 140px)",
          }}
        >
          <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
            {/* Title & Type */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr auto", gap: 12 }}>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    marginBottom: 6,
                    display: "block",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Tiêu đề
                </label>
                <input
                  type="text"
                  value={form.title}
                  onChange={(e) => updateField("title", e.target.value)}
                  className="input-field"
                  placeholder="Tên prompt..."
                />
              </div>
              <div>
                <label
                  style={{
                    fontSize: 12,
                    fontWeight: 600,
                    color: "var(--text-muted)",
                    marginBottom: 6,
                    display: "block",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                  }}
                >
                  Loại
                </label>
                <select
                  value={form.type}
                  onChange={(e) => updateField("type", e.target.value)}
                  className="select-field"
                  style={{ width: 140 }}
                >
                  <option value="image">🖼️ Ảnh</option>
                  <option value="video">🎬 Video</option>
                  <option value="chatbot">💬 Chatbot</option>
                  <option value="workflow">⚡ Workflow</option>
                </select>
              </div>
            </div>

            {/* Prompt */}
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: 6,
                  display: "block",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Prompt
              </label>
              <textarea
                value={form.content}
                onChange={(e) => updateField("content", e.target.value)}
                className="textarea-field"
                placeholder="Nhập nội dung prompt..."
                style={{ minHeight: 120 }}
              />
            </div>

            {/* Negative Prompt */}
            <div>
              <label
                style={{
                  fontSize: 12,
                  fontWeight: 600,
                  color: "var(--text-muted)",
                  marginBottom: 6,
                  display: "block",
                  textTransform: "uppercase",
                  letterSpacing: "0.05em",
                }}
              >
                Negative Prompt
              </label>
              <textarea
                value={form.negativePrompt}
                onChange={(e) => updateField("negativePrompt", e.target.value)}
                className="textarea-field"
                placeholder="Negative prompt..."
                style={{ minHeight: 80 }}
              />
            </div>

            {/* Model & LoRA */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Model</label>
                <input
                  type="text"
                  value={form.model}
                  onChange={(e) => updateField("model", e.target.value)}
                  className="input-field"
                  placeholder="SD 1.5, SDXL, Flux..."
                />
              </div>
              <div>
                <label style={labelStyle}>LoRA</label>
                <input
                  type="text"
                  value={form.lora}
                  onChange={(e) => updateField("lora", e.target.value)}
                  className="input-field"
                  placeholder="LoRA name..."
                />
              </div>
            </div>

            {/* Seed, Sampler, CFG, Steps */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Seed</label>
                <input
                  type="text"
                  value={form.seed}
                  onChange={(e) => updateField("seed", e.target.value)}
                  className="input-field"
                  placeholder="-1"
                />
              </div>
              <div>
                <label style={labelStyle}>Sampler</label>
                <input
                  type="text"
                  value={form.sampler}
                  onChange={(e) => updateField("sampler", e.target.value)}
                  className="input-field"
                  placeholder="Euler a"
                />
              </div>
              <div>
                <label style={labelStyle}>CFG Scale</label>
                <input
                  type="number"
                  value={form.cfgScale}
                  onChange={(e) => updateField("cfgScale", Number(e.target.value))}
                  className="input-field"
                  min={1}
                  max={30}
                />
              </div>
              <div>
                <label style={labelStyle}>Steps</label>
                <input
                  type="number"
                  value={form.steps}
                  onChange={(e) => updateField("steps", Number(e.target.value))}
                  className="input-field"
                  min={1}
                  max={150}
                />
              </div>
            </div>

            {/* Creator & Tags */}
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
              <div>
                <label style={labelStyle}>Creator</label>
                <input
                  type="text"
                  value={form.creator}
                  onChange={(e) => updateField("creator", e.target.value)}
                  className="input-field"
                  placeholder="Tên người tạo..."
                />
              </div>
              <div>
                <label style={labelStyle}>Tags (phân cách bằng dấu phẩy)</label>
                <input
                  type="text"
                  value={form.tags}
                  onChange={(e) => updateField("tags", e.target.value)}
                  className="input-field"
                  placeholder="anime, realistic, portrait..."
                />
              </div>
            </div>

            {/* Notes */}
            <div>
              <label style={labelStyle}>Ghi chú</label>
              <textarea
                value={form.notes}
                onChange={(e) => updateField("notes", e.target.value)}
                className="textarea-field"
                placeholder="Ghi chú thêm..."
                style={{ minHeight: 60 }}
              />
            </div>

            {/* Favorite */}
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <input
                type="checkbox"
                id="favorite"
                checked={form.isFavorite}
                onChange={(e) => updateField("isFavorite", e.target.checked)}
                style={{ width: 16, height: 16 }}
              />
              <label htmlFor="favorite" style={{ fontSize: 14, cursor: "pointer" }}>
                <Star
                  size={14}
                  style={{
                    display: "inline",
                    color: "var(--accent-amber)",
                    marginRight: 4,
                  }}
                />
                Đánh dấu yêu thích
              </label>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div
          style={{
            padding: "16px 24px",
            borderTop: "1px solid var(--border-primary)",
            display: "flex",
            justifyContent: "flex-end",
            gap: 8,
          }}
        >
          <button className="btn-secondary" onClick={onClose}>
            Hủy
          </button>
          <button className="btn-primary" onClick={handleSubmit}>
            <Save size={16} />
            {prompt ? "Cập nhật" : "Tạo Prompt"}
          </button>
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

export default PromptsPage;
