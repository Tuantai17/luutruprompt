"use client";

import { useState, useEffect, useCallback, useRef } from "react";
import {
  Wand2,
  Plus,
  Trash2,
  Play,
  Pause,
  Square,
  CheckSquare,
  Square as SquareEmpty,
  Image as ImageIcon,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Settings,
  Eye,
  RotateCcw,
  Loader2,
  Upload,
  ChevronDown,
  RefreshCw,
  Sparkles,
  Timer,
  Shield,
  Zap,
} from "lucide-react";
import { supabase } from "@/lib/supabaseClient";
import type { ImageJob, JobStatus } from "@/lib/imageJobsDb";

// ============================
// Types & Constants
// ============================
interface AutomationConfig {
  delayBetweenJobs: number;
  delayAfterSend: number;
  maxRetries: number;
  restAfterNJobs: number;
  restDurationMinutes: number;
}

interface LogEntry {
  id: string;
  timestamp: Date;
  level: "info" | "success" | "warning" | "error";
  message: string;
}

const DEFAULT_CONFIG: AutomationConfig = {
  delayBetweenJobs: 5,
  delayAfterSend: 60,
  maxRetries: 3,
  restAfterNJobs: 5,
  restDurationMinutes: 30,
};

const STATUS_MAP: Record<
  JobStatus,
  { label: string; color: string; bg: string; icon: React.ReactNode }
> = {
  WAITING: {
    label: "Chờ",
    color: "#94a3b8",
    bg: "rgba(148, 163, 184, 0.12)",
    icon: <Clock size={14} />,
  },
  RUNNING: {
    label: "Đang chạy",
    color: "#8b5cf6",
    bg: "rgba(139, 92, 246, 0.12)",
    icon: <Loader2 size={14} className="animate-spin" />,
  },
  SUCCESS: {
    label: "Thành công",
    color: "#10b981",
    bg: "rgba(16, 185, 129, 0.12)",
    icon: <CheckCircle size={14} />,
  },
  FAILED: {
    label: "Thất bại",
    color: "#ef4444",
    bg: "rgba(239, 68, 68, 0.12)",
    icon: <XCircle size={14} />,
  },
  PAUSED: {
    label: "Tạm dừng",
    color: "#f59e0b",
    bg: "rgba(245, 158, 11, 0.12)",
    icon: <Pause size={14} />,
  },
};

// ============================
// Component
// ============================
const AIImagePage = () => {
  // State: Jobs
  const [jobs, setJobs] = useState<ImageJob[]>([]);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [loadingJobs, setLoadingJobs] = useState(true);

  // State: Add form
  const [newPrompt, setNewPrompt] = useState("");
  const [newImageFile, setNewImageFile] = useState<File | null>(null);
  const [newImagePreview, setNewImagePreview] = useState<string | null>(null);
  const [addingJob, setAddingJob] = useState(false);

  // State: Automation
  const [isRunning, setIsRunning] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [config, setConfig] = useState<AutomationConfig>(DEFAULT_CONFIG);
  const [logs, setLogs] = useState<LogEntry[]>([]);

  // State: Settings
  const [chatgptEmail, setChatgptEmail] = useState("");
  const [chatgptPassword, setChatgptPassword] = useState("");
  const [chatgptLoginMethod, setChatgptLoginMethod] = useState<"email" | "google">("email");
  const [showPassword, setShowPassword] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [savingSettings, setSavingSettings] = useState(false);

  // Refs
  const logContainerRef = useRef<HTMLDivElement>(null);
  const pollingRef = useRef<NodeJS.Timeout | null>(null);

  // ============================
  // Helpers
  // ============================
  const getAuthToken = async (): Promise<string | null> => {
    const {
      data: { session },
    } = await supabase.auth.getSession();
    return session?.access_token || null;
  };

  const addLog = useCallback(
    (level: LogEntry["level"], message: string) => {
      setLogs((prev) =>
        [
          {
            id: crypto.randomUUID(),
            timestamp: new Date(),
            level,
            message,
          },
          ...prev,
        ].slice(0, 200)
      );
    },
    []
  );

  // ============================
  // Data Fetching
  // ============================
  const fetchJobs = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch("/api/ai-image/jobs", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.jobs) setJobs(data.jobs);
    } catch (error) {
      console.error("Error fetching jobs:", error);
    } finally {
      setLoadingJobs(false);
    }
  }, []);

  const fetchSettings = useCallback(async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch("/api/ai-image/settings", {
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (data.settings) {
        setChatgptEmail(data.settings.chatgpt_email || "");
        setChatgptPassword(data.settings.chatgpt_password || "");
        setChatgptLoginMethod(data.settings.login_method || "email");
        setConfig({
          delayBetweenJobs: data.settings.delay_between_jobs ?? 5,
          delayAfterSend: data.settings.delay_after_send ?? 60,
          maxRetries: data.settings.max_retries ?? 3,
          restAfterNJobs: data.settings.rest_after_n_jobs ?? 5,
          restDurationMinutes: data.settings.rest_duration_minutes ?? 30,
        });
      }
    } catch (error) {
      console.error("Error fetching settings:", error);
    }
  }, []);

  useEffect(() => {
    fetchJobs();
    fetchSettings();
  }, [fetchJobs, fetchSettings]);

  // Polling trạng thái khi automation đang chạy
  useEffect(() => {
    if (isRunning) {
      pollingRef.current = setInterval(() => {
        fetchJobs();
      }, 5000);
    }
    return () => {
      if (pollingRef.current) clearInterval(pollingRef.current);
    };
  }, [isRunning, fetchJobs]);

  // ============================
  // Handlers: Add Job
  // ============================
  const handleImageSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setNewImageFile(file);
    setNewImagePreview(URL.createObjectURL(file));
  };

  const handleAddJob = async () => {
    if (!newPrompt.trim()) {
      addLog("error", "Vui lòng nhập prompt");
      return;
    }

    setAddingJob(true);
    try {
      const token = await getAuthToken();
      if (!token) throw new Error("Chưa đăng nhập");

      let imagePath = "";

      // Upload ảnh nếu có
      if (newImageFile) {
        const {
          data: { user },
        } = await supabase.auth.getUser();
        if (!user) throw new Error("Chưa đăng nhập");

        const fileName = `${user.id}/ai-refs/${Date.now()}-${newImageFile.name}`;
        const { error: uploadError } = await supabase.storage
          .from("images")
          .upload(fileName, newImageFile, {
            contentType: newImageFile.type,
            upsert: true,
          });

        if (uploadError) throw uploadError;

        const { data: urlData } = supabase.storage
          .from("images")
          .getPublicUrl(fileName);
        imagePath = urlData.publicUrl;
      }

      // Tạo job
      const res = await fetch("/api/ai-image/jobs", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          image_path: imagePath,
          prompt: newPrompt.trim(),
        }),
      });

      if (!res.ok) {
        const err = await res.json();
        throw new Error(err.error);
      }

      addLog("success", "✅ Đã thêm job vào hàng đợi");
      setNewPrompt("");
      setNewImageFile(null);
      setNewImagePreview(null);
      fetchJobs();
    } catch (error: any) {
      addLog("error", `❌ Lỗi thêm job: ${error.message}`);
    } finally {
      setAddingJob(false);
    }
  };

  // ============================
  // Handlers: Selection
  // ============================
  const toggleSelect = (id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  };

  const selectAll = () => {
    setSelectedIds(new Set(jobs.map((j) => j.id)));
  };

  const deselectAll = () => {
    setSelectedIds(new Set());
  };

  const deleteSelected = async () => {
    if (selectedIds.size === 0) return;
    if (!confirm(`Xóa ${selectedIds.size} job đã chọn?`)) return;

    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch("/api/ai-image/jobs", {
        method: "DELETE",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ ids: Array.from(selectedIds) }),
      });

      if (res.ok) {
        addLog("success", `✅ Đã xóa ${selectedIds.size} jobs`);
        setSelectedIds(new Set());
        fetchJobs();
      }
    } catch (error: any) {
      addLog("error", `❌ Lỗi xóa: ${error.message}`);
    }
  };

  // ============================
  // Handlers: Automation
  // ============================
  const startAutomation = async () => {
    const selected = Array.from(selectedIds);
    if (selected.length === 0) {
      addLog("error", "Vui lòng chọn ít nhất 1 job");
      return;
    }

    if (chatgptLoginMethod === "email" && (!chatgptEmail || !chatgptPassword)) {
      addLog("error", "Vui lòng cấu hình email/password ChatGPT trong phần Cài đặt");
      setShowSettings(true);
      return;
    }

    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch("/api/ai-image/automation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          action: "start",
          selectedJobIds: selected,
          config,
          credentials: {
            email: chatgptLoginMethod === "email" ? chatgptEmail : undefined,
            password: chatgptLoginMethod === "email" ? chatgptPassword : undefined,
            loginMethod: chatgptLoginMethod,
          },
        }),
      });

      const data = await res.json();
      if (res.ok) {
        setIsRunning(true);
        setIsPaused(false);
        addLog("success", `🚀 Automation bắt đầu: ${data.jobCount} jobs`);
      } else {
        addLog("error", `❌ ${data.error}`);
      }
    } catch (error: any) {
      addLog("error", `❌ Lỗi: ${error.message}`);
    }
  };

  const pauseAutomation = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      await fetch("/api/ai-image/automation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: isPaused ? "resume" : "pause" }),
      });

      setIsPaused(!isPaused);
      addLog("info", isPaused ? "▶️ Đã tiếp tục" : "⏸ Đã tạm dừng");
    } catch (error: any) {
      addLog("error", `❌ ${error.message}`);
    }
  };

  const stopAutomation = async () => {
    try {
      const token = await getAuthToken();
      if (!token) return;

      await fetch("/api/ai-image/automation", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ action: "stop" }),
      });

      setIsRunning(false);
      setIsPaused(false);
      addLog("warning", "⏹ Automation đã dừng");
    } catch (error: any) {
      addLog("error", `❌ ${error.message}`);
    }
  };

  // ============================
  // Handlers: Settings
  // ============================
  const saveSettings = async () => {
    setSavingSettings(true);
    try {
      const token = await getAuthToken();
      if (!token) return;

      const res = await fetch("/api/ai-image/settings", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          chatgpt_email: chatgptEmail,
          chatgpt_password: chatgptPassword,
          delay_between_jobs: config.delayBetweenJobs,
          delay_after_send: config.delayAfterSend,
          max_retries: config.maxRetries,
          rest_after_n_jobs: config.restAfterNJobs,
          rest_duration_minutes: config.restDurationMinutes,
          login_method: chatgptLoginMethod,
        }),
      });

      if (res.ok) {
        addLog("success", "✅ Đã lưu cài đặt");
      }
    } catch (error: any) {
      addLog("error", `❌ Lỗi lưu cài đặt: ${error.message}`);
    } finally {
      setSavingSettings(false);
    }
  };

  // ============================
  // Stats
  // ============================
  const stats = {
    total: jobs.length,
    waiting: jobs.filter((j) => j.status === "WAITING").length,
    running: jobs.filter((j) => j.status === "RUNNING").length,
    success: jobs.filter((j) => j.status === "SUCCESS").length,
    failed: jobs.filter((j) => j.status === "FAILED").length,
  };

  // ============================
  // Render
  // ============================
  return (
    <div className="animate-fadeIn" style={{ maxWidth: 1400, margin: "0 auto" }}>
      {/* Header */}
      <div style={{ marginBottom: 24 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 8 }}>
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: "var(--radius-md)",
              background: "linear-gradient(135deg, #8b5cf6, #ec4899)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
            }}
          >
            <Wand2 size={22} color="white" />
          </div>
          <div>
            <h1 style={{ fontSize: 24, fontWeight: 700, margin: 0 }}>
              <span className="gradient-text">Tạo ảnh AI</span>
            </h1>
            <p style={{ fontSize: 13, color: "var(--text-secondary)", margin: 0 }}>
              Tự động tạo ảnh bằng ChatGPT với hàng đợi thông minh
            </p>
          </div>
        </div>

        {/* Stats Cards */}
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(120px, 1fr))",
            gap: 10,
            marginTop: 16,
          }}
        >
          {[
            { label: "Tổng", value: stats.total, color: "#8b5cf6" },
            { label: "Chờ", value: stats.waiting, color: "#94a3b8" },
            { label: "Đang chạy", value: stats.running, color: "#8b5cf6" },
            { label: "Thành công", value: stats.success, color: "#10b981" },
            { label: "Thất bại", value: stats.failed, color: "#ef4444" },
          ].map((s) => (
            <div
              key={s.label}
              className="glass-card"
              style={{
                padding: "12px 16px",
                display: "flex",
                alignItems: "center",
                gap: 10,
              }}
            >
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: s.color,
                  lineHeight: 1,
                }}
              >
                {s.value}
              </div>
              <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                {s.label}
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Main Grid */}
      <div
        style={{
          display: "grid",
          gridTemplateColumns: "1fr 360px",
          gap: 16,
          alignItems: "start",
        }}
      >
        {/* Left Column: Job List */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Toolbar */}
          <div
            className="glass-card"
            style={{
              padding: "12px 16px",
              display: "flex",
              alignItems: "center",
              justifyContent: "space-between",
              flexWrap: "wrap",
              gap: 8,
            }}
          >
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button
                className="btn-secondary"
                onClick={selectedIds.size === jobs.length ? deselectAll : selectAll}
                style={{ fontSize: 12, padding: "6px 12px" }}
              >
                {selectedIds.size === jobs.length && jobs.length > 0 ? (
                  <>
                    <CheckSquare size={14} /> Bỏ chọn tất cả
                  </>
                ) : (
                  <>
                    <SquareEmpty size={14} /> Chọn tất cả
                  </>
                )}
              </button>

              {selectedIds.size > 0 && (
                <span style={{ fontSize: 12, color: "var(--accent-purple)", fontWeight: 600 }}>
                  {selectedIds.size} đã chọn
                </span>
              )}
            </div>

            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              {selectedIds.size > 0 && (
                <button
                  className="btn-secondary"
                  onClick={deleteSelected}
                  style={{
                    fontSize: 12,
                    padding: "6px 12px",
                    color: "var(--accent-red)",
                    borderColor: "rgba(239, 68, 68, 0.3)",
                  }}
                >
                  <Trash2 size={14} /> Xóa ({selectedIds.size})
                </button>
              )}

              <button
                className="btn-secondary"
                onClick={fetchJobs}
                style={{ fontSize: 12, padding: "6px 12px" }}
              >
                <RefreshCw size={14} /> Làm mới
              </button>
            </div>
          </div>

          {/* Job Table */}
          <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
            {loadingJobs ? (
              <div
                style={{
                  padding: 48,
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                  gap: 12,
                }}
              >
                <Loader2 size={20} className="animate-spin" style={{ color: "var(--accent-purple)" }} />
                <span style={{ color: "var(--text-muted)", fontSize: 14 }}>Đang tải...</span>
              </div>
            ) : jobs.length === 0 ? (
              <div
                style={{
                  padding: 48,
                  textAlign: "center",
                  color: "var(--text-muted)",
                }}
              >
                <Sparkles
                  size={48}
                  style={{ color: "var(--accent-purple)", opacity: 0.3, marginBottom: 12 }}
                />
                <div style={{ fontSize: 15, fontWeight: 600, marginBottom: 4 }}>
                  Chưa có job nào
                </div>
                <div style={{ fontSize: 13 }}>
                  Thêm ảnh + prompt bên phải để bắt đầu
                </div>
              </div>
            ) : (
              <div style={{ overflowX: "auto" }}>
                <table style={{ width: "100%", borderCollapse: "collapse" }}>
                  <thead>
                    <tr
                      style={{
                        background: "rgba(255,255,255,0.03)",
                        borderBottom: "1px solid var(--border-primary)",
                      }}
                    >
                      <th style={thStyle}>Chọn</th>
                      <th style={thStyle}>Ảnh</th>
                      <th style={{ ...thStyle, textAlign: "left" }}>Prompt</th>
                      <th style={thStyle}>Trạng thái</th>
                      <th style={thStyle}>Kết quả</th>
                    </tr>
                  </thead>
                  <tbody>
                    {jobs.map((job) => {
                      const statusInfo = STATUS_MAP[job.status as JobStatus] || STATUS_MAP.WAITING;
                      return (
                        <tr
                          key={job.id}
                          style={{
                            borderBottom: "1px solid var(--border-primary)",
                            background: selectedIds.has(job.id)
                              ? "rgba(139, 92, 246, 0.06)"
                              : "transparent",
                            transition: "background 0.15s",
                          }}
                          onMouseEnter={(e) => {
                            if (!selectedIds.has(job.id))
                              e.currentTarget.style.background = "rgba(255,255,255,0.02)";
                          }}
                          onMouseLeave={(e) => {
                            if (!selectedIds.has(job.id))
                              e.currentTarget.style.background = "transparent";
                          }}
                        >
                          {/* Checkbox */}
                          <td style={{ ...tdStyle, textAlign: "center", width: 50 }}>
                            <button
                              onClick={() => toggleSelect(job.id)}
                              style={{
                                background: "none",
                                border: "none",
                                cursor: "pointer",
                                color: selectedIds.has(job.id)
                                  ? "var(--accent-purple)"
                                  : "var(--text-muted)",
                                padding: 4,
                              }}
                            >
                              {selectedIds.has(job.id) ? (
                                <CheckSquare size={18} />
                              ) : (
                                <SquareEmpty size={18} />
                              )}
                            </button>
                          </td>

                          {/* Thumbnail */}
                          <td style={{ ...tdStyle, width: 72, textAlign: "center" }}>
                            {job.image_path ? (
                              <img
                                src={job.image_path}
                                alt="ref"
                                style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 8,
                                  objectFit: "cover",
                                  border: "1px solid var(--border-primary)",
                                }}
                              />
                            ) : (
                              <div
                                style={{
                                  width: 48,
                                  height: 48,
                                  borderRadius: 8,
                                  background: "var(--bg-tertiary)",
                                  display: "flex",
                                  alignItems: "center",
                                  justifyContent: "center",
                                }}
                              >
                                <ImageIcon size={20} style={{ color: "var(--text-muted)" }} />
                              </div>
                            )}
                          </td>

                          {/* Prompt */}
                          <td style={{ ...tdStyle, maxWidth: 300 }}>
                            <div
                              style={{
                                fontSize: 13,
                                color: "var(--text-primary)",
                                overflow: "hidden",
                                textOverflow: "ellipsis",
                                whiteSpace: "nowrap",
                              }}
                              title={job.prompt}
                            >
                              {job.prompt}
                            </div>
                            <div style={{ fontSize: 11, color: "var(--text-muted)", marginTop: 2 }}>
                              {new Date(job.created_at).toLocaleString("vi-VN")}
                              {job.retry_count > 0 && (
                                <span style={{ marginLeft: 8, color: "var(--accent-orange)" }}>
                                  Retry: {job.retry_count}
                                </span>
                              )}
                            </div>
                          </td>

                          {/* Status */}
                          <td style={{ ...tdStyle, textAlign: "center", width: 120 }}>
                            <div
                              style={{
                                display: "inline-flex",
                                alignItems: "center",
                                gap: 6,
                                padding: "4px 10px",
                                borderRadius: 20,
                                background: statusInfo.bg,
                                color: statusInfo.color,
                                fontSize: 12,
                                fontWeight: 600,
                              }}
                            >
                              {statusInfo.icon}
                              {statusInfo.label}
                            </div>
                          </td>

                          {/* Result */}
                          <td style={{ ...tdStyle, textAlign: "center", width: 100 }}>
                            {job.status === "SUCCESS" && job.result_image_path ? (
                              <a
                                href={job.result_image_path}
                                target="_blank"
                                rel="noopener noreferrer"
                                style={{
                                  display: "inline-flex",
                                  alignItems: "center",
                                  gap: 4,
                                  fontSize: 12,
                                  color: "var(--accent-purple)",
                                  textDecoration: "none",
                                  fontWeight: 600,
                                }}
                              >
                                <Eye size={14} /> Xem
                              </a>
                            ) : job.status === "FAILED" ? (
                              <span
                                style={{ fontSize: 11, color: "var(--accent-red)" }}
                                title={job.error_message || ""}
                              >
                                {job.error_message?.substring(0, 30) || "Lỗi"}
                              </span>
                            ) : (
                              <span style={{ fontSize: 12, color: "var(--text-muted)" }}>-</span>
                            )}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Automation Log */}
          <div className="glass-card" style={{ padding: 0, overflow: "hidden" }}>
            <div
              style={{
                padding: "12px 16px",
                borderBottom: "1px solid var(--border-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Zap size={16} style={{ color: "var(--accent-cyan)" }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Nhật ký Automation</span>
              </div>
              {logs.length > 0 && (
                <button
                  onClick={() => setLogs([])}
                  style={{
                    background: "none",
                    border: "none",
                    color: "var(--text-muted)",
                    fontSize: 11,
                    cursor: "pointer",
                  }}
                >
                  Xóa log
                </button>
              )}
            </div>
            <div
              ref={logContainerRef}
              style={{
                maxHeight: 200,
                overflowY: "auto",
                padding: "8px 16px",
              }}
            >
              {logs.length === 0 ? (
                <div style={{ padding: 16, textAlign: "center", fontSize: 13, color: "var(--text-muted)" }}>
                  Chưa có nhật ký nào
                </div>
              ) : (
                logs.map((log) => (
                  <div
                    key={log.id}
                    style={{
                      fontSize: 12,
                      padding: "4px 0",
                      borderBottom: "1px solid rgba(255,255,255,0.03)",
                      display: "flex",
                      gap: 8,
                      alignItems: "flex-start",
                    }}
                  >
                    <span style={{ color: "var(--text-muted)", fontSize: 10, flexShrink: 0, marginTop: 2 }}>
                      {log.timestamp.toLocaleTimeString("vi-VN")}
                    </span>
                    <span
                      style={{
                        color:
                          log.level === "error"
                            ? "var(--accent-red)"
                            : log.level === "success"
                            ? "var(--accent-green)"
                            : log.level === "warning"
                            ? "var(--accent-orange)"
                            : "var(--text-secondary)",
                      }}
                    >
                      {log.message}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Add + Config + Controls */}
        <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
          {/* Add New Job */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Plus size={18} style={{ color: "var(--accent-purple)" }} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>Thêm dữ liệu mới</span>
            </div>

            {/* Image Upload */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
                Ảnh tham chiếu (tùy chọn)
              </label>
              <div
                style={{
                  border: "2px dashed var(--border-primary)",
                  borderRadius: "var(--radius-md)",
                  padding: 16,
                  textAlign: "center",
                  cursor: "pointer",
                  transition: "border-color 0.2s",
                  position: "relative",
                  overflow: "hidden",
                }}
                onClick={() =>
                  document.getElementById("ai-image-upload")?.click()
                }
                onMouseEnter={(e) =>
                  (e.currentTarget.style.borderColor = "var(--accent-purple)")
                }
                onMouseLeave={(e) =>
                  (e.currentTarget.style.borderColor = "var(--border-primary)")
                }
              >
                <input
                  id="ai-image-upload"
                  type="file"
                  accept="image/*"
                  onChange={handleImageSelect}
                  style={{ display: "none" }}
                />
                {newImagePreview ? (
                  <div style={{ position: "relative" }}>
                    <img
                      src={newImagePreview}
                      alt="preview"
                      style={{
                        maxHeight: 120,
                        borderRadius: 8,
                        objectFit: "contain",
                      }}
                    />
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setNewImageFile(null);
                        setNewImagePreview(null);
                      }}
                      style={{
                        position: "absolute",
                        top: -8,
                        right: -8,
                        background: "var(--accent-red)",
                        color: "white",
                        border: "none",
                        borderRadius: "50%",
                        width: 22,
                        height: 22,
                        display: "flex",
                        alignItems: "center",
                        justifyContent: "center",
                        cursor: "pointer",
                        fontSize: 12,
                      }}
                    >
                      ✕
                    </button>
                  </div>
                ) : (
                  <>
                    <Upload size={24} style={{ color: "var(--text-muted)", marginBottom: 4 }} />
                    <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                      Click để chọn ảnh
                    </div>
                  </>
                )}
              </div>
            </div>

            {/* Prompt Textarea */}
            <div style={{ marginBottom: 12 }}>
              <label style={{ fontSize: 12, fontWeight: 600, color: "var(--text-secondary)", marginBottom: 6, display: "block" }}>
                Prompt <span style={{ color: "var(--accent-red)" }}>*</span>
              </label>
              <textarea
                value={newPrompt}
                onChange={(e) => setNewPrompt(e.target.value)}
                placeholder="Ví dụ: Create a cinematic portrait of a woman in golden hour lighting..."
                rows={4}
                style={{
                  width: "100%",
                  background: "var(--bg-tertiary)",
                  border: "1px solid var(--border-primary)",
                  borderRadius: "var(--radius-md)",
                  padding: "10px 12px",
                  color: "var(--text-primary)",
                  fontSize: 13,
                  resize: "vertical",
                  outline: "none",
                  fontFamily: "inherit",
                  transition: "border-color 0.2s",
                }}
                onFocus={(e) =>
                  (e.target.style.borderColor = "var(--accent-purple)")
                }
                onBlur={(e) =>
                  (e.target.style.borderColor = "var(--border-primary)")
                }
              />
            </div>

            {/* Add Button */}
            <button
              className="btn-primary"
              onClick={handleAddJob}
              disabled={addingJob || !newPrompt.trim()}
              style={{
                width: "100%",
                height: 42,
                fontSize: 14,
                fontWeight: 600,
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                gap: 8,
                borderRadius: "var(--radius-md)",
                background: "linear-gradient(135deg, #8b5cf6, #6d28d9)",
                color: "white",
                border: "none",
                cursor: newPrompt.trim() && !addingJob ? "pointer" : "not-allowed",
                opacity: newPrompt.trim() && !addingJob ? 1 : 0.5,
                transition: "all 0.2s",
              }}
            >
              {addingJob ? (
                <Loader2 size={16} className="animate-spin" />
              ) : (
                <Plus size={16} />
              )}
              Thêm vào hàng đợi
            </button>
          </div>

          {/* Automation Config */}
          <div className="glass-card" style={{ padding: 20 }}>
            <button
              onClick={() => setShowSettings(!showSettings)}
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                width: "100%",
                background: "none",
                border: "none",
                cursor: "pointer",
                padding: 0,
                color: "var(--text-primary)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Settings size={18} style={{ color: "var(--accent-cyan)" }} />
                <span style={{ fontSize: 15, fontWeight: 700 }}>Cấu hình</span>
              </div>
              <ChevronDown
                size={16}
                style={{
                  color: "var(--text-muted)",
                  transform: showSettings ? "rotate(180deg)" : "none",
                  transition: "transform 0.2s",
                }}
              />
            </button>

            {showSettings && (
              <div style={{ marginTop: 16, display: "flex", flexDirection: "column", gap: 12 }}>
                {/* ChatGPT Credentials */}
                <div
                  style={{
                    background: "rgba(139, 92, 246, 0.06)",
                    borderRadius: "var(--radius-md)",
                    padding: 12,
                    border: "1px solid rgba(139, 92, 246, 0.15)",
                  }}
                >
                  <div style={{ display: "flex", alignItems: "center", gap: 6, marginBottom: 10 }}>
                    <Shield size={14} style={{ color: "var(--accent-purple)" }} />
                    <span style={{ fontSize: 12, fontWeight: 700, color: "var(--text-secondary)" }}>
                      TÀI KHOẢN CHATGPT
                    </span>
                  </div>
                  
                  {/* Login Method Radio Options */}
                  <div style={{ display: "flex", gap: 12, marginBottom: 12 }}>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", color: "var(--text-primary)" }}>
                      <input
                        type="radio"
                        name="loginMethod"
                        checked={chatgptLoginMethod === "email"}
                        onChange={() => setChatgptLoginMethod("email")}
                        style={{ cursor: "pointer" }}
                      />
                      Đăng nhập Email
                    </label>
                    <label style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, cursor: "pointer", color: "var(--text-primary)" }}>
                      <input
                        type="radio"
                        name="loginMethod"
                        checked={chatgptLoginMethod === "google"}
                        onChange={() => setChatgptLoginMethod("google")}
                        style={{ cursor: "pointer" }}
                      />
                      Đăng nhập Google
                    </label>
                  </div>

                  {chatgptLoginMethod === "email" ? (
                    <>
                      <input
                        type="email"
                        placeholder="Email ChatGPT"
                        value={chatgptEmail}
                        onChange={(e) => setChatgptEmail(e.target.value)}
                        style={inputStyle}
                      />
                      <div style={{ position: "relative", marginTop: 8 }}>
                        <input
                          type={showPassword ? "text" : "password"}
                          placeholder="Password ChatGPT"
                          value={chatgptPassword}
                          onChange={(e) => setChatgptPassword(e.target.value)}
                          style={inputStyle}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword(!showPassword)}
                          style={{
                            position: "absolute",
                            right: 10,
                            top: "50%",
                            transform: "translateY(-50%)",
                            background: "none",
                            border: "none",
                            color: "var(--text-muted)",
                            cursor: "pointer",
                            fontSize: 11,
                          }}
                        >
                          {showPassword ? "Ẩn" : "Hiện"}
                        </button>
                      </div>
                    </>
                  ) : (
                    <div style={{ fontSize: 11, color: "var(--text-muted)", fontStyle: "italic", lineHeight: "1.4" }}>
                      * Trình duyệt sẽ mở ở chế độ có giao diện. Bạn cần tự click đăng nhập Google và hoàn tất xác thực (2FA nếu có).
                    </div>
                  )}
                </div>

                {/* Delay Config */}
                <ConfigSelect
                  label="Delay giữa các job"
                  icon={<Timer size={14} />}
                  value={config.delayBetweenJobs}
                  options={[
                    { value: 1, label: "1 phút" },
                    { value: 5, label: "5 phút" },
                    { value: 10, label: "10 phút" },
                    { value: 15, label: "15 phút" },
                    { value: 30, label: "30 phút" },
                  ]}
                  onChange={(v) =>
                    setConfig((c) => ({ ...c, delayBetweenJobs: v }))
                  }
                />

                <ConfigSelect
                  label="Delay sau khi gửi"
                  icon={<Clock size={14} />}
                  value={config.delayAfterSend}
                  options={[
                    { value: 30, label: "30 giây" },
                    { value: 60, label: "60 giây" },
                    { value: 120, label: "120 giây" },
                  ]}
                  onChange={(v) =>
                    setConfig((c) => ({ ...c, delayAfterSend: v }))
                  }
                />

                <ConfigSelect
                  label="Số lần retry"
                  icon={<RotateCcw size={14} />}
                  value={config.maxRetries}
                  options={[
                    { value: 1, label: "1 lần" },
                    { value: 2, label: "2 lần" },
                    { value: 3, label: "3 lần" },
                    { value: 5, label: "5 lần" },
                  ]}
                  onChange={(v) =>
                    setConfig((c) => ({ ...c, maxRetries: v }))
                  }
                />

                <ConfigSelect
                  label="Nghỉ sau N jobs"
                  icon={<AlertCircle size={14} />}
                  value={config.restAfterNJobs}
                  options={[
                    { value: 3, label: "3 jobs" },
                    { value: 5, label: "5 jobs" },
                    { value: 10, label: "10 jobs" },
                  ]}
                  onChange={(v) =>
                    setConfig((c) => ({ ...c, restAfterNJobs: v }))
                  }
                />

                <ConfigSelect
                  label="Thời gian nghỉ"
                  icon={<Timer size={14} />}
                  value={config.restDurationMinutes}
                  options={[
                    { value: 15, label: "15 phút" },
                    { value: 30, label: "30 phút" },
                    { value: 60, label: "1 giờ" },
                  ]}
                  onChange={(v) =>
                    setConfig((c) => ({ ...c, restDurationMinutes: v }))
                  }
                />

                <button
                  onClick={saveSettings}
                  disabled={savingSettings}
                  style={{
                    width: "100%",
                    padding: "8px",
                    background: "var(--bg-tertiary)",
                    border: "1px solid var(--border-primary)",
                    borderRadius: "var(--radius-md)",
                    color: "var(--text-primary)",
                    fontSize: 13,
                    fontWeight: 600,
                    cursor: "pointer",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 6,
                    transition: "all 0.2s",
                  }}
                >
                  {savingSettings ? (
                    <Loader2 size={14} className="animate-spin" />
                  ) : (
                    <CheckCircle size={14} style={{ color: "var(--accent-green)" }} />
                  )}
                  Lưu cài đặt
                </button>
              </div>
            )}
          </div>

          {/* Automation Controls */}
          <div className="glass-card" style={{ padding: 20 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 16 }}>
              <Zap size={18} style={{ color: "var(--accent-orange)" }} />
              <span style={{ fontSize: 15, fontWeight: 700 }}>Điều khiển</span>
            </div>

            {/* Progress */}
            {isRunning && (
              <div style={{ marginBottom: 12 }}>
                <div
                  style={{
                    height: 4,
                    background: "var(--bg-tertiary)",
                    borderRadius: 2,
                    overflow: "hidden",
                  }}
                >
                  <div
                    style={{
                      height: "100%",
                      background: "linear-gradient(90deg, #8b5cf6, #ec4899)",
                      width: `${stats.total > 0 ? (stats.success / stats.total) * 100 : 0}%`,
                      transition: "width 0.5s",
                      borderRadius: 2,
                    }}
                  />
                </div>
                <div
                  style={{
                    fontSize: 11,
                    color: "var(--text-muted)",
                    marginTop: 4,
                    textAlign: "center",
                  }}
                >
                  {stats.success} / {stats.total} hoàn thành
                  {isPaused && " (Tạm dừng)"}
                </div>
              </div>
            )}

            {/* Buttons */}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              {!isRunning ? (
                <button
                  onClick={startAutomation}
                  disabled={selectedIds.size === 0}
                  style={{
                    width: "100%",
                    height: 44,
                    background:
                      selectedIds.size > 0
                        ? "linear-gradient(135deg, #10b981, #059669)"
                        : "var(--bg-tertiary)",
                    border: "none",
                    borderRadius: "var(--radius-md)",
                    color: selectedIds.size > 0 ? "white" : "var(--text-muted)",
                    fontSize: 14,
                    fontWeight: 700,
                    cursor: selectedIds.size > 0 ? "pointer" : "not-allowed",
                    display: "flex",
                    alignItems: "center",
                    justifyContent: "center",
                    gap: 8,
                    transition: "all 0.2s",
                    boxShadow:
                      selectedIds.size > 0
                        ? "0 4px 12px rgba(16, 185, 129, 0.3)"
                        : "none",
                  }}
                >
                  <Play size={18} />
                  Start Automation
                  {selectedIds.size > 0 && ` (${selectedIds.size} jobs)`}
                </button>
              ) : (
                <>
                  <button
                    onClick={pauseAutomation}
                    style={{
                      width: "100%",
                      height: 40,
                      background: isPaused
                        ? "linear-gradient(135deg, #10b981, #059669)"
                        : "linear-gradient(135deg, #f59e0b, #d97706)",
                      border: "none",
                      borderRadius: "var(--radius-md)",
                      color: "white",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    {isPaused ? (
                      <>
                        <Play size={16} /> Tiếp tục
                      </>
                    ) : (
                      <>
                        <Pause size={16} /> Tạm dừng
                      </>
                    )}
                  </button>

                  <button
                    onClick={stopAutomation}
                    style={{
                      width: "100%",
                      height: 40,
                      background: "linear-gradient(135deg, #ef4444, #dc2626)",
                      border: "none",
                      borderRadius: "var(--radius-md)",
                      color: "white",
                      fontSize: 13,
                      fontWeight: 600,
                      cursor: "pointer",
                      display: "flex",
                      alignItems: "center",
                      justifyContent: "center",
                      gap: 8,
                    }}
                  >
                    <Square size={16} /> Dừng hoàn toàn
                  </button>
                </>
              )}
            </div>
          </div>

          {/* Link to Results page */}
          {stats.success > 0 && (
            <a
              href="/ai-image/results"
              className="glass-card glass-card-hover"
              style={{
                padding: "14px 20px",
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                textDecoration: "none",
                color: "var(--text-primary)",
              }}
            >
              <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                <Eye size={18} style={{ color: "var(--accent-green)" }} />
                <span style={{ fontSize: 14, fontWeight: 600 }}>Xem kết quả</span>
              </div>
              <span style={{ fontSize: 12, color: "var(--accent-green)", fontWeight: 700 }}>
                {stats.success} ảnh →
              </span>
            </a>
          )}
        </div>
      </div>
    </div>
  );
};

// ============================
// Sub Components
// ============================
const ConfigSelect = ({
  label,
  icon,
  value,
  options,
  onChange,
}: {
  label: string;
  icon: React.ReactNode;
  value: number;
  options: { value: number; label: string }[];
  onChange: (value: number) => void;
}) => (
  <div
    style={{
      display: "flex",
      alignItems: "center",
      justifyContent: "space-between",
      gap: 8,
    }}
  >
    <div style={{ display: "flex", alignItems: "center", gap: 6, fontSize: 12, color: "var(--text-secondary)" }}>
      {icon} {label}
    </div>
    <select
      value={value}
      onChange={(e) => onChange(Number(e.target.value))}
      style={{
        background: "var(--bg-tertiary)",
        border: "1px solid var(--border-primary)",
        borderRadius: "var(--radius-sm)",
        padding: "4px 8px",
        color: "var(--text-primary)",
        fontSize: 12,
        outline: "none",
        cursor: "pointer",
      }}
    >
      {options.map((opt) => (
        <option key={opt.value} value={opt.value}>
          {opt.label}
        </option>
      ))}
    </select>
  </div>
);

// ============================
// Styles
// ============================
const thStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 11,
  fontWeight: 700,
  color: "var(--text-muted)",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  textAlign: "center",
};

const tdStyle: React.CSSProperties = {
  padding: "10px 12px",
  fontSize: 13,
};

const inputStyle: React.CSSProperties = {
  width: "100%",
  background: "var(--bg-tertiary)",
  border: "1px solid var(--border-primary)",
  borderRadius: "var(--radius-sm)",
  padding: "8px 10px",
  color: "var(--text-primary)",
  fontSize: 13,
  outline: "none",
};

export default AIImagePage;
