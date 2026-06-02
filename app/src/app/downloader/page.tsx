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
  Globe,
  Zap,
  Shield,
  List,
  Server,
  Folder,
  RefreshCw as SyncIcon,
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

interface BatchItem {
  url: string;
  status: "pending" | "downloading" | "success" | "failed";
  error?: string;
  title?: string;
  platform?: string;
}

const getErrorMessage = (error: unknown, fallback: string) => {
  return error instanceof Error ? error.message : fallback;
};

const DownloaderPage = () => {
  // Tabs: single (Tải đơn), batch (Tải hàng loạt), drive (Đồng bộ Google Drive)
  const [activeTab, setActiveTab] = useState<"single" | "batch" | "drive">("single");

  // Single download states
  const [url, setUrl] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [result, setResult] = useState<DownloadResult | null>(null);
  const [error, setError] = useState("");

  // Batch download states
  const [batchUrls, setBatchUrls] = useState("");
  const [batchQueue, setBatchQueue] = useState<BatchItem[]>([]);
  const [isBatchRunning, setIsBatchRunning] = useState(false);
  const [batchProgress, setBatchProgress] = useState({ total: 0, completed: 0, success: 0, failed: 0 });

  // Drive sync states
  const [isSyncing, setIsSyncing] = useState(false);
  const [syncLogs, setSyncLogs] = useState<string[]>([]);
  const [autoSyncEnabled, setAutoSyncEnabled] = useState(false);
  const [folderId, setFolderId] = useState("1WS-Ts0AiofSYK-1tqZeRId02SRSwUdh9");

  // User info & History
  const [currentUserId, setCurrentUserId] = useState<string | null>(null);
  const [downloadHistory, setDownloadHistory] = useState<DownloadResult[]>([]);
  const [lightboxVideo, setLightboxVideo] = useState<string | null>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load User ID và Lịch sử tải thực tế từ DB khi mount
  useEffect(() => {
    const initData = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      if (user) {
        setCurrentUserId(user.id);
        fetchLatestHistory(user.id);
      }
    };
    initData();
  }, []);

  // Lắng nghe trạng thái Tự động đồng bộ
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (autoSyncEnabled) {
      // Thực hiện quét ngay khi bật
      handleDriveSync(true);
      
      // Định kỳ 30 giây quét một lần
      timer = setInterval(() => {
        handleDriveSync(true);
      }, 30000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [autoSyncEnabled]);

  // Hàm load lịch sử tải từ database Supabase (bảng prompts)
  const fetchLatestHistory = async (userIdStr?: string) => {
    try {
      const uId = userIdStr || currentUserId;
      if (!uId) return;

      const { data, error: dbErr } = await supabase
        .from("prompts")
        .select("*")
        .eq("type", "video")
        .order("createdAt", { ascending: false })
        .limit(10);

      if (dbErr) throw dbErr;

      if (data) {
        const history: DownloadResult[] = data.map((row: any) => {
          let metadata = { id: row.id, videoUrl: "", thumbnailUrl: "", originUrl: "", creator: row.creator || "Tác giả", platform: "other", duration: 0 };
          try {
            if (row.notes) {
              const notesJson = JSON.parse(row.notes);
              if (notesJson.videoMetadata) {
                metadata = { ...metadata, ...notesJson.videoMetadata };
              }
            }
          } catch (e) {
            console.error("Error parsing video metadata from DB notes:", e);
          }
          return {
            id: row.id,
            title: row.title,
            videoUrl: metadata.videoUrl || "",
            thumbnailUrl: metadata.thumbnailUrl || "",
            originUrl: metadata.originUrl || "",
            creator: metadata.creator || "",
            platform: metadata.platform || "other",
            duration: metadata.duration || 0,
          };
        });
        setDownloadHistory(history);
      }
    } catch (err) {
      console.error("Failed to load download history from Supabase:", err);
    }
  };

  // Dán link từ clipboard cho tải đơn
  const handlePaste = async () => {
    try {
      const text = await navigator.clipboard.readText();
      setUrl(text);
      inputRef.current?.focus();
    } catch {
      // Từ chối quyền
    }
  };

  // Tải đơn lẻ
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

      // Tự động lưu video vào cơ sở dữ liệu
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

      // Load lại lịch sử từ DB
      fetchLatestHistory();
    } catch (err: unknown) {
      setError(getErrorMessage(err, "Đã xảy ra lỗi khi tải video."));
    } finally {
      setIsLoading(false);
    }
  };

  // Tải hàng loạt tuần tự
  const handleBatchDownload = async () => {
    const urls = batchUrls
      .split("\n")
      .map((u) => u.trim())
      .filter((u) => u.length > 0 && (u.startsWith("http://") || u.startsWith("https://")));

    if (urls.length === 0) {
      alert("Vui lòng nhập ít nhất một đường dẫn URL video hợp lệ.");
      return;
    }

    setIsBatchRunning(true);
    setBatchProgress({ total: urls.length, completed: 0, success: 0, failed: 0 });

    const queue: BatchItem[] = urls.map((u) => ({
      url: u,
      status: "pending",
      title: "",
    }));
    setBatchQueue(queue);

    const { data: { session } } = await supabase.auth.getSession();
    const token = session?.access_token;

    for (let i = 0; i < urls.length; i++) {
      queue[i].status = "downloading";
      setBatchQueue([...queue]);

      try {
        const response = await fetch("/api/video/download", {
          method: "POST",
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
          body: JSON.stringify({ url: urls[i] }),
        });

        const data = await response.json();
        if (!response.ok) {
          throw new Error(data.error || "Không thể phân tích.");
        }

        const videoMetadata = {
          id: data.id,
          videoUrl: data.videoUrl,
          thumbnailUrl: data.thumbnailUrl,
          originUrl: data.originUrl,
          platform: data.platform,
          duration: data.duration,
          creator: data.creator,
        };
        const finalNotes = JSON.stringify({ notes: "Đã tải hàng loạt qua SnapSave", videoMetadata });
        
        await createPrompt({
          title: data.title || `Video SnapSave - ${data.creator}`,
          content: "Tải xuống hàng loạt qua công cụ SnapSave Downloader",
          negativePrompt: "",
          type: "video",
          model: "SnapSave Batch",
          lora: "",
          seed: "",
          sampler: "",
          cfgScale: 0,
          steps: 0,
          creator: data.creator,
          tags: ["SnapSave", "Batch", data.platform],
          notes: finalNotes,
          isFavorite: false,
        });

        queue[i].status = "success";
        queue[i].title = data.title;
        queue[i].platform = data.platform;
        setBatchProgress((prev) => ({
          ...prev,
          completed: prev.completed + 1,
          success: prev.success + 1,
        }));
      } catch (err: any) {
        queue[i].status = "failed";
        queue[i].error = err.message || "Tải thất bại";
        setBatchProgress((prev) => ({
          ...prev,
          completed: prev.completed + 1,
          failed: prev.failed + 1,
        }));
      }
      setBatchQueue([...queue]);

      // Nghỉ 1.2s tránh spam
      if (i < urls.length - 1) {
        await new Promise((resolve) => setTimeout(resolve, 1200));
      }
    }

    setIsBatchRunning(false);
    fetchLatestHistory();
  };

  // Đồng bộ Google Drive qua API
  const handleDriveSync = async (isAuto = false) => {
    if (isSyncing) return;
    setIsSyncing(true);

    if (!isAuto) {
      setSyncLogs((prev) => [
        `[${new Date().toLocaleTimeString()}] 🚀 Bắt đầu quét thư mục Google Drive...`,
      ]);
    }

    try {
      const { data: { session } } = await supabase.auth.getSession();
      const token = session?.access_token;

      const response = await fetch("/api/video/drive-sync", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data.error || "Lỗi đồng bộ.");
      }

      if (data.logs && data.logs.length > 0) {
        if (isAuto) {
          // Chỉ thêm log tự động nếu có tải thành công
          if (data.downloadedCount > 0) {
            setSyncLogs((prev) => [
              ...prev,
              `[${new Date().toLocaleTimeString()}] (Auto-Sync) Đồng bộ thành công: Tải về thêm ${data.downloadedCount} video.`,
              ...data.logs,
            ]);
            fetchLatestHistory();
          }
        } else {
          setSyncLogs(data.logs);
          fetchLatestHistory();
        }
      } else {
        if (!isAuto) {
          setSyncLogs((prev) => [...prev, `[${new Date().toLocaleTimeString()}] Đồng bộ hoàn tất: Không phát hiện tệp tin mới.`]);
        }
      }
    } catch (err: any) {
      const errMsg = err.message || "Lỗi kết nối API";
      if (!isAuto) {
        setSyncLogs((prev) => [...prev, `❌ [LỖI] ${errMsg}`]);
      } else {
        console.error("Drive Auto Sync error:", errMsg);
      }
    } finally {
      setIsSyncing(false);
    }
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" && !isLoading && url.trim()) {
      handleDownload();
    }
  };

  const handleReset = () => {
    setUrl("");
    setResult(null);
    setError("");
    inputRef.current?.focus();
  };

  const handleCopyText = (text: string, msg: string) => {
    navigator.clipboard.writeText(text);
    alert(msg);
  };

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 900, margin: "0 auto", padding: "0 16px 60px" }}>
      {/* Hero Header */}
      <div style={{ textAlign: "center", marginBottom: 28 }}>
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
        <p style={{ fontSize: 15, color: "var(--text-secondary)", maxWidth: 520, margin: "0 auto" }}>
          Tải video TikTok, Facebook, Instagram sạch sẽ không logo. Tải đơn lẻ, tải hàng loạt và tự động quét đồng bộ Google Drive.
        </p>
      </div>

      {/* Navigation Tabs */}
      <div
        style={{
          display: "flex",
          justifyContent: "center",
          gap: 12,
          marginBottom: 20,
        }}
      >
        <button
          onClick={() => setActiveTab("single")}
          className={activeTab === "single" ? "btn-primary" : "btn-secondary"}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            borderRadius: "var(--radius-md)",
            background: activeTab === "single" ? "var(--gradient-warm)" : "rgba(30, 30, 46, 0.5)",
            border: activeTab === "single" ? "none" : "1px solid var(--border-secondary)",
            gap: 6,
          }}
        >
          <Download size={15} />
          <span>Tải đơn</span>
        </button>

        <button
          onClick={() => setActiveTab("batch")}
          className={activeTab === "batch" ? "btn-primary" : "btn-secondary"}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            borderRadius: "var(--radius-md)",
            background: activeTab === "batch" ? "var(--gradient-warm)" : "rgba(30, 30, 46, 0.5)",
            border: activeTab === "batch" ? "none" : "1px solid var(--border-secondary)",
            gap: 6,
          }}
        >
          <List size={15} />
          <span>Tải hàng loạt</span>
        </button>

        <button
          onClick={() => setActiveTab("drive")}
          className={activeTab === "drive" ? "btn-primary" : "btn-secondary"}
          style={{
            padding: "8px 16px",
            fontSize: 13,
            borderRadius: "var(--radius-md)",
            background: activeTab === "drive" ? "var(--gradient-warm)" : "rgba(30, 30, 46, 0.5)",
            border: activeTab === "drive" ? "none" : "1px solid var(--border-secondary)",
            gap: 6,
          }}
        >
          <Folder size={15} />
          <span>Đồng bộ Google Drive</span>
        </button>
      </div>

      {/* Main Download Card Area */}
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
        {/* Tab 1: Single Download */}
        {activeTab === "single" && (
          <div>
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
                  placeholder="Dán liên kết video vào đây (TikTok, Facebook, Instagram...)"
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
          </div>
        )}

        {/* Tab 2: Batch Download */}
        {activeTab === "batch" && (
          <div>
            <div style={{ marginBottom: 16 }}>
              <label
                style={{
                  display: "block",
                  fontSize: 13,
                  fontWeight: 600,
                  color: "var(--text-secondary)",
                  marginBottom: 8,
                }}
              >
                Nhập danh sách link video (Mỗi link một dòng):
              </label>
              <textarea
                placeholder="https://vt.tiktok.com/ZS111/&#10;https://www.facebook.com/share/222/&#10;https://instagram.com/p/333/"
                value={batchUrls}
                onChange={(e) => setBatchUrls(e.target.value)}
                style={{
                  width: "100%",
                  height: 140,
                  padding: 12,
                  fontSize: 14,
                  background: "rgba(10, 10, 15, 0.7)",
                  border: "1px solid var(--border-secondary)",
                  borderRadius: "var(--radius-lg)",
                  color: "var(--text-primary)",
                  fontFamily: "monospace",
                  resize: "vertical",
                }}
                disabled={isBatchRunning}
              />
            </div>

            {/* Action Row */}
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 16, flexWrap: "wrap", marginBottom: 16 }}>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                Các dòng trống hoặc định dạng sai sẽ tự động được lọc bỏ trong quá trình tải.
              </div>
              <button
                onClick={handleBatchDownload}
                className="btn-primary"
                style={{
                  height: 48,
                  padding: "0 24px",
                  fontSize: 14,
                  fontWeight: 700,
                  borderRadius: "var(--radius-lg)",
                  background: "var(--gradient-warm)",
                  justifyContent: "center",
                  minWidth: 180,
                }}
                disabled={isBatchRunning || !batchUrls.trim()}
              >
                {isBatchRunning ? (
                  <>
                    <RefreshCw size={16} className="animate-spin" />
                    <span>Đang xử lý ({batchProgress.completed}/{batchProgress.total})...</span>
                  </>
                ) : (
                  <>
                    <Download size={16} />
                    <span>Tải hàng loạt</span>
                  </>
                )}
              </button>
            </div>

            {/* Progress Area */}
            {(isBatchRunning || batchQueue.length > 0) && (
              <div
                style={{
                  background: "rgba(10, 10, 15, 0.4)",
                  border: "1px solid var(--border-secondary)",
                  borderRadius: "var(--radius-lg)",
                  padding: 16,
                  marginBottom: 16,
                }}
              >
                <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginBottom: 8 }}>
                  <span style={{ fontWeight: 600, color: "var(--text-primary)" }}> Tiến trình tải hàng loạt</span>
                  <span style={{ color: "var(--text-secondary)" }}>
                    Đã xong: <strong>{batchProgress.completed}/{batchProgress.total}</strong> | Thành công:{" "}
                    <span style={{ color: "var(--accent-green)" }}>{batchProgress.success}</span> | Lỗi:{" "}
                    <span style={{ color: "var(--accent-red)" }}>{batchProgress.failed}</span>
                  </span>
                </div>

                <div
                  style={{
                    width: "100%",
                    height: 8,
                    background: "var(--bg-tertiary)",
                    borderRadius: 4,
                    overflow: "hidden",
                    marginBottom: 16,
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      width: `${(batchProgress.completed / batchProgress.total) * 100}%`,
                      background: "var(--gradient-warm)",
                      transition: "width 0.3s ease",
                    }}
                  />
                </div>

                <div
                  style={{
                    maxHeight: 180,
                    overflowY: "auto",
                    display: "flex",
                    flexDirection: "column",
                    gap: 8,
                  }}
                >
                  {batchQueue.map((item, idx) => (
                    <div
                      key={idx}
                      style={{
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "space-between",
                        padding: "8px 12px",
                        background: "rgba(255, 255, 255, 0.02)",
                        border: "1px solid rgba(255, 255, 255, 0.04)",
                        borderRadius: "var(--radius-md)",
                        fontSize: 12,
                      }}
                    >
                      <div style={{ flex: 1, minWidth: 0, marginRight: 12 }}>
                        <div
                          style={{
                            color: "var(--text-primary)",
                            whiteSpace: "nowrap",
                            overflow: "hidden",
                            textOverflow: "ellipsis",
                            fontWeight: 500,
                          }}
                        >
                          {item.title || item.url}
                        </div>
                        {item.error && <div style={{ color: "var(--accent-red)", fontSize: 10 }}>{item.error}</div>}
                      </div>

                      <div style={{ flexShrink: 0 }}>
                        {item.status === "pending" && (
                          <span style={{ color: "var(--text-muted)", fontSize: 11 }}>Đang chờ...</span>
                        )}
                        {item.status === "downloading" && (
                          <span style={{ color: "var(--accent-pink)", display: "flex", alignItems: "center", gap: 4 }}>
                            <RefreshCw size={12} className="animate-spin" /> Đang tải...
                          </span>
                        )}
                        {item.status === "success" && (
                          <span style={{ color: "var(--accent-green)", fontWeight: 600 }}>Thành công</span>
                        )}
                        {item.status === "failed" && (
                          <span style={{ color: "var(--accent-red)", fontWeight: 600 }}>Thất bại</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tab 3: Google Drive Sync */}
        {activeTab === "drive" && (
          <div style={{ fontSize: 14, color: "var(--text-secondary)", lineHeight: 1.6 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 12 }}>
              <div>
                <h3 style={{ color: "var(--text-primary)", fontSize: 16, fontWeight: 700, margin: 0, display: "flex", alignItems: "center", gap: 8 }}>
                  <Server size={18} style={{ color: "var(--accent-cyan)" }} />
                  SnapSave Drive Sync Engine
                </h3>
                <p style={{ margin: "4px 0 0", fontSize: 13, color: "var(--text-muted)" }}>
                  Tự động quét các file `.txt` chứa link trong thư mục Drive, tải video và xóa file dọn dẹp.
                </p>
              </div>

              {/* Controls */}
              <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
                {/* Auto Sync Toggle */}
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer", fontSize: 13, background: "rgba(255, 255, 255, 0.04)", padding: "6px 12px", borderRadius: "var(--radius-md)", border: "1px solid var(--border-secondary)" }}>
                  <input
                    type="checkbox"
                    checked={autoSyncEnabled}
                    onChange={(e) => setAutoSyncEnabled(e.target.checked)}
                    style={{ cursor: "pointer" }}
                  />
                  <span>Tự động quét (30s)</span>
                </label>

                {/* Sync Button */}
                <button
                  onClick={() => handleDriveSync(false)}
                  className="btn-primary"
                  style={{
                    height: 38,
                    padding: "0 16px",
                    fontSize: 13,
                    borderRadius: "var(--radius-md)",
                    background: "var(--gradient-warm)",
                    gap: 6,
                  }}
                  disabled={isSyncing}
                >
                  <SyncIcon size={14} className={isSyncing ? "animate-spin" : ""} />
                  <span>{isSyncing ? "Đang quét..." : "Đồng bộ ngay"}</span>
                </button>
              </div>
            </div>

            {/* Folder Info */}
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))", gap: 12, marginBottom: 16 }}>
              {/* Folder ID */}
              <div style={{ background: "rgba(10, 10, 15, 0.5)", border: "1px solid var(--border-secondary)", borderRadius: "var(--radius-lg)", padding: 12 }}>
                <span style={{ display: "block", fontSize: 11, fontWeight: 600, color: "var(--text-muted)", marginBottom: 4 }}>GOOGLE DRIVE FOLDER ID</span>
                <code style={{ fontSize: 13, color: "var(--accent-cyan)", wordBreak: "break-all" }}>{folderId}</code>
              </div>

              {/* User ID */}
              <div style={{ background: "rgba(10, 10, 15, 0.5)", border: "1px solid var(--border-secondary)", borderRadius: "var(--radius-lg)", padding: 12 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 4 }}>
                  <span style={{ fontSize: 11, fontWeight: 600, color: "var(--text-muted)" }}>LƯU TRỮ VÀO USER ID</span>
                  {currentUserId && (
                    <button
                      onClick={() => handleCopyText(currentUserId, "Đã copy User ID!")}
                      className="btn-ghost"
                      style={{ padding: "0 6px", fontSize: 10, height: 18 }}
                    >
                      Copy
                    </button>
                  )}
                </div>
                <code style={{ fontSize: 13, color: "var(--accent-pink)", wordBreak: "break-all" }}>
                  {currentUserId || "Vui lòng đăng nhập..."}
                </code>
              </div>
            </div>

            {/* Live Logs Terminal */}
            <div>
              <span style={{ display: "block", fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 8 }}>
                Nhật ký hoạt động (Live Logs):
              </span>
              <div
                style={{
                  width: "100%",
                  height: 180,
                  background: "#0a0a0f",
                  border: "1px solid var(--border-secondary)",
                  borderRadius: "var(--radius-lg)",
                  padding: "12px 16px",
                  fontFamily: "monospace",
                  fontSize: 12,
                  color: "#39ff14", // green terminal text
                  overflowY: "auto",
                  display: "flex",
                  flexDirection: "column",
                  gap: 4,
                  boxShadow: "inset 0 4px 10px rgba(0,0,0,0.8)",
                }}
              >
                {syncLogs.length === 0 ? (
                  <span style={{ color: "var(--text-muted)" }}>[Hệ thống] Nhấn nút "Đồng bộ ngay" hoặc bật "Tự động quét" để bắt đầu nhận log...</span>
                ) : (
                  syncLogs.map((log, idx) => (
                    <div key={idx} style={{ wordBreak: "break-all", whiteSpace: "pre-wrap" }}>
                      {log}
                    </div>
                  ))
                )}
              </div>
            </div>

            {/* Guide link notification */}
            <div style={{ marginTop: 12, fontSize: 12, color: "var(--accent-amber)", fontWeight: 500 }}>
              💡 Vui lòng đảm bảo đã dán Google Service Account Key của bạn vào biến <code>GOOGLE_SERVICE_ACCOUNT_KEY</code> trong tệp <code>.env.local</code> ở máy chủ. Hướng dẫn chi tiết tạo Key nằm ở tệp <code>app/INSTRUCTIONS_DRIVE.md</code>.
            </div>
          </div>
        )}

        {/* Supported Platforms Footer */}
        {activeTab !== "drive" && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 20, flexWrap: "wrap", borderTop: "1px solid rgba(255, 255, 255, 0.05)", paddingTop: 16, marginTop: 16 }}>
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
        )}
      </div>

      {/* Result Card for Single Download */}
      {activeTab === "single" && result && (
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

            <div style={{ padding: 20, display: "flex", flexDirection: "column", gap: 14 }}>
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

              <button
                className="btn-ghost"
                style={{ fontSize: 12, justifyContent: "center" }}
                onClick={() => handleCopyText(result.videoUrl, "Đã copy link video Cloud thành công!")}
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
            title: "Nhanh chóng & Tiện lợi",
            desc: "Dán liên kết tải ngay lập tức hoặc dán hàng chục dòng liên kết để tải hàng loạt.",
            bg: "rgba(245, 158, 11, 0.08)",
            border: "rgba(245, 158, 11, 0.15)",
          },
          {
            icon: <Shield size={22} style={{ color: "var(--accent-green)" }} />,
            title: "Sạch sẽ, không dính Logo",
            desc: "Video tải về sạch sẽ hoàn toàn không chứa watermark hay logo từ nhà phát hành gốc.",
            bg: "rgba(16, 185, 129, 0.08)",
            border: "rgba(16, 185, 129, 0.15)",
          },
          {
            icon: <Globe size={22} style={{ color: "var(--accent-cyan)" }} />,
            title: "Lưu trữ Đám mây riêng",
            desc: "Lưu trữ vĩnh viễn trên Supabase/R2/Cloudinary riêng do bạn sở hữu.",
            bg: "rgba(6, 182, 212, 0.08)",
            border: "rgba(6, 182, 212, 0.15)",
          },
          {
            icon: <Folder size={22} style={{ color: "var(--accent-purple)" }} />,
            title: "Đồng bộ Google Drive",
            desc: "Đẩy link vào thư mục tiktok trên Drive, hệ thống sẽ tự động quét và tải ngầm.",
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
