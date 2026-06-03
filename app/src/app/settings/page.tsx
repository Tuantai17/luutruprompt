"use client";

import { useState, useEffect } from "react";
import { useTheme } from "next-themes";
import { db } from "@/lib/db";
import { supabase } from "@/lib/supabaseClient";
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
  RefreshCw,
} from "lucide-react";

const SettingsPage = () => {
  const { theme, setTheme } = useTheme();
  const [mounted, setMounted] = useState(false);
  const [clearing, setClearing] = useState(false);
  const [exported, setExported] = useState(false);
  const [importing, setImporting] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const blobToBase64 = (blob: Blob): Promise<string> => {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onloadend = () => resolve(reader.result as string);
      reader.onerror = reject;
      reader.readAsDataURL(blob);
    });
  };

  const exportData = async () => {
    const [prompts, images, workflows, tags, comments] = await Promise.all([
      db.prompts.toArray(),
      db.images.toArray(),
      db.workflows.toArray(),
      db.tags.toArray(),
      db.comments.toArray(),
    ]);

    // Chuyển đổi blob data của images sang base64 nếu có để sao lưu đầy đủ
    const serializedImages = await Promise.all(
      images.map(async (img) => {
        let serializedImageData = img.imageData;
        let serializedThumbnailData = img.thumbnailData;

        if (img.imageData instanceof Blob) {
          serializedImageData = await blobToBase64(img.imageData);
        }
        if (img.thumbnailData instanceof Blob) {
          serializedThumbnailData = await blobToBase64(img.thumbnailData);
        }

        return {
          ...img,
          imageData: serializedImageData,
          thumbnailData: serializedThumbnailData,
        };
      })
    );

    const data = {
      exportDate: new Date().toISOString(),
      version: "1.1",
      prompts,
      images: serializedImages,
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
    a.download = `promptvault-backup-full-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
    setExported(true);
    setTimeout(() => setExported(false), 3000);
  };

  const handleImportData = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!confirm("⚠️ Bạn có chắc chắn muốn nhập dữ liệu từ file backup JSON này? Dữ liệu trùng ID sẽ bị ghi đè.")) {
      e.target.value = "";
      return;
    }

    setImporting(true);
    const reader = new FileReader();
    reader.onload = async (event) => {
      try {
        const text = event.target?.result as string;
        const data = JSON.parse(text);

        if (!data || typeof data !== "object") {
          throw new Error("File backup JSON không hợp lệ.");
        }

        const { data: { user } } = await supabase.auth.getUser();
        const userId = user?.id;
        if (!userId) {
          throw new Error("Chưa đăng nhập. Vui lòng đăng nhập để phục hồi dữ liệu.");
        }

        // 1. Phục hồi prompts
        if (data.prompts && Array.isArray(data.prompts)) {
          const formattedPrompts = data.prompts.map((p: any) => ({
            id: p.id,
            title: p.title || "Untitled",
            content: p.content || "",
            negativePrompt: p.negativePrompt || "",
            type: p.type || "image",
            model: p.model || "",
            lora: p.lora || "",
            seed: p.seed || "",
            sampler: p.sampler || "",
            cfgScale: Number(p.cfgScale) || 0,
            steps: Number(p.steps) || 0,
            creator: p.creator || "",
            tags: p.tags || [],
            notes: p.notes || "",
            isFavorite: !!p.isFavorite,
            createdAt: p.createdAt ? new Date(p.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: p.updatedAt ? new Date(p.updatedAt).toISOString() : new Date().toISOString(),
            user_id: userId,
          }));
          const { error } = await supabase.from("prompts").upsert(formattedPrompts);
          if (error) throw error;
        }

        // 2. Phục hồi images
        if (data.images && Array.isArray(data.images)) {
          const formattedImages = data.images.map((img: any) => ({
            id: img.id,
            title: img.title || "Untitled",
            imageUrl: img.imageData || img.imageUrl || "",
            thumbnailUrl: img.thumbnailData || img.thumbnailUrl || img.imageData || img.imageUrl || "",
            promptId: img.promptId || null,
            prompt: img.prompt || "",
            negativePrompt: img.negativePrompt || "",
            model: img.model || "",
            lora: img.lora || "",
            seed: img.seed || "",
            sampler: img.sampler || "",
            cfgScale: Number(img.cfgScale) || 0,
            steps: Number(img.steps) || 0,
            creator: img.creator || "",
            note: img.note || "",
            width: Number(img.width) || 0,
            height: Number(img.height) || 0,
            fileSize: Number(img.fileSize) || 0,
            format: img.format || "png",
            tags: img.tags || [],
            isFavorite: !!img.isFavorite,
            createdAt: img.createdAt ? new Date(img.createdAt).toISOString() : new Date().toISOString(),
            user_id: userId,
          }));
          const { error } = await supabase.from("images").upsert(formattedImages);
          if (error) throw error;
        }

        // 3. Phục hồi workflows
        if (data.workflows && Array.isArray(data.workflows)) {
          const formattedWorkflows = data.workflows.map((w: any) => ({
            id: w.id,
            title: w.title || "Untitled",
            description: w.description || "",
            content: w.content || "",
            type: w.type || "comfyui",
            creator: w.creator || "",
            tags: w.tags || [],
            isFavorite: !!w.isFavorite,
            createdAt: w.createdAt ? new Date(w.createdAt).toISOString() : new Date().toISOString(),
            updatedAt: w.updatedAt ? new Date(w.updatedAt).toISOString() : new Date().toISOString(),
            user_id: userId,
          }));
          const { error } = await supabase.from("workflows").upsert(formattedWorkflows);
          if (error) throw error;
        }

        // 4. Phục hồi tags
        if (data.tags && Array.isArray(data.tags)) {
          const formattedTags = data.tags.map((t: any) => ({
            id: t.id,
            name: t.name,
            color: t.color || "#8b5cf6",
            user_id: userId,
          }));
          const { error } = await supabase.from("tags").upsert(formattedTags);
          if (error) throw error;
        }

        // 5. Phục hồi comments
        if (data.comments && Array.isArray(data.comments)) {
          const formattedComments = data.comments.map((c: any) => ({
            id: c.id,
            imageId: c.imageId,
            content: c.content || "",
            createdAt: c.createdAt ? new Date(c.createdAt).toISOString() : new Date().toISOString(),
            user_id: userId,
          }));
          const { error } = await supabase.from("comments").upsert(formattedComments);
          if (error) throw error;
        }

        alert("🎉 Khôi phục dữ liệu thành công!");
      } catch (err: any) {
        alert(`Lỗi khi khôi phục dữ liệu: ${err.message || err}`);
      } finally {
        setImporting(false);
        e.target.value = "";
      }
    };
    reader.onerror = () => {
      alert("Không thể đọc file backup JSON.");
      setImporting(false);
      e.target.value = "";
    };
    reader.readAsText(file);
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

            {/* Import */}
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
                  Nhập dữ liệu (Restore)
                </div>
                <div style={{ fontSize: 12, color: "var(--text-muted)" }}>
                  Nhập file backup JSON để phục hồi dữ liệu
                </div>
              </div>
              <div>
                <input
                  type="file"
                  id="import-backup-file"
                  accept=".json"
                  onChange={handleImportData}
                  style={{ display: "none" }}
                  disabled={importing}
                />
                <button
                  className="btn-secondary"
                  onClick={() => document.getElementById("import-backup-file")?.click()}
                  disabled={importing}
                  style={{ display: "flex", alignItems: "center", gap: 6 }}
                >
                  {importing ? (
                    <>
                      <RefreshCw size={14} className="animate-spin" />
                      Đang nhập...
                    </>
                  ) : (
                    <>
                      <Upload size={14} />
                      Nhập JSON
                    </>
                  )}
                </button>
              </div>
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

        {/* Tùy chỉnh giao diện */}
        {mounted && (
          <div className="glass-card" style={{ padding: 24 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 20 }}>
              <Palette size={20} style={{ color: "var(--accent-pink)" }} />
              <h3 style={{ fontSize: 16, fontWeight: 600 }}>Tùy chỉnh giao diện</h3>
            </div>

            <div
              style={{
                display: "grid",
                gridTemplateColumns: "repeat(auto-fit, minmax(200px, 1fr))",
                gap: 12,
              }}
            >
              {[
                { value: "light", label: "☀️ Giao diện sáng", desc: "Tối ưu khi làm việc ngoài trời hoặc phòng sáng" },
                { value: "dark", label: "🌙 Giao diện tối", desc: "Dịu mắt hơn, tối ưu khi làm việc ban đêm" },
                { value: "system", label: "💻 Theo hệ thống", desc: "Tự động thay đổi theo giao diện thiết bị" },
              ].map((tOpt) => {
                const isActive = theme === tOpt.value;
                return (
                  <button
                    key={tOpt.value}
                    onClick={() => setTheme(tOpt.value)}
                    className="glass-card glass-card-hover"
                    style={{
                      padding: "16px",
                      textAlign: "left",
                      background: isActive ? "rgba(139, 92, 246, 0.08)" : "var(--bg-tertiary)",
                      border: isActive ? "1.5px solid var(--accent-purple)" : "1px solid var(--border-primary)",
                      borderRadius: "var(--radius-md)",
                      cursor: "pointer",
                      display: "flex",
                      flexDirection: "column",
                      gap: 6,
                      width: "100%",
                    }}
                  >
                    <span style={{ fontSize: 14, fontWeight: 700, color: isActive ? "var(--accent-purple)" : "var(--text-primary)" }}>
                      {tOpt.label}
                    </span>
                    <span style={{ fontSize: 11.5, color: "var(--text-muted)", lineHeight: 1.4 }}>
                      {tOpt.desc}
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        )}

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
