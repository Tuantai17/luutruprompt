"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import { createPortal } from "react-dom";
import { db, createPrompt, updatePrompt, deletePrompt, type Prompt } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
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
  Download,
  Link2,
  RefreshCw,
  Sparkles,
  User,
  Clock,
  ExternalLink,
  ChevronRight,
  Maximize2,
} from "lucide-react";

// Định nghĩa cấu trúc Metadata của video lưu trong notes
interface VideoMetadata {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  originUrl: string;
  platform: string;
  duration: number;
  creator: string;
}

interface ParsedPromptNotes {
  notes: string;
  videoMetadata?: VideoMetadata;
}

// Hàm parse ghi chú để lấy dữ liệu video
function parsePromptNotes(notesStr: string): ParsedPromptNotes {
  if (!notesStr) return { notes: "" };
  try {
    const trimmed = notesStr.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const parsed = JSON.parse(trimmed);
      if (parsed.videoMetadata) {
        return parsed as ParsedPromptNotes;
      }
    }
  } catch (e) {
    // Không phải JSON
  }
  return { notes: notesStr };
}

// Hàm stringify ghi chú kèm dữ liệu video
function stringifyPromptNotes(notes: string, videoMetadata?: VideoMetadata): string {
  if (!videoMetadata) return notes;
  const data: ParsedPromptNotes = {
    notes,
    videoMetadata,
  };
  return JSON.stringify(data);
}

const VideoPromptsPage = () => {
  const [prompts, setPrompts] = useState<Prompt[]>([]);
  const [mounted, setMounted] = useState(false);
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingPrompt, setEditingPrompt] = useState<Prompt | null>(null);
  const [searchQuery, setSearchQuery] = useState("");
  
  // States cho việc tải video bằng link (Tiktok/Facebook...)
  const [videoUrl, setVideoUrl] = useState("");
  const [isCrawling, setIsCrawling] = useState(false);
  const [crawledData, setCrawledData] = useState<any | null>(null);
  const [crawlError, setCrawlError] = useState("");
  const [lightboxVideo, setLightboxVideo] = useState<string | null>(null);

  // States cho Form tạo prompt từ video đã tải
  const [promptForm, setPromptForm] = useState({
    title: "",
    content: "",
    negativePrompt: "",
    model: "Kling AI", // mặc định
    creator: "",
    tags: "",
    notes: "",
    isFavorite: false,
  });

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
      p.content.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.model.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.tags.some(t => t.toLowerCase().includes(searchQuery.toLowerCase())),
  );

  // Hàm thực hiện crawl / tải video qua API
  const handleCrawlVideo = async () => {
    if (!videoUrl) return;
    setIsCrawling(true);
    setCrawlError("");
    setCrawledData(null);

    try {
      // Lấy token của Supabase Auth để gửi kèm trong header
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/video/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`,
        },
        body: JSON.stringify({ url: videoUrl }),
      });

      const resData = await response.json();
      if (!response.ok) {
        throw new Error(resData.error || "Không thể phân tích video này.");
      }

      setCrawledData(resData);
      
      // Tự động điền dữ liệu ban đầu vào form
      const platformName = resData.platform === "tiktok" ? "TikTok" : resData.platform === "facebook" ? "Facebook" : resData.platform.toUpperCase();
      setPromptForm({
        title: `Tham khảo video ${platformName} - ${resData.creator}`,
        content: "",
        negativePrompt: "",
        model: resData.platform === "tiktok" ? "Kling AI" : "Runway Gen-3",
        creator: resData.creator,
        tags: `${resData.platform}, video_prompt`,
        notes: `Video gốc: ${resData.originUrl}`,
        isFavorite: false,
      });

    } catch (err: any) {
      setCrawlError(err.message || "Tải video thất bại. Vui lòng kiểm tra lại liên kết.");
    } finally {
      setIsCrawling(false);
    }
  };

  // Lưu Video Prompt vào thư viện
  const handleSaveVideoPrompt = async () => {
    if (!crawledData) return;

    try {
      const videoMetadata: VideoMetadata = {
        id: crawledData.id,
        videoUrl: crawledData.videoUrl,
        thumbnailUrl: crawledData.thumbnailUrl,
        originUrl: crawledData.originUrl,
        platform: crawledData.platform,
        duration: crawledData.duration,
        creator: crawledData.creator,
      };

      const finalNotes = stringifyPromptNotes(promptForm.notes, videoMetadata);

      await createPrompt({
        title: promptForm.title || "Video Prompt Tham Khảo",
        content: promptForm.content || "No prompt content",
        negativePrompt: promptForm.negativePrompt,
        type: "video",
        model: promptForm.model,
        lora: "",
        seed: "",
        sampler: "",
        cfgScale: 0,
        steps: 0,
        creator: promptForm.creator || crawledData.creator,
        tags: promptForm.tags.split(",").map((t) => t.trim()).filter(Boolean),
        notes: finalNotes,
        isFavorite: promptForm.isFavorite,
      });

      // Clear states và load lại danh sách
      setCrawledData(null);
      setVideoUrl("");
      loadPrompts();
      alert("Đã lưu video và prompt vào thư viện của bạn thành công!");
    } catch (err: any) {
      alert(`Lỗi khi lưu dữ liệu: ${err.message}`);
    }
  };

  const handleDelete = async (id: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa video prompt này khỏi thư viện?")) {
      await deletePrompt(id);
      loadPrompts();
    }
  };

  if (!mounted) return null;

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 1400, margin: "0 auto", paddingBottom: 60 }}>
      {/* Header */}
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
          <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4, display: "flex", alignItems: "center", gap: 8 }}>
            <span className="gradient-text">Video Prompt Inspiration</span>
            <Sparkles size={20} style={{ color: "var(--accent-purple)" }} />
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Tải video TikTok, Facebook không logo và lưu trữ cùng prompt ý tưởng sáng tạo AI của bạn.
          </p>
        </div>
      </div>

      {/* Downloader Section - SnapTik / SnapSave Style */}
      <div
        className="glass-card"
        style={{
          padding: "30px 24px",
          background: "linear-gradient(135deg, rgba(20, 20, 30, 0.9), rgba(139, 92, 246, 0.05))",
          border: "1px solid rgba(139, 92, 246, 0.15)",
          borderRadius: "var(--radius-xl)",
          marginBottom: 32,
          boxShadow: "0 10px 40px rgba(0, 0, 0, 0.2)",
        }}
      >
        <div style={{ textAlign: "center", marginBottom: 20 }}>
          <h2 style={{ fontSize: 20, fontWeight: 700, marginBottom: 6, display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
            <Film size={22} style={{ color: "var(--accent-cyan)" }} />
            Tải Video Trực Tuyến & Lưu Ý Tưởng AI
          </h2>
          <p style={{ fontSize: 13, color: "var(--text-secondary)" }}>
            Dán liên kết TikTok, Facebook, Instagram... không logo để lưu vào thư viện của riêng bạn
          </p>
        </div>

        {/* Input Bar */}
        <div
          style={{
            display: "flex",
            gap: "12px",
            maxWidth: "760px",
            margin: "0 auto",
            position: "relative",
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", flex: 1, minWidth: "280px" }}>
            <Link2
              size={18}
              style={{
                position: "absolute",
                left: 14,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
              }}
            />
            <input
              type="text"
              placeholder="Dán liên kết video TikTok, Facebook, Instagram..."
              value={videoUrl}
              onChange={(e) => setVideoUrl(e.target.value)}
              className="input-field"
              style={{
                paddingLeft: 44,
                height: 52,
                fontSize: 14,
                background: "rgba(10, 10, 15, 0.6)",
                border: "1px solid var(--border-secondary)",
              }}
              disabled={isCrawling}
            />
          </div>

          <button
            onClick={handleCrawlVideo}
            className="btn-primary"
            style={{
              height: 52,
              padding: "0 24px",
              fontSize: 14,
              borderRadius: "var(--radius-md)",
              flexShrink: 0,
              minWidth: "140px",
              justifyContent: "center",
            }}
            disabled={isCrawling || !videoUrl}
          >
            {isCrawling ? (
              <>
                <RefreshCw size={18} className="animate-spin" />
                <span>Đang tải...</span>
              </>
            ) : (
              <>
                <Download size={18} />
                <span>Tải xuống</span>
              </>
            )}
          </button>
        </div>

        {crawlError && (
          <div
            style={{
              maxWidth: "760px",
              margin: "12px auto 0",
              color: "var(--accent-red)",
              fontSize: 13,
              textAlign: "left",
              padding: "8px 16px",
              background: "rgba(239, 68, 68, 0.1)",
              borderRadius: "var(--radius-sm)",
              borderLeft: "3px solid var(--accent-red)",
            }}
          >
            {crawlError}
          </div>
        )}

        <div style={{ textAlign: "center", marginTop: 14, fontSize: 11, color: "var(--text-muted)" }}>
          Ví dụ: https://www.tiktok.com/@username/video/123456789 | https://www.facebook.com/watch/?v=12345
        </div>
      </div>

      {/* Crawled Video Preview and Creator Form (If video crawled successfully) */}
      {crawledData && (
        <div
          className="glass-card animate-scaleIn"
          style={{
            padding: 24,
            border: "1px solid var(--border-accent)",
            background: "rgba(20, 20, 30, 0.95)",
            borderRadius: "var(--radius-xl)",
            marginBottom: 32,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ fontSize: 16, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
              <span className="gradient-text">Tải video thành công! Điền ý tưởng prompt AI của bạn</span>
            </h3>
            <button className="btn-icon" onClick={() => setCrawledData(null)}>
              <X size={18} />
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(320px, 1fr))",
              gap: 24,
            }}
          >
            {/* Left side: Video Player */}
            <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              <div
                style={{
                  position: "relative",
                  borderRadius: "var(--radius-lg)",
                  overflow: "hidden",
                  background: "#000",
                  aspectRatio: "16/9",
                  maxHeight: "340px",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  border: "1px solid var(--border-primary)",
                  boxShadow: "0 4px 20px rgba(0, 0, 0, 0.4)",
                }}
              >
                <video
                  src={crawledData.videoUrl}
                  poster={crawledData.thumbnailUrl}
                  controls
                  playsInline
                  style={{ width: "100%", height: "100%", objectFit: "contain" }}
                />
              </div>

              {/* Video Info Table */}
              <div
                style={{
                  background: "var(--bg-tertiary)",
                  padding: 16,
                  borderRadius: "var(--radius-md)",
                  fontSize: 13,
                  display: "flex",
                  flexDirection: "column",
                  gap: 10,
                }}
              >
                <div style={{ fontWeight: 600, color: "var(--text-primary)", fontSize: 14 }}>
                  {crawledData.title || "TikTok/FB Video"}
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", color: "var(--text-secondary)", fontSize: 12 }}>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><User size={14} /> Tác giả: {crawledData.creator}</span>
                  <span style={{ display: "flex", alignItems: "center", gap: 4 }}><Clock size={14} /> Thời lượng: {crawledData.duration ? `${crawledData.duration}s` : "N/A"}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", fontSize: 12, borderTop: "1px solid var(--border-primary)", paddingTop: 8 }}>
                  <span className={`tag ${crawledData.platform === "tiktok" ? "tag-cyan" : "tag-pink"}`} style={{ textTransform: "uppercase" }}>
                    {crawledData.platform}
                  </span>
                  <a
                    href={crawledData.originUrl}
                    target="_blank"
                    rel="noreferrer"
                    style={{ color: "var(--accent-purple)", display: "flex", alignItems: "center", gap: 4, textDecoration: "none" }}
                  >
                    <span>Xem gốc</span>
                    <ExternalLink size={12} />
                  </a>
                </div>
              </div>
            </div>

            {/* Right side: Prompt Asset Creation Form */}
            <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
              <div>
                <label style={labelStyle}>Tiêu đề Video Prompt</label>
                <input
                  type="text"
                  value={promptForm.title}
                  onChange={(e) => setPromptForm({ ...promptForm, title: e.target.value })}
                  className="input-field"
                  placeholder="Gợi ý: Tên prompt độc đáo..."
                />
              </div>

              <div>
                <label style={labelStyle}>Prompt AI (Ý tưởng viết lại của bạn hoặc copy từ video)</label>
                <textarea
                  value={promptForm.content}
                  onChange={(e) => setPromptForm({ ...promptForm, content: e.target.value })}
                  className="textarea-field"
                  placeholder="Gõ prompt ở đây (Kling, Gen-3, Sora)... VD: A cinematic shot of a futuristic cyberpunk city with neon lights..."
                  style={{ minHeight: 90 }}
                />
              </div>

              <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
                <div>
                  <label style={labelStyle}>Công cụ AI đề xuất</label>
                  <select
                    value={promptForm.model}
                    onChange={(e) => setPromptForm({ ...promptForm, model: e.target.value })}
                    className="select-field"
                    style={{ height: 40 }}
                  >
                    <option value="Kling AI">Kling AI</option>
                    <option value="Runway Gen-3">Runway Gen-3</option>
                    <option value="Luma Dream Machine">Luma Dream Machine</option>
                    <option value="Sora (OpenAI)">Sora (OpenAI)</option>
                    <option value="Pika Labs">Pika Labs</option>
                    <option value="ComfyUI Video">ComfyUI Video</option>
                    <option value="Other Video Tool">Công cụ khác</option>
                  </select>
                </div>
                <div>
                  <label style={labelStyle}>Tags (Phân cách bằng dấu phẩy)</label>
                  <input
                    type="text"
                    value={promptForm.tags}
                    onChange={(e) => setPromptForm({ ...promptForm, tags: e.target.value })}
                    className="input-field"
                    placeholder="tag1, tag2..."
                  />
                </div>
              </div>

              <div>
                <label style={labelStyle}>Ghi chú thêm & Ý tưởng sáng tạo</label>
                <textarea
                  value={promptForm.notes}
                  onChange={(e) => setPromptForm({ ...promptForm, notes: e.target.value })}
                  className="textarea-field"
                  placeholder="Bạn thích điều gì ở video này? Chuyển động camera, ánh sáng, góc quay..."
                  style={{ minHeight: 60 }}
                />
              </div>

              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 8 }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13 }}>
                  <input
                    type="checkbox"
                    checked={promptForm.isFavorite}
                    onChange={(e) => setPromptForm({ ...promptForm, isFavorite: e.target.checked })}
                    style={{
                      width: 16,
                      height: 16,
                      accentColor: "var(--accent-amber)",
                    }}
                  />
                  <span>Đánh dấu Yêu thích (Favorite)</span>
                </label>

                <button
                  onClick={handleSaveVideoPrompt}
                  className="btn-primary"
                  style={{
                    padding: "10px 24px",
                    background: "var(--gradient-warm)",
                    fontWeight: 600,
                  }}
                >
                  <Save size={16} />
                  <span>Lưu vào Thư viện</span>
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Database Library List Section */}
      <div style={{ marginTop: 20 }}>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 20, flexWrap: "wrap", gap: 12 }}>
          <h2 style={{ fontSize: 18, fontWeight: 700, display: "flex", alignItems: "center", gap: 8 }}>
            <Video size={18} style={{ color: "var(--accent-purple)" }} />
            Thư viện Video Prompt Của Bạn
          </h2>

          {/* Search bar */}
          <div style={{ position: "relative", width: "100%", maxWidth: 360 }}>
            <Search size={14} style={{ position: "absolute", left: 12, top: "50%", transform: "translateY(-50%)", color: "var(--text-muted)" }} />
            <input
              type="text"
              placeholder="Tìm video, prompt, tags, công cụ..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="input-field"
              style={{ paddingLeft: 34, height: 38, fontSize: 13 }}
            />
          </div>
        </div>

        {filtered.length === 0 ? (
          <div className="empty-state" style={{ minHeight: 300 }}>
            <div
              style={{
                width: 64,
                height: 64,
                borderRadius: "var(--radius-full)",
                background: "rgba(139, 92, 246, 0.1)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Film size={28} style={{ color: "var(--accent-purple)" }} />
            </div>
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Thư viện đang trống</h3>
            <p style={{ color: "var(--text-secondary)", fontSize: 14, maxWidth: 400, margin: "0 auto" }}>
              Bạn chưa lưu video nào. Hãy dán link video TikTok hoặc Facebook ở trên để tải xuống không logo và lưu trữ.
            </p>
          </div>
        ) : (
          /* Masonry/Grid list */
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(320px, 1fr))",
              gap: 20,
            }}
          >
            {filtered.map((prompt) => {
              // Parse notes để lấy thông tin video
              const { notes, videoMetadata } = parsePromptNotes(prompt.notes);

              return (
                <div
                  key={prompt.id}
                  className="glass-card glass-card-hover"
                  style={{
                    padding: 0,
                    overflow: "hidden",
                    display: "flex",
                    flexDirection: "column",
                    border: "1px solid var(--border-primary)",
                  }}
                >
                  {/* Video Thumbnail với nút Play */}
                  <div
                    style={{
                      position: "relative",
                      width: "100%",
                      aspectRatio: "16/9",
                      background: "#000",
                      overflow: "hidden",
                      cursor: videoMetadata ? "pointer" : "default",
                    }}
                    onClick={() => {
                      if (videoMetadata) {
                        setLightboxVideo(videoMetadata.videoUrl);
                      }
                    }}
                  >
                    {videoMetadata ? (
                      <>
                        <img
                          src={videoMetadata.thumbnailUrl || "/api/placeholder/400/225"}
                          alt={prompt.title}
                          style={{
                            width: "100%",
                            height: "100%",
                            objectFit: "cover",
                            transition: "transform 0.4s",
                          }}
                          className="hover-scale"
                          onError={(e) => {
                            e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=500";
                          }}
                        />
                        <div
                          style={{
                            position: "absolute",
                            inset: 0,
                            background: "rgba(0, 0, 0, 0.4)",
                            display: "flex",
                            alignItems: "center",
                            justifyContent: "center",
                            opacity: 0.85,
                            transition: "all var(--transition-fast)",
                          }}
                          className="play-overlay"
                        >
                          <div
                            style={{
                              width: 44,
                              height: 44,
                              borderRadius: "var(--radius-full)",
                              background: "var(--gradient-primary)",
                              display: "flex",
                              alignItems: "center",
                              justifyContent: "center",
                              boxShadow: "0 0 15px var(--accent-purple)",
                            }}
                          >
                            <Play size={18} color="white" fill="white" style={{ marginLeft: 2 }} />
                          </div>
                        </div>

                        {/* Tag Duration và Platform */}
                        <div style={{ position: "absolute", bottom: 8, right: 8, display: "flex", gap: 6 }}>
                          {videoMetadata.duration > 0 && (
                            <span style={{ fontSize: 10, background: "rgba(0,0,0,0.7)", padding: "2px 6px", borderRadius: 4, color: "white", fontWeight: 600 }}>
                              {videoMetadata.duration}s
                            </span>
                          )}
                          <span style={{
                            fontSize: 10,
                            background: videoMetadata.platform === "tiktok" ? "var(--accent-cyan)" : "var(--accent-purple)",
                            padding: "2px 6px",
                            borderRadius: 4,
                            color: "white",
                            fontWeight: 600,
                            textTransform: "uppercase"
                          }}>
                            {videoMetadata.platform}
                          </span>
                        </div>
                      </>
                    ) : (
                      /* Fallback nếu không có video metadata */
                      <div style={{ width: "100%", height: "100%", display: "flex", alignItems: "center", justifyContent: "center", background: "var(--bg-tertiary)" }}>
                        <Film size={32} style={{ color: "var(--text-muted)" }} />
                      </div>
                    )}
                  </div>

                  {/* Body Card */}
                  <div style={{ padding: 18, flex: 1, display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 8 }}>
                      <h3
                        style={{
                          fontSize: 15,
                          fontWeight: 600,
                          whiteSpace: "nowrap",
                          overflow: "hidden",
                          textOverflow: "ellipsis",
                          flex: 1,
                        }}
                        title={prompt.title}
                      >
                        {prompt.title}
                      </h3>
                      {prompt.isFavorite && (
                        <Star size={14} fill="var(--accent-amber)" style={{ color: "var(--accent-amber)" }} />
                      )}
                    </div>

                    <div style={{ fontSize: 11, color: "var(--text-muted)", marginBottom: 12, display: "flex", justifyContent: "space-between" }}>
                      <span>Tool: <strong style={{ color: "var(--text-secondary)" }}>{prompt.model}</strong></span>
                      {videoMetadata && <span>Creator: <strong style={{ color: "var(--text-secondary)" }}>{videoMetadata.creator}</strong></span>}
                    </div>

                    {/* AI Prompt Content */}
                    <div
                      style={{
                        fontSize: 13,
                        color: "var(--text-secondary)",
                        lineHeight: 1.5,
                        background: "var(--bg-tertiary)",
                        padding: "10px 12px",
                        borderRadius: "var(--radius-sm)",
                        marginBottom: 12,
                        maxHeight: 70,
                        overflow: "hidden",
                        textOverflow: "ellipsis",
                        display: "-webkit-box",
                        WebkitLineClamp: 3,
                        WebkitBoxOrient: "vertical",
                        cursor: "pointer",
                      }}
                      onClick={() => {
                        setEditingPrompt(prompt);
                        setEditorOpen(true);
                      }}
                      title="Bấm để xem và sửa prompt"
                    >
                      {prompt.content || "Chưa nhập prompt..."}
                    </div>

                    {/* User Notes (nếu có) */}
                    {notes && (
                      <div style={{ fontSize: 12, color: "var(--text-muted)", marginBottom: 12, fontStyle: "italic" }}>
                        💡 {truncateText(notes, 80)}
                      </div>
                    )}

                    {/* Tags */}
                    {prompt.tags.length > 0 && (
                      <div style={{ display: "flex", gap: 4, flexWrap: "wrap", marginBottom: 16, marginTop: "auto" }}>
                        {prompt.tags.slice(0, 3).map((tag) => (
                          <span key={tag} className="tag tag-cyan" style={{ fontSize: 10, padding: "2px 6px" }}>
                            {tag}
                          </span>
                        ))}
                      </div>
                    )}

                    {/* Actions Button */}
                    <div
                      style={{
                        display: "flex",
                        gap: 4,
                        borderTop: "1px solid var(--border-primary)",
                        paddingTop: 12,
                        marginTop: prompt.tags.length === 0 ? "auto" : 0,
                      }}
                    >
                      <button
                        className="btn-ghost"
                        onClick={() => {
                          navigator.clipboard.writeText(prompt.content);
                          alert("Đã copy Prompt video thành công!");
                        }}
                        style={{ fontSize: 12 }}
                      >
                        <Copy size={13} /> Copy
                      </button>
                      
                      <button
                        className="btn-ghost"
                        onClick={() => {
                          setEditingPrompt(prompt);
                          setEditorOpen(true);
                        }}
                        style={{ fontSize: 12 }}
                      >
                        <Edit3 size={13} /> Sửa
                      </button>

                      {videoMetadata && (
                        <a
                          href={videoMetadata.videoUrl}
                          download
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ghost"
                          style={{ fontSize: 12, textDecoration: "none", color: "var(--accent-cyan)" }}
                          title="Tải video về máy"
                        >
                          <Download size={13} /> Video
                        </a>
                      )}

                      {videoMetadata?.originUrl && (
                        <a
                          href={videoMetadata.originUrl}
                          target="_blank"
                          rel="noreferrer"
                          className="btn-ghost"
                          style={{ fontSize: 12, textDecoration: "none", color: "var(--accent-purple)" }}
                          title="Xem trên trang gốc (TikTok/Facebook/...)"
                        >
                          <ExternalLink size={13} /> Xem gốc
                        </a>
                      )}

                      <button
                        className="btn-ghost"
                        onClick={() => handleDelete(prompt.id)}
                        style={{ color: "var(--accent-red)", marginLeft: "auto", padding: "6px" }}
                        title="Xóa video"
                      >
                        <Trash2 size={14} />
                      </button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Editor Modal */}
      {mounted && editorOpen && createPortal(
        <VideoPromptEditor
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

      {/* Custom Video Lightbox Player */}
      {mounted && lightboxVideo && createPortal(
        <div
          className="lightbox-overlay animate-fadeIn"
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.95)",
            zIndex: 100,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            padding: 24,
          }}
          onClick={() => setLightboxVideo(null)}
        >
          <button
            style={{
              position: "absolute",
              top: 20,
              right: 20,
              background: "rgba(255,255,255,0.1)",
              border: "none",
              color: "#fff",
              width: 44,
              height: 44,
              borderRadius: "50%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              cursor: "pointer",
            }}
            onClick={() => setLightboxVideo(null)}
          >
            <X size={24} />
          </button>
          
          <div
            style={{
              maxWidth: "960px",
              width: "100%",
              maxHeight: "80vh",
              aspectRatio: "16/9",
              background: "#000",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              boxShadow: "0 0 40px rgba(139, 92, 246, 0.4)",
            }}
            onClick={(e) => e.stopPropagation()}
          >
            <video
              src={lightboxVideo}
              autoPlay
              controls
              style={{ width: "100%", height: "100%", objectFit: "contain" }}
            />
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

// Editor Component để chỉnh sửa Prompt
const VideoPromptEditor = ({
  prompt,
  onClose,
  onSave,
}: {
  prompt: Prompt | null;
  onClose: () => void;
  onSave: () => void;
}) => {
  const { notes: parsedNotes, videoMetadata } = prompt
    ? parsePromptNotes(prompt.notes)
    : { notes: "", videoMetadata: undefined };

  const [form, setForm] = useState({
    title: prompt?.title || "",
    content: prompt?.content || "",
    negativePrompt: prompt?.negativePrompt || "",
    model: prompt?.model || "Kling AI",
    creator: prompt?.creator || "",
    tags: prompt?.tags?.join(", ") || "",
    notes: parsedNotes || "",
    isFavorite: prompt?.isFavorite || false,
  });

  const handleSubmit = async () => {
    const finalNotes = stringifyPromptNotes(form.notes, videoMetadata);
    
    const data = {
      ...form,
      type: "video" as const,
      lora: "",
      seed: "",
      sampler: "",
      cfgScale: 0,
      steps: 0,
      tags: form.tags.split(",").map((t) => t.trim()).filter(Boolean),
      notes: finalNotes,
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
        <div style={{ padding: "20px 24px", borderBottom: "1px solid var(--border-primary)", display: "flex", justifyContent: "space-between", alignItems: "center" }}>
          <h2 style={{ fontSize: 18, fontWeight: 700 }}>
            <span className="gradient-text">{prompt ? "Chỉnh sửa" : "Thêm"} Video Prompt</span>
          </h2>
          <button className="btn-icon" onClick={onClose}><X size={18} /></button>
        </div>
        <div style={{ padding: 24, display: "flex", flexDirection: "column", gap: 16 }}>
          <div>
            <label style={labelStyle}>Tiêu đề</label>
            <input
              type="text"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
              className="input-field"
              placeholder="Tên prompt..."
            />
          </div>

          <div>
            <label style={labelStyle}>Prompt (Ý tưởng AI)</label>
            <textarea
              value={form.content}
              onChange={(e) => setForm({ ...form, content: e.target.value })}
              className="textarea-field"
              placeholder="Video prompt..."
              style={{ minHeight: 120 }}
            />
          </div>

          <div>
            <label style={labelStyle}>Negative Prompt</label>
            <textarea
              value={form.negativePrompt}
              onChange={(e) => setForm({ ...form, negativePrompt: e.target.value })}
              className="textarea-field"
              placeholder="Negative..."
              style={{ minHeight: 60 }}
            />
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
            <div>
              <label style={labelStyle}>Công cụ AI đề xuất</label>
              <select
                value={form.model}
                onChange={(e) => setForm({ ...form, model: e.target.value })}
                className="select-field"
                style={{ height: 40 }}
              >
                <option value="Kling AI">Kling AI</option>
                <option value="Runway Gen-3">Runway Gen-3</option>
                <option value="Luma Dream Machine">Luma Dream Machine</option>
                <option value="Sora (OpenAI)">Sora (OpenAI)</option>
                <option value="Pika Labs">Pika Labs</option>
                <option value="ComfyUI Video">ComfyUI Video</option>
                <option value="Other Video Tool">Công cụ khác</option>
              </select>
            </div>
            <div>
              <label style={labelStyle}>Creator (Tác giả video)</label>
              <input
                type="text"
                value={form.creator}
                onChange={(e) => setForm({ ...form, creator: e.target.value })}
                className="input-field"
                placeholder="Tên..."
              />
            </div>
          </div>

          <div>
            <label style={labelStyle}>Tags (Phân tách bằng dấu phẩy)</label>
            <input
              type="text"
              value={form.tags}
              onChange={(e) => setForm({ ...form, tags: e.target.value })}
              className="input-field"
              placeholder="tag1, tag2..."
            />
          </div>

          <div>
            <label style={labelStyle}>Ghi chú thêm</label>
            <textarea
              value={form.notes}
              onChange={(e) => setForm({ ...form, notes: e.target.value })}
              className="textarea-field"
              placeholder="Ý tưởng, chuyển động..."
              style={{ minHeight: 80 }}
            />
          </div>

          {videoMetadata && (
            <div style={{ padding: "12px 14px", background: "var(--bg-tertiary)", borderRadius: "var(--radius-sm)", border: "1px solid var(--border-primary)" }}>
              <div style={{ fontSize: 11, fontWeight: 700, color: "var(--text-muted)", textTransform: "uppercase", marginBottom: 6 }}>Thông tin video liên kết</div>
              <div style={{ fontSize: 13, color: "var(--text-secondary)", display: "flex", flexDirection: "column", gap: 4 }}>
                <div>Nền tảng: <strong style={{ color: "var(--text-primary)", textTransform: "uppercase" }}>{videoMetadata.platform}</strong></div>
                <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>Link gốc: <a href={videoMetadata.originUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent-purple)" }}>{videoMetadata.originUrl}</a></div>
                <div style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>File lưu: <a href={videoMetadata.videoUrl} target="_blank" rel="noreferrer" style={{ color: "var(--accent-cyan)" }}>{videoMetadata.videoUrl}</a></div>
              </div>
            </div>
          )}
        </div>
        <div style={{ padding: "16px 24px", borderTop: "1px solid var(--border-primary)", display: "flex", justifyContent: "flex-end", gap: 8 }}>
          <button className="btn-secondary" onClick={onClose}>Hủy</button>
          <button className="btn-primary" onClick={handleSubmit}><Save size={16} /> Cập nhật</button>
        </div>
      </div>
    </div>
  );
};

const labelStyle: React.CSSProperties = {
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-muted)",
  marginBottom: 6,
  display: "block",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
};

export default VideoPromptsPage;
