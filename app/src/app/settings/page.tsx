"use client";

import { useState } from "react";
import { db } from "@/lib/db";
import {
  Settings as SettingsIcon,
  Download,
  Upload,
  Trash2,
  Database,
  Palette,
  Info,
  AlertTriangle,
  Check,
  Sparkles,
} from "lucide-react";

const SettingsPage = () => {
  const [clearing, setClearing] = useState(false);
  const [exported, setExported] = useState(false);

  const exportData = async () => {
    const [prompts, images, workflows, tags, comments] = await Promise.all([
      db.prompts.toArray(),
      db.images.toArray(),
      db.workflows.toArray(),
      db.tags.toArray(),
      db.comments.toArray(),
    ]);

    // Loại bỏ blob data từ images khi export
    const cleanImages = images.map(({ imageData, thumbnailData, ...rest }) => rest);

    const data = {
      exportDate: new Date().toISOString(),
      version: "1.0",
      prompts,
      images: cleanImages,
      workflows,
      tags,
      comments,
    };

    const blob = new Blob([JSON.stringify(data, null, 2)], {
      type: "application/json",
    });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `promptvault-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const clearAllData = async () => {
    if (
      confirm(
        "⚠️ Bạn có chắc muốn XÓA TOÀN BỘ dữ liệu? Hành động này không thể hoàn tác!",
      )
    ) {
      setClearing(true);
      await Promise.all([
        db.prompts.clear(),
        db.images.clear(),
        db.workflows.clear(),
        db.tags.clear(),
        db.comments.clear(),
      ]);
      setClearing(false);
      alert("Đã xóa toàn bộ dữ liệu.");
    }
  };

  return (
    <div className="animate-fadeIn" style={{ maxWidth: 800, margin: "0 auto" }}>
      <div style={{ marginBottom: 24 }}>
        <h1 style={{ fontSize: 24, fontWeight: 700, marginBottom: 4 }}>
          <span className="gradient-text">Cài đặt</span>
        </h1>
        <p style={{ fontSize: 14, color: "var(--text-secondary)" }}>
          Quản lý dữ liệu và tùy chỉnh ứng dụng.
        </p>
      </div>

      <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
        {/* App Info */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12, marginBottom: 16 }}>
            <div
              style={{
                width: 40,
                height: 40,
                borderRadius: "var(--radius-md)",
                background: "var(--gradient-primary)",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
              }}
            >
              <Sparkles size={20} color="white" />
            </div>
            <div>
              <h3 style={{ fontSize: 16, fontWeight: 700 }}>PromptVault</h3>
              <div style={{ fontSize: 13, color: "var(--text-secondary)" }}>
                Phiên bản 1.0.0 • AI Prompt Asset Management
              </div>
            </div>
          </div>
          <div
            style={{
              fontSize: 13,
              color: "var(--text-secondary)",
              lineHeight: 1.6,
              background: "var(--bg-tertiary)",
              padding: 12,
              borderRadius: "var(--radius-sm)",
            }}
          >
            Nền tảng quản lý ảnh AI, prompt và workflow. Dữ liệu được lưu trữ
            hoàn toàn trên trình duyệt (IndexedDB), không cần server.
          </div>
        </div>

        {/* Data Management */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
            <Database size={20} style={{ color: "var(--accent-purple)" }} />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Quản lý dữ liệu</h3>
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {/* Export */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                background: "var(--bg-tertiary)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-primary)",
              }}
            >
              <div>
                <div style={{ fontSize: 14, fontWeight: 500, marginBottom: 2 }}>
                  Xuất dữ liệu (Backup)
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Export toàn bộ prompt, workflow, tags ra file JSON
                </div>
              </div>
              <button className="btn-secondary" onClick={exportData}>
                {exported ? (
                  <>
                    <Check size={14} style={{ color: "var(--accent-green)" }} />
                    Đã xuất
                  </>
                ) : (
                  <>
                    <Download size={14} />
                    Xuất JSON
                  </>
                )}
              </button>
            </div>

            {/* Clear */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                justifyContent: "space-between",
                padding: "14px 16px",
                background: "var(--bg-tertiary)",
                borderRadius: "var(--radius-md)",
                border: "1px solid rgba(239,68,68,0.2)",
              }}
            >
              <div>
                <div
                  style={{
                    fontSize: 14,
                    fontWeight: 500,
                    marginBottom: 2,
                    color: "var(--accent-red)",
                  }}
                >
                  Xóa toàn bộ dữ liệu
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  ⚠️ Không thể hoàn tác. Hãy backup trước!
                </div>
              </div>
              <button
                className="btn-secondary"
                onClick={clearAllData}
                disabled={clearing}
                style={{
                  borderColor: "rgba(239,68,68,0.3)",
                  color: "var(--accent-red)",
                }}
              >
                <Trash2 size={14} />
                {clearing ? "Đang xóa..." : "Xóa tất cả"}
              </button>
            </div>
          </div>
        </div>

        {/* Keyboard Shortcuts */}
        <div className="glass-card" style={{ padding: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 16 }}>
            <Info size={20} style={{ color: "var(--accent-cyan)" }} />
            <h3 style={{ fontSize: 16, fontWeight: 600 }}>Phím tắt</h3>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
            {[
              { key: "Esc", action: "Đóng popup / Lightbox" },
              { key: "← →", action: "Chuyển ảnh trong Lightbox" },
            ].map((shortcut) => (
              <div
                key={shortcut.key}
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  padding: "8px 12px",
                  background: "var(--bg-tertiary)",
                  borderRadius: "var(--radius-sm)",
                  fontSize: 13,
                }}
              >
                <span style={{ color: "var(--text-secondary)" }}>
                  {shortcut.action}
                </span>
                <kbd
                  style={{
                    background: "var(--bg-card)",
                    padding: "2px 8px",
                    borderRadius: 4,
                    fontSize: 12,
                    fontFamily: "monospace",
                    border: "1px solid var(--border-primary)",
                  }}
                >
                  {shortcut.key}
                </kbd>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

export default SettingsPage;
