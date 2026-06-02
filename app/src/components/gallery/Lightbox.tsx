"use client";

import { useEffect, useState } from "react";
import { type ImageRecord, updateImage } from "@/lib/db";
import {
  X,
  ChevronLeft,
  ChevronRight,
  Heart,
  Copy,
  Download,
  Trash2,
  Edit,
  Save,
  Plus,
  Check,
  Sparkles,
  Database,
  Terminal,
} from "lucide-react";
import { formatDate, formatFileSize } from "@/lib/utils";

interface LightboxProps {
  images: ImageRecord[];
  currentId: string;
  onClose: () => void;
  onDelete?: (id: string) => void;
  onUpdate?: () => void;
}

const Lightbox = ({ images, currentId, onClose, onDelete, onUpdate }: LightboxProps) => {
  const [currentIndex, setCurrentIndex] = useState(
    images.findIndex((img) => img.id === currentId),
  );
  const [imageUrl, setImageUrl] = useState<string>("");
  const [isEditing, setIsEditing] = useState(false);

  const currentImage = images[currentIndex];

  // --- Form States for Editing ---
  const [title, setTitle] = useState("");
  const [prompt, setPrompt] = useState("");
  const [negativePrompt, setNegativePrompt] = useState("");
  const [model, setModel] = useState("");
  const [lora, setLora] = useState("");
  const [seed, setSeed] = useState("");
  const [sampler, setSampler] = useState("");
  const [cfgScale, setCfgScale] = useState(7);
  const [steps, setSteps] = useState(20);
  const [creator, setCreator] = useState("");
  const [note, setNote] = useState("");
  const [tags, setTags] = useState<string[]>([]);
  const [newTag, setNewTag] = useState("");

  // Sync image data to state when current index changes
  useEffect(() => {
    if (currentImage) {
      setTitle(currentImage.title || "");
      setPrompt(currentImage.prompt || "");
      setNegativePrompt(currentImage.negativePrompt || "");
      setModel(currentImage.model || "");
      setLora(currentImage.lora || "");
      setSeed(currentImage.seed || "");
      setSampler(currentImage.sampler || "");
      setCfgScale(currentImage.cfgScale ?? 7);
      setSteps(currentImage.steps ?? 20);
      setCreator(currentImage.creator || "");
      setNote(currentImage.note || "");
      setTags(currentImage.tags || []);
      setIsEditing(false); // Reset edit mode on image switch
    }
  }, [currentImage, currentIndex]);

  useEffect(() => {
    if (currentImage?.imageData) {
      const url = URL.createObjectURL(currentImage.imageData);
      setImageUrl(url);
      return () => URL.revokeObjectURL(url);
    }
  }, [currentImage]);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
      if (e.key === "ArrowLeft" && !isEditing) goToPrev();
      if (e.key === "ArrowRight" && !isEditing) goToNext();
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  });

  const goToPrev = () => {
    setCurrentIndex((i) => (i > 0 ? i - 1 : images.length - 1));
  };

  const goToNext = () => {
    setCurrentIndex((i) => (i < images.length - 1 ? i + 1 : 0));
  };

  const downloadImage = () => {
    if (!currentImage) return;
    const a = document.createElement("a");
    a.href = imageUrl;
    a.download = `${currentImage.title || "image"}.${currentImage.format || "png"}`;
    a.click();
  };

  const handleToggleFavorite = async () => {
    if (!currentImage) return;
    const nextFavorite = !currentImage.isFavorite;
    await updateImage(currentImage.id, { isFavorite: nextFavorite });
    
    if (onUpdate) onUpdate();
  };

  const handleSave = async () => {
    if (!currentImage) return;
    try {
      await updateImage(currentImage.id, {
        title,
        prompt,
        negativePrompt,
        model,
        lora,
        seed,
        sampler,
        cfgScale: Number(cfgScale) || 7,
        steps: Number(steps) || 20,
        creator,
        note,
        tags,
      });

      setIsEditing(false);
      if (onUpdate) onUpdate();
    } catch (err) {
      console.error("Failed to update image metadata", err);
    }
  };

  const handleAddTag = (e: React.FormEvent) => {
    e.preventDefault();
    const trimmed = newTag.trim();
    if (trimmed && !tags.includes(trimmed)) {
      setTags((prev) => [...prev, trimmed]);
      setNewTag("");
    }
  };

  const handleRemoveTag = (tagToRemove: string) => {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  };

  if (!currentImage) return null;

  return (
    <div className="lightbox-overlay" onClick={onClose} style={{ backdropFilter: "blur(12px)", background: "rgba(5,5,10,0.94)" }}>
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          display: "flex",
          width: "100%",
          height: "100%",
          maxWidth: 1440,
        }}
      >
        {/* Left: Image Viewer (Beautiful Flexbox dynamic center) */}
        <div
          style={{
            flex: 1,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            position: "relative",
            padding: "24px 72px",
            height: "100%",
          }}
        >
          {/* Nav Prev (Glassmorphic) */}
          <button
            onClick={goToPrev}
            className="btn-icon"
            style={{
              position: "absolute",
              left: 24,
              background: "rgba(20,20,30,0.5)",
              backdropFilter: "blur(8px)",
              color: "rgba(255,255,255,0.8)",
              width: 46,
              height: 46,
              borderRadius: "50%",
              zIndex: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(139,92,246,0.25)";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(20,20,30,0.5)";
              e.currentTarget.style.color = "rgba(255,255,255,0.8)";
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            }}
          >
            <ChevronLeft size={22} />
          </button>

          {/* Core Image Frame with sophisticated glow */}
          {imageUrl && (
            <div 
              style={{
                position: "relative",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                maxHeight: "80vh",
                maxWidth: "100%",
              }}
            >
              <img
                src={imageUrl}
                alt={currentImage.title}
                style={{
                  maxWidth: "100%",
                  maxHeight: "80vh",
                  objectFit: "contain",
                  borderRadius: "var(--radius-lg)",
                  boxShadow: "0 25px 60px rgba(0,0,0,0.85), 0 0 40px rgba(139,92,246,0.18)",
                  border: "1px solid rgba(255,255,255,0.06)",
                  transition: "all 0.4s ease",
                }}
              />
            </div>
          )}

          {/* Nav Next (Glassmorphic - Placed symmetrically on the right side of left pane!) */}
          <button
            onClick={goToNext}
            className="btn-icon"
            style={{
              position: "absolute",
              right: 24, // Symmetrical to left:24px inside the left flex-pane!
              background: "rgba(20,20,30,0.5)",
              backdropFilter: "blur(8px)",
              color: "rgba(255,255,255,0.8)",
              width: 46,
              height: 46,
              borderRadius: "50%",
              zIndex: 10,
              border: "1px solid rgba(255,255,255,0.08)",
              boxShadow: "0 8px 32px rgba(0,0,0,0.4)",
              transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.background = "rgba(139,92,246,0.25)";
              e.currentTarget.style.color = "white";
              e.currentTarget.style.transform = "scale(1.05)";
              e.currentTarget.style.borderColor = "rgba(139,92,246,0.3)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.background = "rgba(20,20,30,0.5)";
              e.currentTarget.style.color = "rgba(255,255,255,0.8)";
              e.currentTarget.style.transform = "scale(1)";
              e.currentTarget.style.borderColor = "rgba(255,255,255,0.08)";
            }}
          >
            <ChevronRight size={22} />
          </button>
        </div>

        {/* Right: Ultimate Premium Info Panel */}
        <div
          style={{
            width: 300,
            height: "100%",
            background: "rgba(12,12,18,0.92)",
            backdropFilter: "blur(25px)",
            borderLeft: "1px solid rgba(255,255,255,0.07)",
            overflow: "hidden",
            display: "flex",
            flexDirection: "column",
            boxShadow: "-15px 0 45px rgba(0,0,0,0.6)",
          }}
        >
          {/* Header */}
          <div
            style={{
              padding: "20px 24px",
              borderBottom: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              justifyContent: "space-between",
              alignItems: "center",
              background: "rgba(8,8,12,0.6)",
              position: "sticky",
              top: 0,
              zIndex: 20,
            }}
          >
            <h3 style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              {isEditing ? (
                <>
                  <Sparkles size={16} className="animate-pulse" style={{ color: "var(--accent-cyan)" }} />
                  <span style={{ color: "var(--accent-cyan)" }}>Chỉnh sửa thông số</span>
                </>
              ) : (
                <>
                  <Database size={15} style={{ color: "var(--accent-purple)" }} />
                  <span>Chi tiết ảnh AI</span>
                </>
              )}
            </h3>
            <div style={{ display: "flex", gap: 6 }}>
              <button
                className="btn-icon"
                onClick={() => setIsEditing(!isEditing)}
                title={isEditing ? "Hủy chỉnh sửa" : "Chỉnh sửa thông tin"}
                style={{
                  width: 32,
                  height: 32,
                  color: isEditing ? "var(--text-muted)" : "var(--accent-purple)",
                  background: isEditing ? "rgba(255,255,255,0.03)" : "rgba(139,92,246,0.12)",
                  border: `1px solid ${isEditing ? "rgba(255,255,255,0.05)" : "rgba(139,92,246,0.2)"}`,
                  borderRadius: "var(--radius-md)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                <Edit size={13} />
              </button>
              <button 
                className="btn-icon" 
                onClick={onClose} 
                style={{ 
                  width: 32, 
                  height: 32,
                  background: "rgba(255,255,255,0.03)",
                  border: "1px solid rgba(255,255,255,0.05)",
                  borderRadius: "var(--radius-md)",
                  transition: "all 0.2s ease",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "scale(1.05)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = "scale(1)"; }}
              >
                <X size={15} />
              </button>
            </div>
          </div>

          {/* Info Panel Content */}
          <div style={{ padding: "20px 22px", flex: 1, overflowY: "auto" }}>
            {isEditing ? (
              // --- EDIT FORM ---
              <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
                {/* Title */}
                <div>
                  <label className="form-label" style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>
                    Tiêu đề ảnh
                  </label>
                  <input
                    type="text"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className="input-field"
                    placeholder="Nhập tiêu đề ảnh..."
                  />
                </div>

                {/* Prompt */}
                <div>
                  <label className="form-label" style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>
                    Positive Prompt
                  </label>
                  <textarea
                    value={prompt}
                    onChange={(e) => setPrompt(e.target.value)}
                    className="input-field"
                    style={{ minHeight: 90, resize: "vertical", fontSize: 12, fontFamily: "monospace" }}
                    placeholder="Positive prompt..."
                  />
                </div>

                {/* Negative Prompt */}
                <div>
                  <label className="form-label" style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>
                    Negative Prompt
                  </label>
                  <textarea
                    value={negativePrompt}
                    onChange={(e) => setNegativePrompt(e.target.value)}
                    className="input-field"
                    style={{ minHeight: 70, resize: "vertical", fontSize: 12, fontFamily: "monospace" }}
                    placeholder="Negative prompt..."
                  />
                </div>

                {/* Model & Creator */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>Model</label>
                    <input
                      type="text"
                      value={model}
                      onChange={(e) => setModel(e.target.value)}
                      className="input-field"
                      placeholder="v1-5..."
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>Người tạo</label>
                    <input
                      type="text"
                      value={creator}
                      onChange={(e) => setCreator(e.target.value)}
                      className="input-field"
                      placeholder="Creator..."
                    />
                  </div>
                </div>

                {/* LoRA & Sampler */}
                <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>LoRA</label>
                    <input
                      type="text"
                      value={lora}
                      onChange={(e) => setLora(e.target.value)}
                      className="input-field"
                      placeholder="LoRA name..."
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>Sampler</label>
                    <input
                      type="text"
                      value={sampler}
                      onChange={(e) => setSampler(e.target.value)}
                      className="input-field"
                      placeholder="Euler a..."
                    />
                  </div>
                </div>

                {/* Seed, CFG Scale, Steps */}
                <div style={{ display: "grid", gridTemplateColumns: "1.2fr 0.9fr 0.9fr", gap: 6 }}>
                  <div>
                    <label className="form-label" style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>Seed</label>
                    <input
                      type="text"
                      value={seed}
                      onChange={(e) => setSeed(e.target.value)}
                      className="input-field"
                      placeholder="Seed..."
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>CFG</label>
                    <input
                      type="number"
                      step="0.5"
                      value={cfgScale}
                      onChange={(e) => setCfgScale(parseFloat(e.target.value) || 0)}
                      className="input-field"
                    />
                  </div>
                  <div>
                    <label className="form-label" style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>Steps</label>
                    <input
                      type="number"
                      value={steps}
                      onChange={(e) => setSteps(parseInt(e.target.value, 10) || 0)}
                      className="input-field"
                    />
                  </div>
                </div>

                {/* Tags Editor */}
                <div>
                  <label className="form-label" style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>
                    Thẻ (Tags)
                  </label>
                  <form onSubmit={handleAddTag} style={{ display: "flex", gap: 4, marginBottom: 8 }}>
                    <input
                      type="text"
                      value={newTag}
                      onChange={(e) => setNewTag(e.target.value)}
                      className="input-field"
                      placeholder="Thêm tag..."
                      style={{ flex: 1, height: 32, fontSize: 12 }}
                    />
                    <button
                      type="submit"
                      className="btn-primary"
                      style={{ width: 32, height: 32, padding: 0, display: "flex", alignItems: "center", justifyContent: "center" }}
                    >
                      <Plus size={14} />
                    </button>
                  </form>
                  <div style={{ display: "flex", flexWrap: "wrap", gap: 4 }}>
                    {tags.map((tag) => (
                      <span
                        key={tag}
                        className="tag"
                        style={{
                          display: "flex",
                          alignItems: "center",
                          gap: 4,
                          padding: "2px 6px",
                          fontSize: 11,
                        }}
                      >
                        {tag}
                        <button
                          type="button"
                          onClick={() => handleRemoveTag(tag)}
                          style={{
                            border: "none",
                            background: "transparent",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            fontSize: 10,
                            padding: 0,
                            display: "flex",
                            alignItems: "center",
                          }}
                        >
                          <X size={10} />
                        </button>
                      </span>
                    ))}
                  </div>
                </div>

                {/* Notes */}
                <div>
                  <label className="form-label" style={{ fontSize: 10, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", letterSpacing: "0.05em", marginBottom: 6, display: "block" }}>Ghi chú</label>
                  <textarea
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    className="input-field"
                    style={{ minHeight: 60, resize: "vertical", fontSize: 12 }}
                    placeholder="Thêm ghi chú cá nhân..."
                  />
                </div>

                {/* Save Button */}
                <button
                  className="btn-primary"
                  onClick={handleSave}
                  style={{ width: "100%", marginTop: 8 }}
                >
                  <Save size={16} /> Lưu thay đổi
                </button>
              </div>
            ) : (
              // --- VIEW MODE ---
              <div>
                {/* Title */}
                <h4
                  style={{
                    fontSize: 17,
                    fontWeight: 800,
                    marginBottom: 16,
                    wordBreak: "break-word",
                    color: "var(--text-primary)",
                    lineHeight: 1.4,
                    letterSpacing: "-0.01em"
                  }}
                >
                  {currentImage.title || "Untitled"}
                </h4>

                {/* Positive Prompt & Negative Prompt */}
                {currentImage.prompt && (
                  <MetaField
                    label="Prompt"
                    value={currentImage.prompt}
                    allowCopy
                  />
                )}
                {currentImage.negativePrompt && (
                  <MetaField 
                    label="Negative Prompt" 
                    value={currentImage.negativePrompt} 
                    allowCopy
                  />
                )}

                {/* Tech specifications label line */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, margin: "20px 0 12px 0" }}>
                  <span style={{ fontSize: 10, fontWeight: 800, color: "rgba(255,255,255,0.45)", textTransform: "uppercase", letterSpacing: "0.08em" }}>
                    Thông số kỹ thuật
                  </span>
                  <div style={{ flex: 1, height: "1px", background: "rgba(255,255,255,0.06)" }} />
                </div>

                {/* High Contrast Technical Variables Grid */}
                <div 
                  style={{ 
                    display: "grid", 
                    gridTemplateColumns: "1fr 1fr", 
                    gap: 8, 
                    marginBottom: 16 
                  }}
                >
                  {currentImage.model && (
                    <GridMetaField label="Model" value={currentImage.model} />
                  )}
                  {currentImage.creator && (
                    <GridMetaField label="Người tạo" value={currentImage.creator} />
                  )}
                  {currentImage.sampler && (
                    <GridMetaField label="Sampler" value={currentImage.sampler} />
                  )}
                  {currentImage.lora && (
                    <GridMetaField label="LoRA" value={currentImage.lora} allowCopy />
                  )}
                  {currentImage.seed && (
                    <GridMetaField label="Seed" value={currentImage.seed} allowCopy />
                  )}
                  {currentImage.cfgScale > 0 && (
                    <GridMetaField label="CFG Scale" value={String(currentImage.cfgScale)} />
                  )}
                  {currentImage.steps > 0 && (
                    <GridMetaField label="Steps" value={String(currentImage.steps)} />
                  )}
                </div>

                {/* Dimensions & File Size Grid */}
                <div
                  style={{
                    display: "grid",
                    gridTemplateColumns: "1fr 1fr",
                    gap: 8,
                    marginTop: 12,
                  }}
                >
                  <div
                    style={{
                      padding: "10px 12px",
                      background: "rgba(26,26,36,0.3)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid rgba(255,255,255,0.03)",
                      fontSize: 12,
                    }}
                  >
                    <div style={{ color: "rgba(255,255,255,0.4)", marginBottom: 4, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      Kích thước
                    </div>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      {currentImage.width}×{currentImage.height}
                    </div>
                  </div>
                  <div
                    style={{
                      padding: "10px 12px",
                      background: "rgba(26,26,36,0.3)",
                      borderRadius: "var(--radius-md)",
                      border: "1px solid rgba(255,255,255,0.03)",
                      fontSize: 12,
                    }}
                  >
                    <div style={{ color: "rgba(255,255,255,0.4)", marginBottom: 4, fontWeight: 600, fontSize: 10, textTransform: "uppercase", letterSpacing: "0.03em" }}>
                      Dung lượng
                    </div>
                    <div style={{ fontWeight: 700, color: "var(--text-primary)" }}>
                      {formatFileSize(currentImage.fileSize)}
                    </div>
                  </div>
                </div>

                {/* Tags */}
                {currentImage.tags && currentImage.tags.length > 0 && (
                  <div style={{ marginTop: 20 }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.45)",
                        marginBottom: 8,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em"
                      }}
                    >
                      Tags
                    </div>
                    <div style={{ display: "flex", flexWrap: "wrap", gap: 6 }}>
                      {currentImage.tags.map((tag) => (
                        <span key={tag} className="tag" style={{ fontSize: 11, background: "rgba(139,92,246,0.12)", borderColor: "rgba(139,92,246,0.25)", color: "#c4b5fd" }}>
                          {tag}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                {/* Notes */}
                {currentImage.note && (
                  <div style={{ marginTop: 20 }}>
                    <div
                      style={{
                        fontSize: 10,
                        color: "rgba(255,255,255,0.45)",
                        marginBottom: 6,
                        fontWeight: 800,
                        textTransform: "uppercase",
                        letterSpacing: "0.08em"
                      }}
                    >
                      Ghi chú
                    </div>
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        lineHeight: 1.6,
                        background: "rgba(26,26,36,0.3)",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-md)",
                        border: "1px solid rgba(255,255,255,0.03)",
                      }}
                    >
                      {currentImage.note}
                    </div>
                  </div>
                )}

                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 20,
                    textAlign: "right"
                  }}
                >
                  Được lưu lúc: {formatDate(currentImage.createdAt)}
                </div>
              </div>
            )}
          </div>

          {/* Actions Footer */}
          <div
            style={{
              padding: "16px 20px",
              borderTop: "1px solid rgba(255,255,255,0.06)",
              display: "flex",
              gap: 8,
              background: "rgba(8,8,12,0.6)",
            }}
          >
            <button
              className="btn-ghost"
              onClick={handleToggleFavorite}
              style={{
                flex: 1,
                color: currentImage.isFavorite ? "var(--accent-pink)" : "rgba(255,255,255,0.7)",
                background: currentImage.isFavorite ? "rgba(244,114,182,0.12)" : "rgba(255,255,255,0.03)",
                border: `1px solid ${currentImage.isFavorite ? "rgba(244,114,182,0.35)" : "rgba(255,255,255,0.06)"}`,
                borderRadius: "var(--radius-md)",
                height: 40,
                justifyContent: "center",
                fontWeight: 600,
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                if (currentImage.isFavorite) {
                  e.currentTarget.style.boxShadow = "0 0 15px rgba(244,114,182,0.25)";
                } else {
                  e.currentTarget.style.background = "rgba(255,255,255,0.06)";
                }
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.background = currentImage.isFavorite ? "rgba(244,114,182,0.12)" : "rgba(255,255,255,0.03)";
                e.currentTarget.style.boxShadow = "none";
              }}
            >
              <Heart
                size={16}
                style={{
                  fill: currentImage.isFavorite ? "var(--accent-pink)" : "none",
                }}
              />
              {currentImage.isFavorite ? "Đã thích" : "Yêu thích"}
            </button>
            <button 
              className="btn-ghost" 
              onClick={downloadImage} 
              title="Tải ảnh về máy"
              style={{
                width: 40,
                height: 40,
                justifyContent: "center",
                background: "rgba(255,255,255,0.03)",
                border: "1px solid rgba(255,255,255,0.06)",
                borderRadius: "var(--radius-md)",
                transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.transform = "translateY(-1px)";
                e.currentTarget.style.background = "rgba(255,255,255,0.06)";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.transform = "translateY(0)";
                e.currentTarget.style.background = "rgba(255,255,255,0.03)";
              }}
            >
              <Download size={16} />
            </button>
            {onDelete && (
              <button
                className="btn-ghost"
                onClick={() => onDelete(currentImage.id)}
                style={{ 
                  width: 40, 
                  height: 40, 
                  justifyContent: "center", 
                  color: "var(--accent-red)",
                  background: "rgba(239,68,68,0.1)",
                  border: "1px solid rgba(239,68,68,0.2)",
                  borderRadius: "var(--radius-md)",
                  transition: "all 0.3s cubic-bezier(0.4, 0, 0.2, 1)"
                }}
                onMouseEnter={(e) => {
                  e.currentTarget.style.transform = "translateY(-1px)";
                  e.currentTarget.style.boxShadow = "0 0 15px rgba(239,68,68,0.2)";
                }}
                onMouseLeave={(e) => {
                  e.currentTarget.style.transform = "translateY(0)";
                  e.currentTarget.style.boxShadow = "none";
                }}
                title="Xóa ảnh khỏi thư viện"
              >
                <Trash2 size={16} />
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

// ===== Subcomponents for Premium UI Layout =====

/**
 * Large Field component for Prompt and Negative Prompt
 */
const MetaField = ({
  label,
  value,
  allowCopy = false,
}: {
  label: string;
  value: string;
  allowCopy?: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = () => {
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const isPrompt = label.toLowerCase().includes("prompt");
  const isNegative = label.toLowerCase().includes("negative");

  return (
    <div 
      style={{ 
        marginBottom: 12,
        background: "rgba(26,26,36,0.4)",
        borderRadius: "var(--radius-md)",
        padding: "12px 14px",
        border: `1px solid ${isNegative ? "rgba(239,68,68,0.12)" : "rgba(139,92,246,0.18)"}`,
        transition: "all var(--transition-fast)",
        boxShadow: "inset 0 1px 1px rgba(255,255,255,0.01)"
      }}
      className="glass-card-hover"
    >
      <div
        style={{
          fontSize: 10,
          color: isNegative ? "rgba(239,68,68,0.65)" : "var(--text-muted)",
          marginBottom: 8,
          fontWeight: 800,
          textTransform: "uppercase",
          letterSpacing: "0.08em",
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}>
          <Terminal size={11} style={{ color: isNegative ? "var(--accent-red)" : "var(--accent-purple)" }} />
          {label}
        </span>
        {allowCopy && value && (
          <button
            onClick={handleCopy}
            style={{ 
              border: "none",
              background: "transparent",
              cursor: "pointer",
              color: copied ? "var(--accent-green)" : "var(--text-muted)",
              display: "flex",
              alignItems: "center",
              gap: 4,
              padding: "2px 6px",
              borderRadius: "4px",
              transition: "all 0.2s ease",
              outline: "none"
            }}
            title="Sao chép"
          >
            {copied ? (
              <>
                <span style={{ fontSize: 9, color: "var(--accent-green)", fontWeight: 800 }}>Đã chép!</span>
                <Check size={12} strokeWidth={3} style={{ color: "var(--accent-green)" }} />
              </>
            ) : (
              <Copy size={11} className="hover:text-white transition-colors" />
            )}
          </button>
        )}
      </div>
      <div
        style={{
          fontSize: 12,
          color: isNegative ? "rgba(240,240,245,0.85)" : "var(--text-primary)",
          lineHeight: 1.5,
          wordBreak: "break-word",
          maxHeight: 120,
          overflowY: "auto",
          fontFamily: "Consolas, Monaco, 'Courier New', monospace",
          background: "rgba(10,10,15,0.6)",
          padding: "8px 10px",
          borderRadius: "6px",
          border: "1px solid rgba(0,0,0,0.3)"
        }}
      >
        {value}
      </div>
    </div>
  );
};

/**
 * Small component for Grid variables (Seed, Model, CFG, etc.)
 */
const GridMetaField = ({
  label,
  value,
  allowCopy = false,
}: {
  label: string;
  value: string;
  allowCopy?: boolean;
}) => {
  const [copied, setCopied] = useState(false);

  const handleCopy = (e: React.MouseEvent) => {
    e.stopPropagation();
    navigator.clipboard.writeText(value);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div 
      style={{ 
        padding: "10px 12px",
        background: "rgba(26,26,36,0.3)",
        borderRadius: "var(--radius-md)",
        border: "1px solid rgba(255,255,255,0.03)",
        fontSize: 12,
        transition: "all var(--transition-fast)"
      }}
      className="glass-card-hover"
    >
      <div 
        style={{ 
          color: "rgba(255,255,255,0.45)", 
          fontSize: 9, 
          fontWeight: 800, 
          textTransform: "uppercase", 
          letterSpacing: "0.06em", 
          marginBottom: 6, 
          display: "flex", 
          justifyContent: "space-between", 
          alignItems: "center" 
        }}
      >
        <span>{label}</span>
        {allowCopy && value && (
          <button 
            onClick={handleCopy} 
            style={{ 
              border: "none", 
              background: "transparent", 
              cursor: "pointer", 
              color: copied ? "var(--accent-green)" : "rgba(255,255,255,0.45)", 
              padding: 0,
              display: "flex",
              alignItems: "center",
              outline: "none"
            }}
            title="Sao chép"
          >
            {copied ? (
              <Check size={11} strokeWidth={3.5} style={{ color: "var(--accent-green)" }} />
            ) : (
              <Copy size={9} />
            )}
          </button>
        )}
      </div>
      <div 
        style={{ 
          fontWeight: 700, 
          color: "var(--text-primary)", 
          whiteSpace: "nowrap", 
          overflow: "hidden", 
          textOverflow: "ellipsis" 
        }} 
        title={value}
      >
        {value}
      </div>
    </div>
  );
};

export default Lightbox;
