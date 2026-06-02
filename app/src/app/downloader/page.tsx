"use client";

import { useEffect, useRef, useState } from "react";
import { supabase } from "@/lib/supabaseClient";
import { createPrompt } from "@/lib/db";
import {
  Download,
  Link2,
  RefreshCw,
  Play,
  X,
  User,
  Clock,
  ExternalLink,
  CheckCircle,
  AlertCircle,
  Copy,
  Smartphone,
  Globe,
  Zap,
  Shield,
} from "lucide-react";

// Danh sách nền tảng hỗ trợ
const supportedPlatforms = [
  { name: "TikTok", icon: "🎵", color: "#00f2ea" },
  { name: "Facebook", icon: "📘", color: "#1877F2" },
  { name: "Instagram", icon: "📸", color: "#E4405F" },
  { name: "YouTube", icon: "🎬", color: "#FF0000" },
  { name: "Twitter/X", icon: "🐦", color: "#1DA1F2" },
];

interface DownloadResult {
  id: string;
  title: string;
  videoUrl: string;
  thumbnailUrl: string;
  originUrl: string;
  creator: string;
  platform: string;
  duration: number;
}

const DOWNLOAD_HISTORY_STORAGE_KEY = "promptvault.snapSave.downloadHistory";
const MAX_DOWNLOAD_HISTORY = 10;

const isDownloadResult = (value: unknown): value is DownloadResult => {
  if (!value || typeof value !== "object") return false;
  const item = value as Partial<DownloadResult>;
  return (
    typeof item.id === "string" &&
    typeof item.title === "string" &&
    typeof item.videoUrl === "string" &&
    typeof item.thumbnailUrl === "string" &&
    typeof item.originUrl === "string" &&
    typeof item.creator === "string" &&
    typeof item.platform === "string" &&
    typeof item.duration === "number"
  );
};

const readStoredDownloadHistory = (): DownloadResult[] => {
  if (typeof window === "undefined") return [];

  try {
    const savedHistory = window.localStorage.getItem(DOWNLOAD_HISTORY_STORAGE_KEY);
    if (!savedHistory) return [];

    const parsedHistory = JSON.parse(savedHistory);
    if (!Array.isArray(parsedHistory)) return [];

    return parsedHistory.filter(isDownloadResult).slice(0, MAX_DOWNLOAD_HISTORY);
  } catch {
    window.localStorage.removeItem(DOWNLOAD_HISTORY_STORAGE_KEY);
    return [];
  }
};

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

const DownloaderPage = () => {
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [error, setError] = useState("");
  const [downloadHistory, setDownloadHistory] = useState<DownloadResult[]>(readStoredDownloadHistory);
  const [lightboxVideo, setLightboxVideo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    try {
      window.localStorage.setItem(
        DOWNLOAD_HISTORY_STORAGE_KEY,
        JSON.stringify(downloadHistory.slice(0, MAX_DOWNLOAD_HISTORY)),
      );
    } catch {
      // Browser storage may be disabled or full.
    }
  }, [downloadHistory]);

  // Dán link từ clipboard
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      inputRef.current?.focus();
    } catch {
      // Người dùng từ chối quyền clipboard
    }
  };

  // Tải video
  const handleDownload = async () => {
    if (!url.trim()) return;
    setIsLoading(true);
    setError("");
    setResult(null);

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/video/download", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ url: url.trim() }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Không thể phân tích video.");
      }

      setResult(data);

      // Tự động lưu video vào cơ sở dữ liệu (Kho lưu trữ Video)
      try {
        const videoMetadata = {
          id: data.id,
          videoUrl: data.videoUrl,
          thumbnailUrl: data.thumbnailUrl,
          originUrl: data.originUrl,
          platform: data.platform,
          duration: data.duration,
          creator: data.creator,
        };
        const finalNotes = JSON.stringify({ notes: "Đã tải qua SnapSave", videoMetadata });
        
        await createPrompt({
          title: data.title || `Video SnapSave - ${data.creator}`,
          content: "Tải xuống qua công cụ SnapSave Downloader",
          negativePrompt: "",
          type: "video",
          model: "SnapSave",
          lora: "",
          seed: "",
          sampler: "",
          cfgScale: 0,
          steps: 0,
          creator: data.creator,
          tags: ["SnapSave", data.platform],
          notes: finalNotes,
          isFavorite: false,
        });
      } catch (dbErr) {
        console.error("Failed to automatically save video to database:", dbErr);
      }

      setDownloadHistory((prev) => [
        data,
        ...prev.filter((item) => item.id !== data.id && item.videoUrl !== data.videoUrl),
      ].slice(0, MAX_DOWNLOAD_HISTORY));
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Đã xảy ra lỗi khi tải video."));
    } finally {
      setIsLoading(false);
    }
  };

  // Xử lý Enter
  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading && url.trim()) {
      handleDownload();
    }
  };

  // Tải mới
  const handleReset = () => {
    setUrl("");
    setResult(null);
    setError("");
    inputRef.current?.focus();
  };

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 60px" }}>
      {/* Hero Header */}
      <div style={{ textAlign: "center", marginBottom: 36 }}>
        <div
          style={{
            width: 72,
            height: 72,
            borderRadius: "var(--radius-xl)",
            background: "var(--gradient-warm)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            margin: "0 auto 16px",
            boxShadow: "0 8px 30px rgba(244, 114, 182, 0.3)",
          }}
        >
          <Download size={32} color="white" />
        </div>
        <h1
          style={{
            fontSize: 28,
            fontWeight: 800,
            marginBottom: 8,
            letterSpacing: "-0.02em",
          }}
        >
          <span className="gradient-text-warm">SnapSave</span>{" "}
          <span style={{ color: "var(--text-primary)" }}>Video Downloader</span>
        </h1>
        <p style={{ fontSize: 15, color: "var(--text-secondary)", maxWidth: 500, margin: "0 auto" }}>
          Tải video TikTok, Facebook, Instagram không logo — Nhanh chóng, miễn phí và lưu trữ vĩnh viễn trên Cloud của bạn.
        </p>
      </div>

      {/* Main Download Card */}
      <div
        className="glass-card downloader-card"
        style={{
          borderRadius: "var(--radius-xl)",
          background: "linear-gradient(180deg, rgba(30, 30, 46, 0.95), rgba(20, 20, 30, 0.98))",
          border: "1px solid rgba(244, 114, 182, 0.12)",
          boxShadow: "0 12px 50px rgba(0, 0, 0, 0.3)",
          marginBottom: 28,
        }}
      >
        {/* Input Row */}
        <div
          style={{
            display: "flex",
            gap: 10,
            marginBottom: 16,
            flexWrap: "wrap",
          }}
        >
          <div style={{ position: "relative", flex: 1, minWidth: 250 }}>
            <Link2
              size={18}
              style={{
                position: "absolute",
                left: 16,
                top: "50%",
                transform: "translateY(-50%)",
                color: "var(--text-muted)",
                pointerEvents: "none",
              }}
            />
            <input
              ref={inputRef}
              type="text"
              placeholder="Dán liên kết video vào đây..."
              value={url}
              onChange={(e) => setUrl(e.target.value)}
              onKeyDown={handleKeyDown}
              className="input-field"
              style={{
                paddingLeft: 46,
                paddingRight: 12,
                height: 56,
                fontSize: 15,
                background: "rgba(10, 10, 15, 0.7)",
                border: "1px solid var(--border-secondary)",
                borderRadius: "var(--radius-lg)",
              }}
              disabled={isLoading}
            />
          </div>

          {/* Nút Dán */}
          <button
            onClick={handlePaste}
            className="btn-secondary"
            style={{
              height: 56,
              padding: "0 18px",
              fontSize: 13,
              borderRadius: "var(--radius-lg)",
              flexShrink: 0,
              gap: 6,
            }}
            disabled={isLoading}
            title="Dán link từ clipboard"
          >
            <Copy size={16} />
            <span>Dán</span>
          </button>

          {/* Nút Tải */}
          <button
            onClick={handleDownload}
            className="btn-primary"
            style={{
              height: 56,
              padding: "0 28px",
              fontSize: 15,
              borderRadius: "var(--radius-lg)",
              fontWeight: 700,
              flexShrink: 0,
              minWidth: 150,
              justifyContent: "center",
              background: "var(--gradient-warm)",
            }}
            disabled={isLoading || !url.trim()}
          >
            {isLoading ? (
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

        {/* Thông báo lỗi */}
        {error && (
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 10,
              padding: "12px 16px",
              background: "rgba(239, 68, 68, 0.08)",
              border: "1px solid rgba(239, 68, 68, 0.2)",
              borderRadius: "var(--radius-md)",
              marginBottom: 16,
            }}
          >
            <AlertCircle size={18} style={{ color: "var(--accent-red)", flexShrink: 0 }} />
            <span style={{ fontSize: 13, color: "var(--accent-red)" }}>{error}</span>
          </div>
        )}

        {/* Supported Platforms */}
        <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap" }}>
          {supportedPlatforms.map((p) => (
            <div
              key={p.name}
              style={{
                display: "flex",
                alignItems: "center",
                gap: 5,
                fontSize: 12,
                color: "var(--text-muted)",
              }}
            >
              <span style={{ fontSize: 16 }}>{p.icon}</span>
              <span>{p.name}</span>
            </div>
          ))}
        </div>
      </div>

      {/* Result Card */}
      {result && (
        <div
          className="glass-card animate-scaleIn"
          style={{
            padding: 0,
            borderRadius: "var(--radius-xl)",
            overflow: "hidden",
            border: "1px solid rgba(16, 185, 129, 0.2)",
            marginBottom: 32,
          }}
        >
          {/* Success Header */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              padding: "14px 20px",
              background: "rgba(16, 185, 129, 0.08)",
              borderBottom: "1px solid rgba(16, 185, 129, 0.12)",
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <CheckCircle size={18} style={{ color: "var(--accent-green)" }} />
              <span style={{ fontSize: 14, fontWeight: 600, color: "var(--accent-green)" }}>
                Tải video thành công! Đã lưu lên Cloud Storage.
              </span>
            </div>
            <button className="btn-icon" onClick={handleReset} title="Tải video mới">
              <X size={18} />
            </button>
          </div>

          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
              gap: 0,
            }}
          >
            {/* Video Player */}
            <div
              style={{
                position: "relative",
                background: "#000",
                aspectRatio: "16/9",
                minHeight: 240,
                cursor: "pointer",
              }}
              onClick={() => setLightboxVideo(result.videoUrl)}
            >
              <video
                src={result.videoUrl}
                poster={result.thumbnailUrl}
                controls
                playsInline
                style={{ width: "100%", height: "100%", objectFit: "contain" }}
                onClick={(e) => e.stopPropagation()}
              />
            </div>

            {/* Video Info + Actions */}
            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
              {/* Title */}
              <h3
                style={{
                  fontSize: 16,
                  fontWeight: 700,
                  color: "var(--text-primary)",
                  lineHeight: 1.4,
                  display: "-webkit-box",
                  WebkitLineClamp: 2,
                  WebkitBoxOrient: "vertical",
                  overflow: "hidden",
                }}
              >
                {result.title || "Video đã tải"}
              </h3>

              {/* Metadata */}
              <div style={{ display: "flex", flexDirection: "column", gap: 8, fontSize: 13 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}>
                  <User size={14} style={{ flexShrink: 0 }} />
                  <span>Tác giả: <strong>{result.creator}</strong></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}>
                  <Clock size={14} style={{ flexShrink: 0 }} />
                  <span>Thời lượng: <strong>{result.duration ? `${result.duration}s` : "N/A"}</strong></span>
                </div>
                <div style={{ display: "flex", alignItems: "center", gap: 8, color: "var(--text-secondary)" }}>
                  <Globe size={14} style={{ flexShrink: 0 }} />
                  <span>Nền tảng: </span>
                  <span
                    className={`tag ${result.platform === "tiktok" ? "tag-cyan" : result.platform === "facebook" ? "tag-pink" : ""}`}
                    style={{ textTransform: "uppercase", fontSize: 10, padding: "2px 8px" }}
                  >
                    {result.platform}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: "auto" }}>
                <a
                  href={result.videoUrl}
                  download={`${result.platform}_${result.id}.mp4`}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary"
                  style={{
                    padding: "10px 20px",
                    fontSize: 13,
                    textDecoration: "none",
                    flex: 1,
                    justifyContent: "center",
                    background: "var(--gradient-warm)",
                  }}
                >
                  <Download size={16} />
                  Tải về máy
                </a>

                <a
                  href={result.originUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-secondary"
                  style={{
                    padding: "10px 16px",
                    fontSize: 13,
                    textDecoration: "none",
                    justifyContent: "center",
                  }}
                >
                  <ExternalLink size={14} />
                  Xem gốc
                </a>
              </div>

              {/* Copy Link Button */}
              <button
                className="btn-ghost"
                style={{ fontSize: 12, justifyContent: "center" }}
                onClick={() => {
                  navigator.clipboard.writeText(result.videoUrl);
                  alert("Đã copy link video Cloud thành công!");
                }}
              >
                <Copy size={13} /> Copy link Cloud Storage
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Features Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
          gap: 16,
          marginBottom: 32,
        }}
      >
        {[
          {
            icon: <Zap size={22} style={{ color: "var(--accent-amber)" }} />,
            title: "Nhanh chóng",
            desc: "Dán link và tải ngay, không chờ đợi lâu.",
            bg: "rgba(245, 158, 11, 0.08)",
            border: "rgba(245, 158, 11, 0.15)",
          },
          {
            icon: <Shield size={22} style={{ color: "var(--accent-green)" }} />,
            title: "Không logo/watermark",
            desc: "Video tải về sạch sẽ, không dính logo nền tảng.",
            bg: "rgba(16, 185, 129, 0.08)",
            border: "rgba(16, 185, 129, 0.15)",
          },
          {
            icon: <Globe size={22} style={{ color: "var(--accent-cyan)" }} />,
            title: "Lưu Cloud vĩnh viễn",
            desc: "Video được lưu trên Supabase Storage riêng của bạn.",
            bg: "rgba(6, 182, 212, 0.08)",
            border: "rgba(6, 182, 212, 0.15)",
          },
          {
            icon: <Smartphone size={22} style={{ color: "var(--accent-purple)" }} />,
            title: "Đa nền tảng",
            desc: "Hỗ trợ TikTok, Facebook, Instagram, YouTube, X.",
            bg: "rgba(139, 92, 246, 0.08)",
            border: "rgba(139, 92, 246, 0.15)",
          },
        ].map((feat, i) => (
          <div
            key={i}
            style={{
              padding: "20px 18px",
              borderRadius: "var(--radius-lg)",
              background: feat.bg,
              border: `1px solid ${feat.border}`,
              display: "flex",
              flexDirection: "column",
              gap: 10,
              transition: "all var(--transition-base)",
            }}
          >
            <div
              style={{
                width: 42,
                height: 42,
                borderRadius: "var(--radius-md)",
                background: "var(--bg-tertiary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              {feat.icon}
            </div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: "var(--text-primary)" }}>{feat.title}</h3>
            <p style={{ fontSize: 12, color: "var(--text-secondary)", lineHeight: 1.5 }}>{feat.desc}</p>
          </div>
        ))}
      </div>

      {/* Download History */}
      {downloadHistory.length > 0 && (
        <div>
          <h2
            style={{
              fontSize: 16,
              fontWeight: 700,
              marginBottom: 16,
              display: "flex",
              alignItems: "center",
              gap: 8,
            }}
          >
            <Clock size={16} style={{ color: "var(--accent-purple)" }} />
            Lịch sử tải gần đây
          </h2>

          <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
            {downloadHistory.map((item, idx) => (
              <div
                key={`${item.id}-${idx}`}
                className="glass-card glass-card-hover"
                style={{
                  padding: "12px 16px",
                  display: "flex",
                  alignItems: "center",
                  gap: 14,
                  cursor: "pointer",
                }}
                onClick={() => setLightboxVideo(item.videoUrl)}
              >
                {/* Thumbnail */}
                <div
                  style={{
                    width: 80,
                    height: 50,
                    borderRadius: "var(--radius-sm)",
                    overflow: "hidden",
                    flexShrink: 0,
                    background: "#000",
                    position: "relative",
                  }}
                >
                  <img
                    src={item.thumbnailUrl}
                    alt=""
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=200";
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      background: "rgba(0,0,0,0.3)",
                    }}
                  >
                    <Play size={16} color="white" fill="white" />
                  </div>
                </div>

                {/* Info */}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div
                    style={{
                      fontSize: 13,
                      fontWeight: 600,
                      color: "var(--text-primary)",
                      whiteSpace: "nowrap",
                      overflow: "hidden",
                      textOverflow: "ellipsis",
                    }}
                  >
                    {item.title || "Video đã tải"}
                  </div>
                  <div style={{ fontSize: 11, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 8 }}>
                    <span>{item.creator}</span>
                    <span>•</span>
                    <span style={{ textTransform: "uppercase" }}>{item.platform}</span>
                    {item.duration > 0 && (
                      <>
                        <span>•</span>
                        <span>{item.duration}s</span>
                      </>
                    )}
                  </div>
                </div>

                {/* Quick Actions */}
                <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                  <a
                    href={item.videoUrl}
                    download={`${item.platform}_${item.id}.mp4`}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-icon"
                    style={{ color: "var(--accent-pink)", flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    title="Tải về máy"
                  >
                    <Download size={16} />
                  </a>
                  <a
                    href={item.originUrl}
                    target="_blank"
                    rel="noreferrer"
                    className="btn-icon"
                    style={{ color: "var(--accent-cyan)", flexShrink: 0 }}
                    onClick={(e) => e.stopPropagation()}
                    title="Xem gốc"
                  >
                    <ExternalLink size={15} />
                  </a>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Video Lightbox */}
      {lightboxVideo && (
        <div
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
              zIndex: 101,
            }}
            onClick={() => setLightboxVideo(null)}
          >
            <X size={24} />
          </button>

          <div
            style={{
              maxWidth: 960,
              width: "100%",
              maxHeight: "80vh",
              aspectRatio: "16/9",
              background: "#000",
              borderRadius: "var(--radius-lg)",
              overflow: "hidden",
              boxShadow: "0 0 40px rgba(244, 114, 182, 0.3)",
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
        </div>
      )}

    </div>
  );
};

export default DownloaderPage;
