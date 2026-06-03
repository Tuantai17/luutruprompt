"use client";

import { useEffect, useState, useCallback } from "react";
import { createPortal } from "react-dom";
import { db, deletePrompt, type Prompt } from "@/lib/db";
import {
  Film,
  Download,
  ExternalLink,
  Trash2,
  Play,
  FolderOpen,
  CheckSquare,
  Square,
  RefreshCw,
  X,
  Clock,
  User,
  Globe,
  Search,
  CheckCircle,
  AlertCircle,
  Video,
} from "lucide-react";

interface VideoMetadata {
  id: string;
  videoUrl: string;
  thumbnailUrl: string;
  originUrl: string;
  platform: string;
  duration: number;
  creator: string;
}

interface VideoRecord {
  promptId: string;
  title: string;
  creator: string;
  platform: string;
  createdAt: Date;
  videoMetadata: VideoMetadata;
}

// Helper parsing notes
function parseVideoRecord(prompt: Prompt): VideoRecord | null {
  if (!prompt.notes) return null;
  try {
    const trimmed = prompt.notes.trim();
    if (trimmed.startsWith("{") && trimmed.endsWith("}")) {
      const parsed = JSON.parse(trimmed);
      if (parsed.videoMetadata) {
        return {
          promptId: prompt.id,
          title: prompt.title,
          creator: prompt.creator || parsed.videoMetadata.creator || "N/A",
          platform: parsed.videoMetadata.platform || "other",
          createdAt: prompt.createdAt,
          videoMetadata: parsed.videoMetadata as VideoMetadata,
        };
      }
    }
  } catch {
    // ignore
  }
  return null;
}

const sanitizeFileName = (title: string, fallback: string): string => {
  if (!title) return fallback;
  
  let clean = title
    .replace(/[\r\n\t]+/g, " ") // Thay thế xuống dòng, tab bằng dấu cách
    .replace(/[\\/:*?"<>|#%&{}$!@+=`~^;]/g, "_") // Thay thế các ký tự cấm và đặc biệt phổ biến bằng '_'
    .replace(/[^\w\s\d\u00C0-\u1EF9_-]/gi, "") // Chỉ giữ lại chữ cái (bao gồm tiếng Việt), số, dấu cách, dấu gạch ngang, gạch dưới
    .trim(); // Xóa khoảng trắng thừa ở đầu và cuối
    
  // File System Access API cấm tên file kết thúc bằng dấu cách hoặc dấu chấm hoặc dấu gạch dưới
  while (clean.endsWith(".") || clean.endsWith(" ") || clean.endsWith("_")) {
    clean = clean.slice(0, -1).trim();
  }

  // Giới hạn độ dài tên file (khoảng 40 ký tự)
  clean = clean.substring(0, 40).trim();

  // Nếu sau khi lọc tên file trống, dùng fallback
  return clean || fallback;
};

const VideoLibraryPage = () => {
  const [videos, setVideos] = useState<VideoRecord[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [mounted, setMounted] = useState(false);
  const [selectedIds, setSelectedIds] = useState<string[]>([]);
  const [lightboxVideo, setLightboxVideo] = useState<string | null>(null);

  // States cho tính năng Tải Hàng Loạt (Bulk Download)
  const [directoryHandle, setDirectoryHandle] = useState<any>(null);
  const [isBulkDownloading, setIsBulkDownloading] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState({ current: 0, total: 0, currentTitle: "" });
  const [isPickerSupported, setIsPickerSupported] = useState(false);

  // State thông báo kết quả (Custom alert banner)
  const [actionStatus, setActionStatus] = useState<{ type: "success" | "error"; message: string } | null>(null);

  // Tự động ẩn thông báo sau 5 giây
  useEffect(() => {
    if (actionStatus) {
      const timer = setTimeout(() => {
        setActionStatus(null);
      }, 5000);
      return () => clearTimeout(timer);
    }
  }, [actionStatus]);

  const loadVideos = useCallback(async () => {
    try {
      const allPrompts = await db.prompts
        .where("type")
        .equals("video")
        .reverse()
        .sortBy("createdAt");

      const parsedVideos = allPrompts
        .map(parseVideoRecord)
        .filter((v): v is VideoRecord => v !== null);

      setVideos(parsedVideos);
    } catch (err) {
      console.error("Failed to load videos:", err);
    }
  }, []);

  useEffect(() => {
    setMounted(true);
    loadVideos();
    // Kiểm tra xem trình duyệt có hỗ trợ Directory Picker API hay không
    if (typeof window !== "undefined" && "showDirectoryPicker" in window) {
      setIsPickerSupported(true);
    }
  }, [loadVideos]);

  // Bộ lọc tìm kiếm
  const filteredVideos = videos.filter(
    (v) =>
      v.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.creator.toLowerCase().includes(searchQuery.toLowerCase()) ||
      v.platform.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Xử lý chọn/bỏ chọn video
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) =>
      prev.includes(id) ? prev.filter((item) => item !== id) : [...prev, id]
    );
  };

  // Chọn toàn bộ hoặc bỏ chọn toàn bộ
  const toggleSelectAll = () => {
    if (selectedIds.length === filteredVideos.length) {
      setSelectedIds([]);
    } else {
      setSelectedIds(filteredVideos.map((v) => v.promptId));
    }
  };

  // Xóa video khỏi cơ sở dữ liệu
  const handleDeleteVideo = async (promptId: string) => {
    if (confirm("Bạn có chắc chắn muốn xóa video này khỏi thư viện lưu trữ?")) {
      try {
        await deletePrompt(promptId);
        setSelectedIds((prev) => prev.filter((id) => id !== promptId));
        loadVideos();
      } catch (err) {
        setActionStatus({ type: "error", message: "Có lỗi xảy ra khi xóa video." });
      }
    }
  };

  // Thiết lập thư mục lưu bằng File System Access API
  const handleSelectDirectory = async (): Promise<any> => {
    try {
      const handle = await (window as any).showDirectoryPicker({
        mode: "readwrite",
      });
      setDirectoryHandle(handle);
      return handle;
    } catch (err) {
      console.warn("Directory picker rejected or error:", err);
      return null;
    }
  };

  // Tải một video đơn lẻ trực tiếp vào thư mục đã chọn
  const handleSingleDownload = async (video: VideoRecord) => {
    let activeHandle = directoryHandle;

    if (!activeHandle) {
      alert("Vui lòng chọn thư mục lưu trên máy tính của bạn trước khi tải video!");
      activeHandle = await handleSelectDirectory();
      if (!activeHandle) {
        setActionStatus({
          type: "error",
          message: "Tải video thất bại: Bạn chưa chọn thư mục lưu.",
        });
        return;
      }
    }

    setIsBulkDownloading(true); // Dùng chung modal tiến trình tải
    setDownloadProgress({ current: 0, total: 1, currentTitle: video.title });

    try {
      const opts = { mode: "readwrite" };
      if ((await activeHandle.queryPermission(opts)) !== "granted") {
        if ((await activeHandle.requestPermission(opts)) !== "granted") {
          throw new Error("Quyền ghi vào thư mục bị từ chối.");
        }
      }

      setDownloadProgress((prev) => ({ ...prev, current: 1 }));

      const response = await fetch(video.videoMetadata.videoUrl);
      if (!response.ok) throw new Error("Không thể tải video từ Cloud.");
      const blob = await response.blob();

      const cleanTitle = sanitizeFileName(video.title, `video_${video.videoMetadata.id}`);
      const fileName = `${video.platform}_${cleanTitle}_${video.videoMetadata.id}.mp4`;
      const fileHandle = await activeHandle.getFileHandle(fileName, { create: true });
      
      const writable = await fileHandle.createWritable();
      await writable.write(blob);
      await writable.close();

      setActionStatus({
        type: "success",
        message: `🎉 Đã tải video thành công vào thư mục: ${activeHandle.name}`,
      });
    } catch (err: any) {
      setActionStatus({
        type: "error",
        message: `Lỗi khi tải video: ${err.message || err}`,
      });
    } finally {
      setIsBulkDownloading(false);
    }
  };

  // Tải hàng loạt video được chọn
  const handleBulkDownload = async () => {
    if (selectedIds.length === 0) return;

    let activeHandle = directoryHandle;

    if (!activeHandle) {
      alert("Vui lòng chọn thư mục lưu trên máy tính của bạn trước khi tải hàng loạt!");
      activeHandle = await handleSelectDirectory();
      if (!activeHandle) {
        setActionStatus({
          type: "error",
          message: "Tải hàng loạt thất bại: Bạn chưa chọn thư mục lưu.",
        });
        return;
      }
    }

    const selectedVideos = videos.filter((v) => selectedIds.includes(v.promptId));
    setIsBulkDownloading(true);
    setDownloadProgress({ current: 0, total: selectedVideos.length, currentTitle: "" });

    try {
      const opts = { mode: "readwrite" };
      if ((await activeHandle.queryPermission(opts)) !== "granted") {
        if ((await activeHandle.requestPermission(opts)) !== "granted") {
          throw new Error("Quyền ghi vào thư mục bị từ chối.");
        }
      }

      for (let i = 0; i < selectedVideos.length; i++) {
        const video = selectedVideos[i];
        setDownloadProgress((prev) => ({
          ...prev,
          current: i + 1,
          currentTitle: video.title,
        }));

        try {
          const response = await fetch(video.videoMetadata.videoUrl);
          if (!response.ok) throw new Error("Fetch failed");
          const blob = await response.blob();

          const cleanTitle = sanitizeFileName(video.title, `video_${video.videoMetadata.id}`);
          const fileName = `${video.platform}_${cleanTitle}_${video.videoMetadata.id}.mp4`;
          const fileHandle = await activeHandle.getFileHandle(fileName, { create: true });
          
          const writable = await fileHandle.createWritable();
          await writable.write(blob);
          await writable.close();
        } catch (fileErr) {
          console.error(`Lỗi khi lưu video ${video.title}:`, fileErr);
        }
      }
      setActionStatus({
        type: "success",
        message: `🎉 Tải hàng loạt thành công! ${selectedVideos.length} video đã được lưu vào thư mục: ${activeHandle.name}`,
      });
    } catch (err: any) {
      setActionStatus({
        type: "error",
        message: `Đã xảy ra lỗi trong quá trình tải hàng loạt: ${err.message || err}`,
      });
    } finally {
      setIsBulkDownloading(false);
      setSelectedIds([]);
    }
  };

  // Xóa hàng loạt video được chọn
  const handleBulkDelete = async () => {
    if (selectedIds.length === 0) return;

    if (confirm(`Bạn có chắc chắn muốn xóa ${selectedIds.length} video đã chọn khỏi thư viện lưu trữ? (Hành động này cũng sẽ xóa video trên Cloud Storage)`)) {
      setIsDeleting(true);
      setDownloadProgress({ current: 0, total: selectedIds.length, currentTitle: "" });

      try {
        for (let i = 0; i < selectedIds.length; i++) {
          const id = selectedIds[i];
          const video = videos.find((v) => v.promptId === id);
          
          setDownloadProgress((prev) => ({
            ...prev,
            current: i + 1,
            currentTitle: video ? video.title : "Đang xử lý...",
          }));

          await deletePrompt(id);
        }
        setActionStatus({
          type: "success",
          message: `🎉 Đã xóa thành công ${selectedIds.length} video khỏi thư viện và Cloud Storage.`,
        });
      } catch (err: any) {
        setActionStatus({
          type: "error",
          message: `Có lỗi xảy ra trong quá trình xóa hàng loạt: ${err.message || err}`,
        });
      } finally {
        setIsDeleting(false);
        setSelectedIds([]);
        loadVideos();
      }
    }
  };

  if (!mounted) return null;

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 1200, margin: "0 auto", paddingBottom: 60, padding: "0 16px 60px" }}>
      {/* Header Section */}
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "flex-start",
          marginBottom: 24,
          flexWrap: "wrap",
          gap: 16,
        }}
      >
        <div>
          <h1
            style={{
              fontSize: 26,
              fontWeight: 800,
              marginBottom: 6,
              display: "flex",
              alignItems: "center",
              gap: 10,
              letterSpacing: "-0.02em",
            }}
          >
            <Film size={26} className="gradient-text-warm" style={{ flexShrink: 0 }} />
            <span>Kho lưu trữ Video</span>
          </h1>
          <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
            Quản lý tất cả các video đã tải từ SnapSave. Xem lại, tải về máy hoặc tải hàng loạt nhanh chóng.
          </p>
        </div>

        {/* Search Bar */}
        <div style={{ position: "relative", width: "100%", maxWidth: 300 }}>
          <Search
            size={16}
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
            placeholder="Tìm kiếm video, tác giả..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="input-field"
            style={{ paddingLeft: 38, height: 42, fontSize: 13 }}
          />
        </div>
      </div>

      {/* Action Status Banner */}
      {actionStatus && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            gap: 12,
            padding: "12px 16px",
            background: actionStatus.type === "success" ? "rgba(16, 185, 129, 0.08)" : "rgba(239, 68, 68, 0.08)",
            border: actionStatus.type === "success" ? "1px solid rgba(16, 185, 129, 0.2)" : "1px solid rgba(239, 68, 68, 0.2)",
            borderRadius: "var(--radius-lg)",
            marginBottom: 20,
            animation: "fadeIn 0.3s ease",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {actionStatus.type === "success" ? (
              <CheckCircle size={18} style={{ color: "var(--accent-green)", flexShrink: 0 }} />
            ) : (
              <AlertCircle size={18} style={{ color: "var(--accent-red)", flexShrink: 0 }} />
            )}
            <span style={{ fontSize: 13, fontWeight: 500, color: actionStatus.type === "success" ? "var(--accent-green)" : "var(--accent-red)" }}>
              {actionStatus.message}
            </span>
          </div>
          <button
            onClick={() => setActionStatus(null)}
            style={{
              background: "none",
              border: "none",
              color: "var(--text-muted)",
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              padding: 0,
            }}
          >
            <X size={16} />
          </button>
        </div>
      )}

      {/* Tiến trình Tải hàng loạt (In-page Banner) */}
      {isBulkDownloading && (
        <div
          className="glass-card animate-fadeIn"
          style={{
            padding: "16px 20px",
            borderRadius: "var(--radius-lg)",
            border: "1px solid rgba(139, 92, 246, 0.25)",
            background: "rgba(139, 92, 246, 0.04)",
            marginBottom: 20,
            display: "flex",
            flexDirection: "column",
            gap: 10,
          }}
        >
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <RefreshCw size={16} className="animate-spin" style={{ color: "var(--accent-purple)" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                Đang tải hàng loạt video...
              </span>
            </div>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Tiến trình: <strong>{downloadProgress.current}</strong> / <strong>{downloadProgress.total}</strong>
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ width: "100%", height: 6, background: "var(--border-primary)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
            <div
              style={{
                width: `${(downloadProgress.current / downloadProgress.total) * 100}%`,
                height: "100%",
                background: "var(--gradient-warm)",
                borderRadius: "var(--radius-full)",
                transition: "width 0.3s ease-out",
              }}
            />
          </div>

          <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Đang tải: {downloadProgress.currentTitle || "Khởi động..."}
          </span>
        </div>
      )}

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
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", flexWrap: "wrap", gap: 8 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
              <RefreshCw size={16} className="animate-spin" style={{ color: "var(--accent-red)" }} />
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--accent-red)" }}>
                Đang xóa hàng loạt video...
              </span>
            </div>
            <span style={{ fontSize: 12, color: "var(--text-secondary)" }}>
              Tiến trình: <strong>{downloadProgress.current}</strong> / <strong>{downloadProgress.total}</strong>
            </span>
          </div>

          {/* Progress Bar */}
          <div style={{ width: "100%", height: 6, background: "var(--border-primary)", borderRadius: "var(--radius-full)", overflow: "hidden" }}>
            <div
              style={{
                width: `${(downloadProgress.current / downloadProgress.total) * 100}%`,
                height: "100%",
                background: "linear-gradient(90deg, #ef4444 0%, #b91c1c 100%)",
                borderRadius: "var(--radius-full)",
                transition: "width 0.3s ease-out",
              }}
            />
          </div>

          <span style={{ fontSize: 11.5, color: "var(--text-muted)", fontStyle: "italic", whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>
            Đang xóa: {downloadProgress.currentTitle || "Khởi động..."}
          </span>
        </div>
      )}

      {/* Bulk Download Settings Bar */}
      {videos.length > 0 && (
        <div
          className="glass-card"
          style={{
            padding: "16px 20px",
            borderRadius: "var(--radius-lg)",
            display: "flex",
            justifyContent: "space-between",
            alignItems: "center",
            flexWrap: "wrap",
            gap: 16,
            marginBottom: 24,
            border: "1px solid rgba(139, 92, 246, 0.1)",
          }}
        >
          <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
            {/* Toggle Select All */}
            <button
              onClick={toggleSelectAll}
              className="btn-secondary"
              style={{ padding: "8px 14px", fontSize: 13, height: 38, gap: 6 }}
            >
              {selectedIds.length === filteredVideos.length ? (
                <>
                  <CheckSquare size={16} style={{ color: "var(--accent-purple)" }} />
                  <span>Bỏ chọn tất cả</span>
                </>
              ) : (
                <>
                  <Square size={16} />
                  <span>Chọn tất cả ({selectedIds.length}/{filteredVideos.length})</span>
                </>
              )}
            </button>

            {/* Select Local Directory (Only if supported by browser) */}
            {isPickerSupported ? (
              <button
                onClick={handleSelectDirectory}
                className="btn-secondary"
                style={{
                  padding: "8px 14px",
                  fontSize: 13,
                  height: 38,
                  gap: 6,
                  borderColor: directoryHandle ? "rgba(16, 185, 129, 0.3)" : "var(--border-primary)",
                  background: directoryHandle ? "rgba(16, 185, 129, 0.05)" : "var(--bg-tertiary)",
                }}
                title="Chọn thư mục trên máy tính của bạn để lưu video trực tiếp"
              >
                <FolderOpen size={16} style={{ color: directoryHandle ? "var(--accent-green)" : "var(--text-secondary)" }} />
                <span>
                  {directoryHandle ? `Thư mục lưu: ${directoryHandle.name}` : "Cài đặt thư mục lưu"}
                </span>
              </button>
            ) : (
              <span style={{ fontSize: 12, color: "var(--text-muted)", display: "flex", alignItems: "center", gap: 4 }}>
                <AlertCircle size={14} />
                Trình duyệt không hỗ trợ chọn thư mục lưu (Dùng tải mặc định)
              </span>
            )}
          </div>

          <div style={{ display: "flex", gap: 10 }}>
            {/* Action Delete Selected */}
            <button
              onClick={handleBulkDelete}
              className="btn-secondary"
              style={{
                padding: "0 16px",
                height: 38,
                fontSize: 13,
                fontWeight: 600,
                color: "var(--accent-red)",
                borderColor: "rgba(239, 68, 68, 0.2)",
                background: "rgba(239, 68, 68, 0.05)",
                opacity: selectedIds.length === 0 ? 0.5 : 1,
                pointerEvents: selectedIds.length === 0 ? "none" : "auto",
                gap: 6,
              }}
            >
              <Trash2 size={16} />
              <span>Xóa đã chọn ({selectedIds.length})</span>
            </button>

            {/* Action Download Selected */}
            <button
              onClick={handleBulkDownload}
              className="btn-primary"
              style={{
                padding: "0 20px",
                height: 38,
                fontSize: 13,
                fontWeight: 600,
                background: "var(--gradient-warm)",
                opacity: selectedIds.length === 0 ? 0.5 : 1,
                pointerEvents: selectedIds.length === 0 ? "none" : "auto",
              }}
            >
              <Download size={16} />
              Tải hàng loạt ({selectedIds.length} video)
            </button>
          </div>
        </div>
      )}

      {/* Main Grid View */}
      {filteredVideos.length === 0 ? (
        <div className="glass-card empty-state" style={{ padding: "80px 20px" }}>
          <Video size={48} style={{ color: "var(--text-muted)", opacity: 0.5 }} />
          <h3 style={{ fontSize: 16, fontWeight: 700, marginTop: 12 }}>Chưa có video lưu trữ</h3>
          <p style={{ fontSize: 13, color: "var(--text-secondary)", maxWidth: 400, margin: "0 auto" }}>
            Hãy vào mục **SnapSave** tải video từ TikTok hoặc Facebook về. Các video sẽ tự động hiển thị tại đây để quản lý lâu dài.
          </p>
        </div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
            gap: 20,
          }}
        >
          {filteredVideos.map((video) => {
            const isSelected = selectedIds.includes(video.promptId);
            return (
              <div
                key={video.promptId}
                className={`glass-card glass-card-hover ${isSelected ? "selected-video-card" : ""}`}
                style={{
                  padding: 0,
                  borderRadius: "var(--radius-xl)",
                  overflow: "hidden",
                  border: isSelected
                    ? "1.5px solid var(--accent-purple)"
                    : "1px solid var(--border-primary)",
                  position: "relative",
                  display: "flex",
                  flexDirection: "column",
                  transition: "all var(--transition-base)",
                  boxShadow: isSelected ? "0 8px 30px rgba(139, 92, 246, 0.15)" : "none",
                }}
              >
                {/* Selection Checkbox Overlay */}
                <button
                  onClick={() => toggleSelect(video.promptId)}
                  style={{
                    position: "absolute",
                    top: 12,
                    left: 12,
                    zIndex: 10,
                    width: 28,
                    height: 28,
                    borderRadius: "50%",
                    background: isSelected ? "var(--accent-purple)" : "rgba(0,0,0,0.5)",
                    border: isSelected ? "none" : "1.5px solid #fff",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    cursor: "pointer",
                    color: "#fff",
                    boxShadow: "0 2px 8px rgba(0,0,0,0.3)",
                  }}
                  title={isSelected ? "Bỏ chọn" : "Chọn video này"}
                >
                  {isSelected ? <CheckCircle size={16} /> : null}
                </button>

                {/* Video Playable Thumbnail */}
                <div
                  style={{
                    position: "relative",
                    width: "100%",
                    aspectRatio: "16/9",
                    background: "#000",
                    overflow: "hidden",
                    cursor: "pointer",
                  }}
                  onClick={() => setLightboxVideo(video.videoMetadata.videoUrl)}
                >
                  <img
                    src={video.videoMetadata.thumbnailUrl}
                    alt={video.title}
                    style={{ width: "100%", height: "100%", objectFit: "cover" }}
                    onError={(e) => {
                      e.currentTarget.src = "https://images.unsplash.com/photo-1618005182384-a83a8bd57fbe?w=400";
                    }}
                  />
                  <div
                    style={{
                      position: "absolute",
                      inset: 0,
                      background: "rgba(0,0,0,0.35)",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      opacity: 0.9,
                      transition: "opacity var(--transition-fast)",
                    }}
                  >
                    <div
                      style={{
                        width: 44,
                        height: 44,
                        borderRadius: "50%",
                        background: "var(--gradient-warm)",
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        boxShadow: "0 4px 15px rgba(244, 114, 182, 0.4)",
                      }}
                    >
                      <Play size={18} color="white" fill="white" style={{ marginLeft: 3 }} />
                    </div>
                  </div>

                  {/* Platform Badge Overlay */}
                  <span
                    className={`tag ${video.platform === "tiktok" ? "tag-cyan" : video.platform === "facebook" ? "tag-pink" : ""}`}
                    style={{
                      position: "absolute",
                      bottom: 12,
                      right: 12,
                      textTransform: "uppercase",
                      fontSize: 10,
                      padding: "2px 8px",
                      zIndex: 5,
                      boxShadow: "0 2px 6px rgba(0,0,0,0.2)",
                    }}
                  >
                    {video.platform}
                  </span>
                </div>

                {/* Content Container */}
                <div style={{ padding: "16px 18px", display: "flex", flexDirection: "column", flex: 1, gap: 12 }}>
                  <h3
                    style={{
                      fontSize: 14,
                      fontWeight: 700,
                      color: "var(--text-primary)",
                      lineHeight: 1.4,
                      display: "-webkit-box",
                      WebkitLineClamp: 2,
                      WebkitBoxOrient: "vertical",
                      overflow: "hidden",
                      minHeight: 38,
                    }}
                    title={video.title}
                  >
                    {video.title}
                  </h3>

                  {/* Metadata Row */}
                  <div style={{ display: "flex", flexDirection: "column", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                      <User size={13} style={{ color: "var(--text-muted)" }} />
                      <span style={{ textOverflow: "ellipsis", overflow: "hidden", whiteSpace: "nowrap" }}>
                        Kênh: <strong>{video.creator}</strong>
                      </span>
                    </div>
                    {video.videoMetadata.duration > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
                        <Clock size={13} style={{ color: "var(--text-muted)" }} />
                        <span>Thời lượng: <strong>{video.videoMetadata.duration}s</strong></span>
                      </div>
                    )}
                  </div>

                  {/* Action Buttons */}
                  <div style={{ display: "flex", gap: 8, marginTop: "auto", paddingTop: 10, borderTop: "1px solid var(--border-primary)" }}>
                    {/* Tải về */}
                    <button
                      onClick={() => handleSingleDownload(video)}
                      className="btn-secondary"
                      style={{ padding: "6px 12px", fontSize: 12, flex: 1, justifyContent: "center", height: 32 }}
                      title="Tải về máy tính (Yêu cầu chọn thư mục)"
                    >
                      <Download size={14} />
                      Tải về
                    </button>

                    {/* Xem gốc */}
                    <a
                      href={video.videoMetadata.originUrl}
                      target="_blank"
                      rel="noreferrer"
                      className="btn-secondary"
                      style={{ padding: "6px 10px", fontSize: 12, justifyContent: "center", height: 32 }}
                      title="Xem trên trang gốc (TikTok/Facebook)"
                    >
                      <ExternalLink size={14} />
                    </a>

                    {/* Xóa */}
                    <button
                      onClick={() => handleDeleteVideo(video.promptId)}
                      className="btn-secondary"
                      style={{
                        padding: "6px 10px",
                        fontSize: 12,
                        justifyContent: "center",
                        height: 32,
                        color: "var(--accent-red)",
                        borderColor: "rgba(239, 68, 68, 0.15)",
                      }}
                      title="Xóa khỏi thư viện"
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

      {/* Video Lightbox Player */}
      {mounted && lightboxVideo && createPortal(
        <div
          style={{
            position: "fixed",
            inset: 0,
            background: "rgba(0,0,0,0.92)",
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
              boxShadow: "0 0 40px rgba(244, 114, 182, 0.25)",
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

export default VideoLibraryPage;
