"use client";

import { useAppStore } from "@/lib/store";
import { useDriveSyncStore } from "@/lib/driveSyncStore";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { CheckCircle, AlertCircle, X, ArrowRight } from "lucide-react";
import Sidebar from "./Sidebar";
import Header from "./Header";

const AppShell = ({ children }: { children: React.ReactNode }) => {
  const { sidebarOpen } = useAppStore();
  const router = useRouter();
  const {
    autoSyncEnabled,
    handleDriveSync,
    notification,
    setNotification,
  } = useDriveSyncStore();

  // Khởi động chạy đồng bộ Drive định kỳ ở background
  useEffect(() => {
    let timer: NodeJS.Timeout | null = null;
    if (autoSyncEnabled) {
      // Quét ngay lần đầu tiên
      handleDriveSync(true);

      timer = setInterval(() => {
        handleDriveSync(true);
      }, 30000);
    }
    return () => {
      if (timer) clearInterval(timer);
    };
  }, [autoSyncEnabled, handleDriveSync]);

  // Tự động ẩn Toast thông báo sau 8 giây
  useEffect(() => {
    if (notification?.show) {
      const timer = setTimeout(() => {
        setNotification(null);
      }, 8000);
      return () => clearTimeout(timer);
    }
  }, [notification, setNotification]);

  // Chặn hiển thị Dev Overlay đối với các lỗi Failed to fetch và RSC payload khi compile trễ
  useEffect(() => {
    if (typeof window !== "undefined") {
      const handleError = (event: ErrorEvent) => {
        const msg = event.message || "";
        if (msg.includes("Failed to fetch") || msg.includes("RSC") || msg.includes("fetchServerResponse")) {
          event.stopImmediatePropagation();
        }
      };
      const handleRejection = (event: PromiseRejectionEvent) => {
        const msg = event.reason?.message || "";
        if (msg.includes("Failed to fetch") || msg.includes("RSC") || msg.includes("fetchServerResponse")) {
          event.stopImmediatePropagation();
        }
      };
      window.addEventListener("error", handleError);
      window.addEventListener("unhandledrejection", handleRejection);
      return () => {
        window.removeEventListener("error", handleError);
        window.removeEventListener("unhandledrejection", handleRejection);
      };
    }
  }, []);

  return (
    <div style={{ display: "flex", minHeight: "100vh", position: "relative" }}>
      <Sidebar />
      <div
        className={`main-content ${!sidebarOpen ? "main-content-expanded" : ""}`}
        style={{
          flex: 1,
          display: "flex",
          flexDirection: "column",
          transition: "margin-left var(--transition-base)",
        }}
      >
        <Header />
        <main
          style={{
            flex: 1,
            padding: "24px",
            overflowY: "auto",
          }}
        >
          {children}
        </main>
      </div>

      {/* Floating Toast Notification ở góc dưới bên phải */}
      {notification?.show && (
        <div
          onClick={() => {
            router.push("/downloader");
            setNotification(null);
          }}
          style={{
            position: "fixed",
            bottom: 24,
            right: 24,
            zIndex: 9999,
            maxWidth: 360,
            width: "calc(100% - 48px)",
            background: "rgba(20, 18, 33, 0.95)",
            backdropFilter: "blur(20px)",
            border: notification.type === "success" ? "1px solid rgba(16, 185, 129, 0.25)" : "1px solid rgba(239, 68, 68, 0.25)",
            borderRadius: "var(--radius-lg)",
            padding: "16px",
            boxShadow: "0 10px 40px rgba(0, 0, 0, 0.6), 0 0 20px rgba(139, 92, 246, 0.12)",
            cursor: "pointer",
            display: "flex",
            flexDirection: "column",
            gap: 8,
            animation: "slideInRight 0.3s cubic-bezier(0.34, 1.56, 0.64, 1) forwards",
          }}
          className="glass-card-hover"
        >
          {/* Header */}
          <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", gap: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <div
                style={{
                  width: 24,
                  height: 24,
                  borderRadius: "50%",
                  background: notification.type === "success" ? "rgba(16, 185, 129, 0.15)" : "rgba(239, 68, 68, 0.15)",
                  display: "flex",
                  alignItems: "center",
                  justifyContent: "center",
                }}
              >
                {notification.type === "success" ? (
                  <CheckCircle size={14} style={{ color: "var(--accent-green)" }} />
                ) : (
                  <AlertCircle size={14} style={{ color: "var(--accent-red)" }} />
                )}
              </div>
              <span style={{ fontSize: 13, fontWeight: 700, color: "var(--text-primary)" }}>
                {notification.message}
              </span>
            </div>
            <button
              onClick={(e) => {
                e.stopPropagation();
                setNotification(null);
              }}
              style={{
                background: "none",
                border: "none",
                color: "var(--text-muted)",
                cursor: "pointer",
                padding: 0,
                display: "flex",
                alignItems: "center",
              }}
            >
              <X size={15} />
            </button>
          </div>

          {/* Stats details */}
          {notification.type === "success" && (
            <div
              style={{
                fontSize: 11.5,
                color: "var(--text-secondary)",
                display: "grid",
                gridTemplateColumns: "repeat(2, 1fr)",
                gap: "6px 12px",
                background: "rgba(0, 0, 0, 0.25)",
                padding: "8px 12px",
                borderRadius: "var(--radius-sm)",
              }}
            >
              <div>Tổng số link: <strong style={{ color: "var(--text-primary)" }}>{notification.totalCount}</strong></div>
              <div>Thành công: <strong style={{ color: "var(--accent-green)" }}>{notification.successCount}</strong></div>
              {(notification.downloadedVideosCount !== undefined || notification.downloadedImagesCount !== undefined) && (
                <div style={{ gridColumn: "span 2", fontSize: 10.5, color: "rgba(255,255,255,0.4)", borderTop: "1px dashed rgba(255,255,255,0.08)", borderBottom: "1px dashed rgba(255,255,255,0.08)", padding: "4px 0", margin: "2px 0" }}>
                  Tải về: <span style={{ color: "var(--accent-cyan)" }}>{notification.downloadedVideosCount || 0} video</span> • <span style={{ color: "var(--accent-pink)" }}>{notification.downloadedImagesCount || 0} ảnh</span>
                </div>
              )}
              <div>Lỗi tải: <strong style={{ color: "var(--accent-red)" }}>{notification.failedCount}</strong></div>
              <div>Trùng lặp: <strong style={{ color: "var(--text-muted)" }}>{notification.duplicateCount}</strong></div>
            </div>
          )}

          {/* Footer action */}
          <div style={{ display: "flex", alignItems: "center", gap: 4, alignSelf: "flex-end", fontSize: 11, fontWeight: 600, color: "var(--accent-purple)" }}>
            <span>Xem chi tiết nhật ký</span>
            <ArrowRight size={12} />
          </div>
        </div>
      )}
    </div>
  );
};

export default AppShell;
